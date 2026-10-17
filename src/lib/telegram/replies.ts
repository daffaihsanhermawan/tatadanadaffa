import { formatRupiah, formatWIBDateTime } from '@/lib/utils/timezone';

export interface ExpenseReplyParams {
  transactionDate?: Date | string;
  nominal: number;
  kategoriEmoji: string;
  kategoriNama: string;
  walletNama: string;
  catatan: string;
  saldoAkhir: number;
  budgetLimit?: number;
  budgetTerpakai?: number;
  transcriptVoice?: string;
}

export interface IncomeReplyParams {
  transactionDate?: Date | string;
  nominal: number;
  kategoriEmoji?: string;
  kategoriNama?: string;
  walletNama: string;
  catatan?: string;
  saldoAkhir: number;
  transcriptVoice?: string;
}

/**
 * Generate visual ASCII progress bar using █ and ░
 * e.g. [██████░░░░] 60%
 */
export function generateProgressBar(percentage: number, length: number = 10): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const filledBlocks = Math.round((clamped / 100) * length);
  const emptyBlocks = length - filledBlocks;
  const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
  return `[${bar}] ${clamped}%`;
}

/**
 * Format bot reply for Expense (Pengeluaran)
 */
export function formatExpenseReply(params: ExpenseReplyParams): string {
  const {
    transactionDate,
    nominal,
    kategoriEmoji,
    kategoriNama,
    walletNama,
    catatan,
    saldoAkhir,
    budgetLimit = 2000000,
    budgetTerpakai = 500000,
    transcriptVoice
  } = params;

  const dateStr = formatWIBDateTime(transactionDate || new Date());
  const percentUsed = budgetLimit > 0 ? (budgetTerpakai / budgetLimit) * 100 : 0;
  const sisaBudget = Math.max(0, budgetLimit - budgetTerpakai);
  const progressBar = generateProgressBar(percentUsed, 10);

  let motivation = '';
  if (percentUsed >= 100) {
    motivation = '\n⚠️ Perhatian: Budget kategori ini sudah 100% habis! Tahan pengeluaran ya.';
  } else if (percentUsed >= 80) {
    motivation = '\n⚡ Hati-hati: Budget kategori ini sudah mencapai 80%. Rem pengeluaranmu!';
  } else {
    motivation = '\n✨ Bagus! Pengeluaran masih dalam batas aman terkendali.';
  }

  const voiceLine = transcriptVoice ? `\n🎙️ Transkrip: "${transcriptVoice}"\n` : '';

  return `📅 ${dateStr}${voiceLine}
💸 Pengeluaran tercatat!
├ Nominal : ${formatRupiah(nominal)}
├ Kategori : ${kategoriEmoji} ${kategoriNama}
├ Dompet : 👛 ${walletNama}
├ Catatan : ${catatan}
└ Saldo : ${formatRupiah(saldoAkhir)}

📊 Budget ${kategoriNama} bulan ini:
${progressBar} — sisa ${formatRupiah(sisaBudget)}${motivation}`;
}

/**
 * Format bot reply for Income (Pemasukan)
 */
export function formatIncomeReply(params: IncomeReplyParams): string {
  const {
    transactionDate,
    nominal,
    kategoriEmoji = '💼',
    kategoriNama = 'Pemasukan',
    walletNama,
    saldoAkhir,
    transcriptVoice
  } = params;

  const dateStr = formatWIBDateTime(transactionDate || new Date());
  const voiceLine = transcriptVoice ? `\n🎙️ Transkrip: "${transcriptVoice}"\n` : '';

  return `📅 ${dateStr}${voiceLine}
💰 Pemasukan tercatat!
├ Nominal : ${formatRupiah(nominal)}
├ Kategori : ${kategoriEmoji} ${kategoriNama}
├ Dompet : 👛 ${walletNama}
└ Saldo baru : ${formatRupiah(saldoAkhir)}

💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.`;
}

/**
 * Format bot reply for AI Financial Advisor alert
 */
export function formatAdvisorAlert(userName: string, analysis: string, advice: string): string {
  return `🤖 Financial Advisor
Hei ${userName}! ${analysis}
💡 Saran: ${advice}`;
}

/**
 * Format daily reminder
 */
export function formatDailyReminder(): string {
  return `⏰ Reminder Keuangan!
Jangan lupa catat pengeluaran hari ini ya 📝
Pencatatan rutin = keuangan lebih terkontrol 💪
Ketik transaksimu sekarang!`;
}

/**
 * Format monthly limit exceeded for Starter Plan
 */
export function formatLimitExceededReply(): string {
  return `⚠️ Batas Transaksi Bulanan Tercapai!

Paket Starter kamu memiliki batas 50 transaksi per bulan. Untuk mencatat transaksi tanpa batas, fitur AI scan struk, dan ekspor laporan lengkap:

👉 Upgrade ke TataDana Pro (Hanya Rp99.000 Sekali Bayar!)
Kunjungi: https://tatadana.com/pricing`;
}

/**
 * Format Pro-only feature restricted reply (e.g. Receipt Photo OCR on Starter)
 */
export function formatProOnlyFeatureReply(featureName: string): string {
  return `🔒 Fitur ${featureName} Khusus Paket Pro!

Maaf, fitur ${featureName} hanya tersedia untuk pengguna paket TataDana Pro.

Keuntungan TataDana Pro:
✨ Catat via Foto Struk dengan AI Vision
✨ Voice Note tanpa batas
✨ Ekspor Laporan PDF & Excel tak terbatas
✨ AI Financial Advisor otomatis
✨ Hanya Rp99.000 Sekali Bayar Seumur Hidup!

Kunjungi dashboard untuk upgrade: https://tatadana.com/settings`;
}
