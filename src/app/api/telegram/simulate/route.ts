import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { parseNaturalLanguageTransaction } from '@/lib/telegram/parser';
import { handleBotCommand, isBotCommand } from '@/lib/telegram/commands';
import { formatExpenseReply, formatIncomeReply } from '@/lib/telegram/replies';
import { getCurrentMonthKeyWIB, getWIBDate } from '@/lib/utils/timezone';
import { evaluateFinancialAdvisorTriggers } from '@/lib/advisor/financial-advisor';
import { Transaction, Wallet } from '@/types';

/**
 * Live Telegram Simulator API
 * POST /api/telegram/simulate
 * Dynamically parses text, updates real wallet balance, updates budget, and generates live replies.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text || '';
    const effectiveUserId = body.userId || inMemoryStore.getActiveTelegramUser();

    if (!text || !text.trim()) {
      return NextResponse.json({ ok: false, message: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const trimmedText = text.trim();
    let profile = inMemoryStore.profiles.get(effectiveUserId);
    if (!profile) {
      profile = inMemoryStore.profiles.get('user-demo-tatadana');
    }
    if (!profile) {
      return NextResponse.json({ ok: false, message: 'User tidak ditemukan.' }, { status: 404 });
    }

    let userWallets = Array.from(inMemoryStore.wallets.values()).filter(w => w.user_id === profile!.id);
    let defaultWallet = userWallets.find(w => w.is_default) || userWallets[0];
    if (!defaultWallet) {
      defaultWallet = {
        id: `wallet-${Date.now()}`,
        user_id: profile.id,
        name: 'BCA Utama',
        type: 'bank',
        balance: 0,
        is_default: true,
        color: '#00529C',
        icon: 'landmark',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemoryStore.wallets.set(defaultWallet.id, defaultWallet);
      userWallets = [defaultWallet];
    }

    const userBudgets = Array.from(inMemoryStore.budgets.values()).filter(b => b.user_id === profile!.id);
    const allUserTx = Array.from(inMemoryStore.transactions.values()).filter(t => t.user_id === profile!.id);

    // 1. Handle Bot Commands & Natural Shortcuts
    const isCommand = trimmedText.startsWith('/') || isBotCommand(trimmedText);

    if (isCommand) {
      const reply = await handleBotCommand(trimmedText, profile, userWallets, allUserTx, userBudgets);
      return NextResponse.json({
        ok: true,
        reply,
        type: 'command',
        updatedBalance: defaultWallet ? defaultWallet.balance : 0,
        wallets: userWallets
      });
    }

    // 2. Parse natural language
    const parsed = await parseNaturalLanguageTransaction(trimmedText);

    // 3. Find matching category
    const userCategories = Array.from(inMemoryStore.categories.values());
    const matchedCategory = userCategories.find(c => 
      c.name.toLowerCase().includes((parsed.kategori || '').toLowerCase()) ||
      (parsed.kategori || '').toLowerCase().includes(c.name.toLowerCase())
    ) || userCategories[0];

    // 4. Select Target Wallet based on Payment Method in message (e.g. gopay, tunai, bca)
    const walletKey = (parsed.dompet || '').toLowerCase();
    let targetWallet = defaultWallet;

    if (walletKey) {
      // Find wallet whose name matches
      const foundByName = userWallets.find(w => w.name.toLowerCase().includes(walletKey));
      if (foundByName) {
        targetWallet = foundByName;
      } else if (walletKey === 'tunai' || walletKey === 'cash') {
        const cashW = userWallets.find(w => w.name.toLowerCase().includes('tunai') || w.name.toLowerCase().includes('cash') || w.type === 'cash');
        if (cashW) targetWallet = cashW;
      } else if (['gopay', 'ovo', 'dana', 'shopeepay'].includes(walletKey)) {
        const ewalletW = userWallets.find(w => w.name.toLowerCase().includes(walletKey) || (walletKey === 'ewallet' && w.type === 'ewallet'));
        if (ewalletW) {
          targetWallet = ewalletW;
        } else {
          // Auto-create ewallet if not existing yet
          const newEw: Wallet = {
            id: `wallet-${Date.now()}`,
            user_id: profile.id,
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
        const bankW = userWallets.find(w => w.name.toLowerCase().includes(walletKey) || (walletKey === 'bank' && w.type === 'bank'));
        if (bankW) targetWallet = bankW;
      }
    }

    // 5. Update Target Wallet Balance
    const nominal = Number(parsed.nominal);
    let newBalance = Number(targetWallet.balance);
    if (parsed.jenis === 'pemasukan') {
      newBalance += nominal;
    } else {
      newBalance -= nominal;
    }
    targetWallet.balance = newBalance;
    targetWallet.updated_at = new Date().toISOString();

    // 6. Create Transaction record
    // 6. Create Transaction record
    const txId = `tx-sim-${Date.now()}`;
    let finalTxDate = getWIBDate().toISOString();
    if (parsed.date) {
      try {
        const dateStr = parsed.date.includes('T') ? parsed.date : `${parsed.date}T12:00:00+07:00`;
        finalTxDate = new Date(dateStr).toISOString();
      } catch {
        finalTxDate = getWIBDate().toISOString();
      }
    }

    const newTx: Transaction = {
      id: txId,
      user_id: profile.id,
      wallet_id: targetWallet.id,
      wallet_name: targetWallet.name,
      category_id: matchedCategory ? matchedCategory.id : null,
      category_name: matchedCategory ? matchedCategory.name : parsed.kategori,
      category_icon: matchedCategory ? matchedCategory.icon : (parsed.jenis === 'pemasukan' ? '💰' : '💸'),
      type: parsed.jenis === 'pemasukan' ? 'income' : 'expense',
      amount: nominal,
      notes: parsed.catatan || trimmedText,
      transaction_date: finalTxDate,
      source: 'telegram_text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    inMemoryStore.transactions.set(txId, newTx);

    // 7. Update Budget
    const curMonth = getCurrentMonthKeyWIB();
    let currentBudget = userBudgets.find(b => b.category_id === matchedCategory?.id && b.month_year === curMonth);
    if (!currentBudget && matchedCategory) {
      currentBudget = {
        id: `budget-sim-${Date.now()}`,
        user_id: profile.id,
        category_id: matchedCategory.id,
        category_name: matchedCategory.name,
        category_icon: matchedCategory.icon,
        category_color: matchedCategory.color,
        monthly_limit: 3000000,
        spent_amount: 0,
        month_year: curMonth,
        alert_80_sent: false,
        alert_100_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemoryStore.budgets.set(currentBudget.id, currentBudget);
    }
    if (currentBudget && parsed.jenis !== 'pemasukan') {
      currentBudget.spent_amount = (currentBudget.spent_amount || 0) + nominal;
    }

    // 8. Format Telegram reply
    let replyText = '';
    if (parsed.jenis === 'pemasukan') {
      replyText = formatIncomeReply({
        transactionDate: newTx.transaction_date,
        nominal,
        kategoriEmoji: matchedCategory?.icon || '💼',
        kategoriNama: matchedCategory?.name || 'Gaji Bulanan',
        walletNama: targetWallet.name,
        saldoAkhir: newBalance
      });
    } else {
      replyText = formatExpenseReply({
        transactionDate: newTx.transaction_date,
        nominal,
        kategoriEmoji: matchedCategory?.icon || '🍜',
        kategoriNama: matchedCategory?.name || 'Makanan & Minuman',
        walletNama: targetWallet.name,
        catatan: parsed.catatan || trimmedText,
        saldoAkhir: newBalance,
        budgetLimit: currentBudget?.monthly_limit || 3000000,
        budgetTerpakai: currentBudget?.spent_amount || nominal
      });
    }

    // 8. Financial advisor check
    const advisorResult = await evaluateFinancialAdvisorTriggers(
      profile,
      newTx,
      Array.from(inMemoryStore.transactions.values()),
      Array.from(inMemoryStore.budgets.values())
    );
    if (advisorResult.triggered && advisorResult.message) {
      replyText += `\n\n${advisorResult.message}`;
    }

    return NextResponse.json({
      ok: true,
      reply: replyText,
      parsed,
      updatedBalance: newBalance,
      walletName: defaultWallet.name,
      budgets: Array.from(inMemoryStore.budgets.values()).filter(b => b.user_id === profile!.id),
      wallets: Array.from(inMemoryStore.wallets.values()).filter(w => w.user_id === profile!.id)
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || 'Gagal memproses simulasi chat' }, { status: 500 });
  }
}
