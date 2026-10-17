import { inMemoryStore } from '@/lib/supabase/db-service';
import { sendTelegramMessage } from '@/lib/telegram/bot-api';
import { parseNaturalLanguageTransaction } from '@/lib/telegram/parser';
import { processReceiptPhoto } from '@/lib/telegram/receipt-ocr';
import { processVoiceNote } from '@/lib/telegram/voice-parser';
import { handleBotCommand } from '@/lib/telegram/commands';
import { 
  formatExpenseReply, 
  formatIncomeReply, 
  formatLimitExceededReply 
} from '@/lib/telegram/replies';
import { checkTransactionLimit } from '@/lib/plans/limits';
import { evaluateFinancialAdvisorTriggers } from '@/lib/advisor/financial-advisor';
import { getCurrentMonthKeyWIB, getWIBDate } from '@/lib/utils/timezone';
import { Transaction, ReceiptItem, Wallet } from '@/types';

/**
 * Process a single incoming Telegram update (works for both Webhook and Polling)
 */
export async function processTelegramUpdate(payload: any, overrideBotToken?: string): Promise<{ ok: boolean; [key: string]: any }> {
  try {
    if (!payload) {
      return { ok: false, error: 'Empty payload' };
    }

    const updateId = payload.update_id;
    if (updateId) {
      if (inMemoryStore.telegramIdempotency.has(updateId)) {
        return { ok: true, skipped: true };
      }
      inMemoryStore.telegramIdempotency.add(updateId);
    }

    const message = payload.message || payload.edited_message;
    if (!message) {
      return { ok: true, ignored: true };
    }

    const telegramUserId = message.from?.id;
    const chatId = message.chat?.id;

    if (!telegramUserId || !chatId) {
      return { ok: true };
    }

    // 1. Identify User: Sync with the currently active web session account
    const activeUserId = inMemoryStore.getActiveTelegramUser();
    let matchedUserId: string = activeUserId || 'user-demo-tatadana';

    // Verify profile exists
    let profile = inMemoryStore.profiles.get(matchedUserId);
    if (!profile) {
      matchedUserId = 'user-demo-tatadana';
      profile = inMemoryStore.profiles.get(matchedUserId);
    }
    if (!profile) {
      return { ok: false, error: 'Profile not found' };
    }

    // Auto-bind Telegram user and chat to active user session
    let existingLink = inMemoryStore.telegramLinks.get(matchedUserId);
    if (existingLink) {
      existingLink.telegram_user_id = telegramUserId;
      existingLink.telegram_chat_id = chatId;
      if (existingLink.bot_token_raw && !existingLink.bot_token_raw.includes('mock')) {
        existingLink.status_koneksi = 'connected';
      }
    } else {
      inMemoryStore.telegramLinks.set(matchedUserId, {
        id: `tg-link-${Date.now()}`,
        user_id: matchedUserId,
        telegram_user_id: telegramUserId,
        telegram_chat_id: chatId,
        bot_token_encrypted: null,
        bot_token_raw: '',
        bot_username: null,
        status_koneksi: 'disconnected',
        connection_mode: 'polling',
        webhook_url: null,
        linked_at: new Date().toISOString()
      });
    }

    const userLink = inMemoryStore.telegramLinks.get(matchedUserId);
    const rawBotToken = overrideBotToken || userLink?.bot_token_raw || process.env.TELEGRAM_BOT_TOKEN || '';
    const botToken = rawBotToken.includes('mock') ? '' : rawBotToken;

    // 2. Fetch User Financial Context
    const userWallets = Array.from(inMemoryStore.wallets.values()).filter(w => w.user_id === matchedUserId);
    const defaultWallet = userWallets.find(w => w.is_default) || userWallets[0] || {
      id: `wallet-${Date.now()}`,
      name: 'BCA Utama',
      balance: 0,
      is_default: true,
      user_id: matchedUserId,
      type: 'bank',
      color: '#00529C',
      icon: 'landmark',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const userBudgets = Array.from(inMemoryStore.budgets.values()).filter(b => b.user_id === matchedUserId);
    const allUserTx = Array.from(inMemoryStore.transactions.values()).filter(t => t.user_id === matchedUserId);

    // 3. Handle /start and Slash Commands
    const textContent = (message.text || message.caption || '').trim();
    if (textContent.startsWith('/')) {
      if (textContent.toLowerCase().startsWith('/start')) {
        const welcomeText = `👋 Halo ${message.from?.first_name || profile.full_name}!

Selamat datang di *TataDana Bot* — Catat keuangan semudah chatting! 🚀
Akun Telegram kamu sekarang sudah terhubung dengan dompet TataDana.

💡 *Cara Mencatat Transaksi:*
• Ketik langsung: "beli bakso 15rb" atau "kopi 25k"
• Ketik pemasukan: "gajian 5jt"
• Kirim Foto Struk belanja untuk scan struk otomatis (Pro)
• Kirim Voice Note untuk mencatat lewat suara

📋 *Perintah Cepat:*
/saldo — Cek saldo semua dompet
/budget — Pantau progres batas anggaran bulanan
/hari ini — Rekap pengeluaran & pemasukan hari ini
/bulan ini — Rekap bulanan & Top kategori belanja
/bantuan — Panduan lengkap penggunaan`;

        await sendTelegramMessage(botToken, chatId, welcomeText);
        return { ok: true, handled: 'start' };
      }

      const reply = await handleBotCommand(textContent, profile, userWallets, allUserTx, userBudgets);
      await sendTelegramMessage(botToken, chatId, reply);
      return { ok: true, handled: 'command' };
    }

    // 4. Check Plan Monthly Transaction Limit
    const limitCheck = await checkTransactionLimit(matchedUserId);
    if (!limitCheck.allowed) {
      const limitReply = formatLimitExceededReply();
      await sendTelegramMessage(botToken, chatId, limitReply);
      return { ok: true, handled: 'limit_exceeded' };
    }

    // 5. Handle Photos, Voice Notes, or Natural Language Text
    let parsedResult: any = null;
    let source: any = 'telegram_text';
    let receiptItems: ReceiptItem[] = [];

    // Case A: Photo Receipt
    if (message.photo && message.photo.length > 0) {
      source = 'telegram_photo';
      const largestPhoto = message.photo[message.photo.length - 1];
      const ocrResult = await processReceiptPhoto(profile, largestPhoto.file_id);
      if (!ocrResult.allowed) {
        await sendTelegramMessage(botToken, chatId, ocrResult.replyMessage || '');
        return { ok: true, handled: 'ocr_restricted' };
      }
      parsedResult = ocrResult.data;
      receiptItems = ocrResult.data?.items || [];
    }
    // Case B: Voice Note Audio
    else if (message.voice || message.audio) {
      source = 'telegram_voice';
      const voiceObj = message.voice || message.audio;
      const voiceResult = await processVoiceNote(voiceObj.file_id, voiceObj.duration || 5);
      if (!voiceResult.success) {
        await sendTelegramMessage(botToken, chatId, voiceResult.errorMessage || '');
        return { ok: true, handled: 'voice_error' };
      }
      parsedResult = voiceResult.transaction;
    }
    // Case C: Natural Language Text
    else if (textContent) {
      source = 'telegram_text';
      try {
        parsedResult = await parseNaturalLanguageTransaction(textContent);
      } catch (err: any) {
        await sendTelegramMessage(botToken, chatId, err.message || 'Format tidak dikenali. Contoh: "beli bakso 15rb" atau "gajian 5jt"');
        return { ok: true, handled: 'text_parse_error' };
      }
    } else {
      await sendTelegramMessage(
        botToken, 
        chatId, 
        'Ketik transaksimu (misal: "beli makan 25rb"), kirim foto struk, atau kirim voice note untuk mencatat keuangan!'
      );
      return { ok: true, handled: 'unknown_type' };
    }

    if (!parsedResult || !parsedResult.nominal) {
      return { ok: true };
    }

    // 6. Match Category
    const userCategories = Array.from(inMemoryStore.categories.values());
    const matchedCategory = userCategories.find(c => 
      c.name.toLowerCase().includes((parsedResult.kategori || '').toLowerCase()) ||
      (parsedResult.kategori || '').toLowerCase().includes(c.name.toLowerCase())
    ) || userCategories[0];

    // Select Target Wallet based on Payment Method in message (e.g. gopay, tunai, bca)
    const walletKey = (parsedResult.dompet || '').toLowerCase();
    let targetWallet = defaultWallet;

    if (walletKey) {
      const foundByName = userWallets.find(w => w.name.toLowerCase().includes(walletKey));
      if (foundByName) {
        targetWallet = foundByName;
      } else if (walletKey === 'tunai' || walletKey === 'cash') {
        const cashW = userWallets.find(w => w.type === 'cash' || w.name.toLowerCase().includes('tunai') || w.name.toLowerCase().includes('cash'));
        if (cashW) targetWallet = cashW;
      } else if (['gopay', 'ovo', 'dana', 'shopeepay'].includes(walletKey)) {
        const ewalletW = userWallets.find(w => w.type === 'ewallet' || w.name.toLowerCase().includes(walletKey));
        if (ewalletW) {
          targetWallet = ewalletW;
        } else {
          const newEw: Wallet = {
            id: `wallet-${Date.now()}`,
            user_id: matchedUserId,
            name: walletKey === 'gopay' ? 'GoPay' : walletKey.toUpperCase(),
            type: 'ewallet',
            balance: 0,
            is_default: false,
            color: '#00AED6',
            icon: 'smartphone',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          inMemoryStore.wallets.set(newEw.id, newEw);
          userWallets.push(newEw);
          targetWallet = newEw;
        }
      } else if (['bca', 'mandiri', 'bri', 'bni', 'jago', 'bank'].includes(walletKey)) {
        const bankW = userWallets.find(w => w.type === 'bank' || w.name.toLowerCase().includes(walletKey));
        if (bankW) targetWallet = bankW;
      }
    }

    const nominal = Number(parsedResult.nominal);
    let newBalance = Number(targetWallet.balance);
    if (parsedResult.jenis === 'pemasukan' || parsedResult.jenis === 'income') {
      newBalance += nominal;
    } else {
      newBalance -= nominal;
    }
    targetWallet.balance = newBalance;
    targetWallet.updated_at = new Date().toISOString();

    // Create Transaction Record
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let finalTxDate = getWIBDate().toISOString();
    if (parsedResult.date) {
      try {
        const dateStr = parsedResult.date.includes('T') ? parsedResult.date : `${parsedResult.date}T12:00:00+07:00`;
        finalTxDate = new Date(dateStr).toISOString();
      } catch {
        finalTxDate = getWIBDate().toISOString();
      }
    }

    const newTx: Transaction = {
      id: txId,
      user_id: matchedUserId,
      wallet_id: targetWallet.id,
      wallet_name: targetWallet.name,
      category_id: matchedCategory ? matchedCategory.id : null,
      category_name: matchedCategory ? matchedCategory.name : parsedResult.kategori,
      category_icon: matchedCategory ? matchedCategory.icon : '📁',
      type: (parsedResult.jenis === 'pemasukan' || parsedResult.jenis === 'income') ? 'income' : 'expense',
      amount: nominal,
      notes: parsedResult.catatan || textContent,
      transaction_date: finalTxDate,
      source,
      merchant_name: parsedResult.merchant,
      receipt_items: receiptItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.transactions.set(txId, newTx);

    // 7. Update Budget spent_amount
    const curMonth = getCurrentMonthKeyWIB();
    let currentBudget = userBudgets.find(b => b.category_id === matchedCategory?.id && (!b.month_year || b.month_year === curMonth));
    if (currentBudget && (parsedResult.jenis === 'pengeluaran' || parsedResult.jenis === 'expense')) {
      currentBudget.spent_amount = (currentBudget.spent_amount || 0) + nominal;
    }

    // 8. Format & Send Reply
    let replyText = '';
    if (parsedResult.jenis === 'pemasukan' || parsedResult.jenis === 'income') {
      replyText = formatIncomeReply({
        transactionDate: newTx.transaction_date,
        nominal,
        kategoriEmoji: matchedCategory?.icon || '💰',
        kategoriNama: matchedCategory?.name || 'Gaji Bulanan',
        walletNama: targetWallet.name,
        saldoAkhir: newBalance,
        transcriptVoice: parsedResult.rawTranscript
      });
    } else {
      replyText = formatExpenseReply({
        transactionDate: newTx.transaction_date,
        nominal,
        kategoriEmoji: matchedCategory?.icon || '💸',
        kategoriNama: matchedCategory?.name || 'Makanan & Minuman',
        walletNama: targetWallet.name,
        catatan: parsedResult.catatan || textContent,
        saldoAkhir: newBalance,
        budgetLimit: currentBudget?.monthly_limit || 2000000,
        budgetTerpakai: currentBudget?.spent_amount || nominal,
        transcriptVoice: parsedResult.rawTranscript
      });
    }

    await sendTelegramMessage(botToken, chatId, replyText);

    // 9. Evaluate AI Financial Advisor Trigger (fitur Pro)
    const advisorResult = await evaluateFinancialAdvisorTriggers(
      profile, 
      newTx, 
      Array.from(inMemoryStore.transactions.values()), 
      userBudgets
    );
    if (advisorResult.triggered && advisorResult.message) {
      await sendTelegramMessage(botToken, chatId, advisorResult.message);
    }

    return { ok: true, transactionId: txId, replyText };
  } catch (err: any) {
    console.error('[processTelegramUpdate error]:', err);
    return { ok: false, error: err?.message };
  }
}
