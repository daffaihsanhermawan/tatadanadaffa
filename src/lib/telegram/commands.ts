import { Profile, Wallet, Transaction, Budget } from '@/types';
import { formatRupiah, formatWIBDateShort, getCurrentMonthKeyWIB } from '@/lib/utils/timezone';
import { generateProgressBar } from '@/lib/telegram/replies';

/**
 * Check if a text is a bot shortcut or slash command
 */
export function isBotCommand(rawInput: string): boolean {
  if (!rawInput || !rawInput.trim()) return false;
  const clean = rawInput
    .replace(/^[\s\p{Emoji}\u200d\uFE0F\uFE0E]+/gu, '')
    .trim()
    .toLowerCase()
    .replace(/^\//, '')
    .trim();
  const validCommands = [
    'saldo', 'cek saldo', 'ceksaldo', 'dompet', 'lihat saldo',
    'audit', 'audit penghasilan', 'auditpenghasilan', 'analisis', 'kesehatan finansial',
    'hari ini', 'hariini', 'rekap hari ini', 'rekap hariini',
    'minggu ini', 'mingguini', 'rekap minggu ini',
    'bulan ini', 'bulanini', 'rekap bulan ini',
    'budget', 'cek budget', 'cekbudget', 'pos anggaran', 'anggaran',
    'tips', 'tips hemat', 'tipshemat', 'tips finansial', 'saran', 'hemat',
    'sheet', 'laporan', 'buka laporan', 'excel', 'pdf',
    'bantuan', 'help', 'menu', 'panduan', 'start'
  ];
  return validCommands.includes(clean);
}

/**
 * Handle Telegram Bot Commands & Natural Shortcuts
 */
export async function handleBotCommand(
  command: string,
  profile: Profile,
  wallets: Wallet[],
  transactions: Transaction[],
  budgets: Budget[]
): Promise<string> {
  let cmd = command
    .replace(/^[\s\p{Emoji}\u200d\uFE0F\uFE0E]+/gu, '')
    .toLowerCase()
    .trim();
  if (cmd.startsWith('/')) {
    cmd = cmd.substring(1).trim();
  }

  // 1. /saldo atau "Cek Saldo"
  if (cmd === 'saldo' || cmd === 'cek saldo' || cmd === 'ceksaldo' || cmd === 'dompet' || cmd === 'lihat saldo') {
    if (wallets.length === 0) {
      return `👛 Belum ada dompet yang terdaftar.\nSilakan buat dompet di dashboard TataDana: https://tatadana.com/wallet`;
    }
    const totalBalance = wallets.reduce((acc, w) => acc + Number(w.balance), 0);
    const walletLines = wallets.map(w => {
      const icon = w.type === 'ewallet' ? '📱' : w.type === 'cash' ? '💵' : '🏛️';
      return `├ ${w.is_default ? '⭐ ' : ''}${icon} ${w.name} : ${formatRupiah(w.balance)}`;
    }).join('\n');

    return `👛 Saldo Semua Dompet:
${walletLines}
└ 💰 Total Saldo : ${formatRupiah(totalBalance)}

Ketik transaksi seperti "bakso 20rb gopay" atau "kopi 25rb tunai" untuk mencatat pengeluaran langsung dari dompet terkait!`;
  }

  // 2. /audit atau "Audit Penghasilan"
  if (
    cmd === 'audit' || 
    cmd === 'audit penghasilan' || 
    cmd === 'auditpenghasilan' || 
    cmd === 'analisis' || 
    cmd === 'kesehatan finansial'
  ) {
    const curMonth = getCurrentMonthKeyWIB();
    const monthTx = transactions.filter(t => t.transaction_date.startsWith(curMonth));
    const totalIncomeMonth = monthTx.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalExpenseMonth = monthTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

    const allIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const allExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

    const effIncome = totalIncomeMonth > 0 ? totalIncomeMonth : (allIncome > 0 ? allIncome : 10000000);
    const effExpense = totalExpenseMonth > 0 ? totalExpenseMonth : allExpense;
    const netCashflow = effIncome - effExpense;
    const savingsRate = Math.round((netCashflow / effIncome) * 100);

    let scoreGrade = '🟢 SEHAT (Grade B)';
    let scoreNote = 'Arus kas surplus dengan alokasi tabungan positif.';
    if (savingsRate >= 30) {
      scoreGrade = '🌟 SANGAT SEHAT (Grade A)';
      scoreNote = 'Luar biasa! Rasio tabungan kamu di atas 30%, pondasi finansial sangat kokoh.';
    } else if (savingsRate >= 15) {
      scoreGrade = '🟢 SEHAT (Grade B)';
      scoreNote = 'Bagus! Pengeluaran terkontrol dengan rasio tabungan yang sehat.';
    } else if (savingsRate >= 0) {
      scoreGrade = '⚠️ WASPADA (Grade C)';
      scoreNote = 'Pengeluaran hampir menyamai pemasukan. Disarankan tekan pengeluaran tersier.';
    } else {
      scoreGrade = '🚨 DEFISIT / BAHAYA (Grade D)';
      scoreNote = 'Pengeluaran melebihi pemasukan bulan ini! Segera evaluasi pos biaya.';
    }

    // 50/30/20 Benchmark
    const targetKebutuhan = effIncome * 0.5;
    const targetKeinginan = effIncome * 0.3;
    const targetTabungan = effIncome * 0.2;

    return `📈 AUDIT PENGHASILAN & KESEHATAN FINANSIAL
Periode: Bulan Berjalan (${curMonth})

💰 Total Pemasukan : ${formatRupiah(effIncome)}
💸 Total Pengeluaran : ${formatRupiah(effExpense)}
⚖️ Net Cashflow : ${netCashflow >= 0 ? '+' : ''}${formatRupiah(netCashflow)}
📊 Rasio Tabungan (Savings Rate) : ${savingsRate}%

🏆 Status Kesehatan Finansial:
└ ${scoreGrade}
${scoreNote}

📐 Analisis Alokasi Metode 50/30/20:
├ 🏠 Kebutuhan Pokok (50%) : Maks ${formatRupiah(targetKebutuhan)}
├ ☕ Keinginan & Gaya Hidup (30%) : Maks ${formatRupiah(targetKeinginan)}
└ 💎 Tabungan & Investasi (20%) : Minimal ${formatRupiah(targetTabungan)}

💡 Rekomendasi AI Advisor:
${savingsRate >= 20 
  ? 'Pertahankan disiplin ini! Alokasikan surplus tabungan ke instrumen pasar uang atau dana darurat 6x pengeluaran bulanan.'
  : 'Coba pantau pos Makanan & Minuman atau Tagihan dengan fitur budget agar rasio tabungan mencapai minimal 20%!'}`;
  }

  // 3. /hari ini atau "Rekap Hari Ini"
  if (cmd === 'hari ini' || cmd === 'hariini' || cmd === 'rekap hari ini') {
    const todayStr = formatWIBDateShort();
    const todayTx = transactions.filter(t => formatWIBDateShort(t.transaction_date) === todayStr);

    const totalIncome = todayTx.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalExpense = todayTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

    if (todayTx.length === 0) {
      return `📅 Rekap Hari Ini (${todayStr}):
Belum ada transaksi tercatat hari ini.
Ketik pengeluaranmu sekarang, misal: "beli makan siang 25rb gopay"`;
    }

    const txLines = todayTx.map(t => {
      const sign = t.type === 'income' ? '🟢 +' : '🔴 -';
      return `├ ${sign} ${formatRupiah(t.amount)} (${t.wallet_name || 'Dompet'} • ${t.category_name || t.notes || 'Transaksi'})`;
    }).join('\n');

    return `📅 Rekap Transaksi Hari Ini (${todayStr}):
${txLines}
├ Pemasukan : ${formatRupiah(totalIncome)}
├ Pengeluaran : ${formatRupiah(totalExpense)}
└ Net : ${formatRupiah(totalIncome - totalExpense)}`;
  }

  // 4. /minggu ini
  if (cmd === 'minggu ini' || cmd === 'mingguini' || cmd === 'rekap minggu ini') {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const weekTx = transactions.filter(t => new Date(t.transaction_date).getTime() >= sevenDaysAgo);

    const totalIncome = weekTx.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalExpense = weekTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

    return `📊 Rekap 7 Hari Terakhir:
├ Total Transaksi : ${weekTx.length}
├ Total Pemasukan : ${formatRupiah(totalIncome)}
├ Total Pengeluaran : ${formatRupiah(totalExpense)}
└ Net Cashflow : ${formatRupiah(totalIncome - totalExpense)}

Buka dashboard untuk rincian harian: https://tatadana.com/dashboard`;
  }

  // 5. /bulan ini atau "Rekap Bulan Ini"
  if (cmd === 'bulan ini' || cmd === 'bulanini' || cmd === 'rekap bulan ini') {
    const curMonth = getCurrentMonthKeyWIB();
    const monthTx = transactions.filter(t => t.transaction_date.startsWith(curMonth));

    const totalIncome = monthTx.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

    // Group expenses by category
    const categoryTotals: Record<string, number> = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category_name || 'Lainnya';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
    });

    const catLines = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, amt]) => `├ ${cat}: ${formatRupiah(amt)}`)
      .join('\n');

    return `📅 Rekap Bulan Ini (${curMonth}):
💰 Pemasukan : ${formatRupiah(totalIncome)}
💸 Pengeluaran : ${formatRupiah(totalExpense)}
⚖️ Net Cashflow : ${formatRupiah(totalIncome - totalExpense)}

Top Pengeluaran Kategori:
${catLines || 'Belum ada pengeluaran bulan ini.'}`;
  }

  // 6. /budget atau "Cek Budget"
  if (cmd === 'budget' || cmd === 'cek budget' || cmd === 'pos anggaran') {
    if (budgets.length === 0) {
      return `🎯 Kamu belum mengatur budget bulanan.\nAtur budget sekarang di dashboard: https://tatadana.com/budget`;
    }

    const budgetLines = budgets.map(b => {
      const spent = b.spent_amount || 0;
      const pct = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0;
      const bar = generateProgressBar(pct, 8);
      return `${b.category_icon || '📁'} ${b.category_name || 'Kategori'}:
${bar} (${formatRupiah(spent)} / ${formatRupiah(b.monthly_limit)})`;
    }).join('\n\n');

    return `🎯 Status Budget Bulan Ini:\n\n${budgetLines}`;
  }

  // 7. /tips atau "Tips Finansial"
  if (cmd === 'tips' || cmd === 'tips hemat' || cmd === 'tips finansial' || cmd === 'saran') {
    const tipsList = [
      '💡 Terapkan aturan 24 jam sebelum membeli barang non-esensial untuk mencegah impulse buying.',
      '💡 Pisahkan rekening operasional (transaksi harian) dan rekening tabungan dana darurat agar tidak terpakai.',
      '💡 Catat setiap pengeluaran kecil: parkir Rp5.000 dan jajan kopi Rp25.000 terakumulasi bisa mencapai jutaan rupiah per bulan!',
      '💡 Cek langganan digital berkala (streaming, gym, aplikasi). Batalkan yang tidak terpakai dalam 30 hari terakhir.',
      '💡 Manfaatkan promo dompet digital (GoPay/ShopeePay) hanya untuk barang kebutuhan yang memang sudah direncanakan.'
    ];
    const pickedTip = tipsList[Math.floor(Math.random() * tipsList.length)];
    return `💡 Tips TataDana Financial Advisor:\n\n${pickedTip}\n\nKetik transaksi kamu sekarang untuk menjaga keuangan tetap sehat!`;
  }

  // 8. /sheet atau /laporan
  if (cmd === 'sheet' || cmd === 'laporan' || cmd === 'buka laporan') {
    return `📊 Spreadsheet & Laporan Keuangan TataDana:
Data transaksimu dapat dilihat, difilter kustom rentang tanggal, dan diekspor ke PDF/Excel kapan saja melalui link dashboard privat berikut:
👉 https://tatadana.com/laporan`;
  }

  // 9. /bantuan
  return `🤖 TataDana AI Assistant & Bot:

✨ Cara Cepat Mencatat Sesuai Dompet:
• "bakso 20rb gopay" -> Mengurangi saldo GoPay
• "kopi 25rb tunai" -> Mengurangi saldo Dompet Tunai
• "makan 35rb bca" -> Mengurangi saldo BCA Utama
• "beli bensin 50rb" -> Mengurangi dompet default

⚡ Shortcut Perintah Cepat:
• Cek Saldo (/saldo) — Rincian semua dompet
• Audit Penghasilan (/audit) — Evaluasi cashflow & rasio tabungan
• Cek Budget (/budget) — Status pos anggaran bulanan
• Rekap Hari Ini (/hari ini) — Ringkasan harian
• Rekap Bulan Ini (/bulan ini) — Ringkasan bulanan & top kategori
• Tips Finansial (/tips) — Tips hemat cerdas`;
}
