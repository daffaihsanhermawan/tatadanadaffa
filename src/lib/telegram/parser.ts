import { ParsedTransactionResult } from '@/types';
import { callAIOrchestrator } from '@/lib/ai/orchestrator';
import { getWIBDate, toWIBDateString } from '@/lib/utils/timezone';

/**
 * Detect payment method / wallet keyword from natural language Indonesian text
 * e.g. "gopay", "ovo", "dana", "shopeepay", "bca", "mandiri", "tunai", "cash"
 */
export function extractPaymentMethod(text: string): string | undefined {
  const clean = text.toLowerCase();
  if (/\b(?:gopay|go-pay|go pay)\b/.test(clean)) return 'gopay';
  if (/\b(?:ovo)\b/.test(clean)) return 'ovo';
  if (/\b(?:dana)\b/.test(clean)) return 'dana';
  if (/\b(?:shopeepay|spay|shopee pay)\b/.test(clean)) return 'shopeepay';
  if (/\b(?:bca|bank bca)\b/.test(clean)) return 'bca';
  if (/\b(?:mandiri|livin)\b/.test(clean)) return 'mandiri';
  if (/\b(?:bni)\b/.test(clean)) return 'bni';
  if (/\b(?:bri|brimo)\b/.test(clean)) return 'bri';
  if (/\b(?:jago|bank jago)\b/.test(clean)) return 'jago';
  if (/\b(?:tunai|cash|uang tunai)\b/.test(clean)) return 'tunai';
  if (/\b(?:bank|rekening)\b/.test(clean)) return 'bank';
  return undefined;
}

export { extractDateFromText } from '@/lib/utils/timezone';
import { extractDateFromText } from '@/lib/utils/timezone';

/**
 * Parse Indonesian natural language transaction prompt
 * e.g. "beli bakso 15rb", "gajian 5jt", "kopi susu 25k", "bayar listrik 350.000", "bakso 20rb gopay", "Beli iPhone 20jt tanggal 14 oktober"
 */
export async function parseNaturalLanguageTransaction(inputText: string): Promise<ParsedTransactionResult> {
  const trimmed = inputText.trim();
  if (!trimmed) {
    throw new Error('Pesan transaksi tidak boleh kosong.');
  }

  const systemPrompt = `Kamu adalah asisten parser transaksi keuangan fintech Indonesia "TataDana".
Tugasmu adalah mengubah kalimat input bahasa Indonesia dari pengguna menjadi data JSON transaksi keuangan yang terstruktur.
Aturan parsing:
1. Jenis transaksi: "pengeluaran", "pemasukan", atau "transfer".
2. Konversi nominal khas Indonesia dengan tepat:
   - "15rb", "15ribu", "15k" = 15000
   - "1.5jt", "1,5jt", "1.5 juta" = 1500000
   - "500k" = 500000
   - "20jt" = 20000000
   - "5jt" = 5000000
   - "25.000" = 25000
3. Kategori harus relevan: "Makanan & Minuman", "Transportasi", "Hiburan & Hobi", "Tagihan & Utilitas", "Kesehatan & Medis", "Belanja Kebutuhan", "Pendidikan & Kursus", "Gaji Bulanan", "Freelance & Side Job".
4. Deteksi metode pembayaran / dompet jika ada ("gopay", "ovo", "dana", "shopeepay", "bca", "mandiri", "tunai", "cash", dll).
5. Deteksi tanggal transaksi jika disebutkan (misal: "tanggal 14 oktober", "tgl 14 okt", "kemarin", "14/10/2026", "tanggal 1"). Format dalam string "YYYY-MM-DD" jika ada, atau null jika tidak ada (default hari ini).
6. Kembalikan HANYA format JSON valid tanpa markdown backticks:
{
  "valid": true,
  "jenis": "pengeluaran" | "pemasukan" | "transfer",
  "nominal": 15000,
  "kategori": "Makanan & Minuman",
  "dompet": "gopay" | "bca" | "tunai" | null,
  "date": "2026-10-14" | null,
  "catatan": "beli bakso 15rb"
}
Jika kalimat tidak berisi transaksi atau nominal tidak bisa dipahami, kembalikan:
{
  "valid": false,
  "error": "Nominal transaksi tidak terdeteksi. Contoh format: 'beli bakso 15rb' atau 'gajian 5jt'."
}`;

  try {
    const aiRes = await callAIOrchestrator({
      feature: 'text_parse',
      systemPrompt,
      userPrompt: trimmed,
      temperature: 0.1
    });

    let cleanedJson = aiRes.text.trim();
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanedJson);

    if (!parsed.valid || !parsed.nominal || parsed.nominal <= 0) {
      throw new Error(parsed.error || 'Maaf, TataDana belum dapat memahami nominal transaksimu. Contoh yang benar:\n• "beli bakso 15rb"\n• "gajian 5jt"\n• "bensin 25k"');
    }

    const detectedWallet = parsed.dompet || extractPaymentMethod(trimmed);
    const detectedDate = parsed.date || parsed.tanggal || extractDateFromText(trimmed);

    return {
      jenis: parsed.jenis || 'pengeluaran',
      nominal: Math.round(parsed.nominal),
      kategori: parsed.kategori || (parsed.jenis === 'pemasukan' ? 'Gaji Bulanan' : 'Makanan & Minuman'),
      catatan: parsed.catatan || trimmed,
      dompet: detectedWallet,
      date: detectedDate
    };
  } catch (err: any) {
    if (err.message && err.message.includes('TataDana')) {
      throw err;
    }
    throw new Error(`Maaf, format pesan tidak dikenali. Contoh yang benar:\n• "beli bakso 15rb"\n• "gajian 5jt"\n• "kopi susu 25k"`);
  }
}
