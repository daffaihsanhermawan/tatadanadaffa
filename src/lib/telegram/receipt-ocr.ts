import { Profile, ParsedTransactionResult, ReceiptItem } from '@/types';
import { canAccessReceiptOCR } from '@/lib/plans/limits';
import { formatProOnlyFeatureReply } from '@/lib/telegram/replies';
import { callAIOrchestrator } from '@/lib/ai/orchestrator';

export interface OCRResult {
  allowed: boolean;
  replyMessage?: string;
  data?: ParsedTransactionResult;
}

/**
 * Process receipt photo using AI Vision (Gemini / GPT Vision)
 */
export async function processReceiptPhoto(
  profile: Profile,
  photoFileId: string,
  imageBase64?: string
): Promise<OCRResult> {
  // 1. Enforcement: Pro only
  if (!canAccessReceiptOCR(profile)) {
    return {
      allowed: false,
      replyMessage: formatProOnlyFeatureReply('Scan Foto Struk AI')
    };
  }

  const systemPrompt = `Kamu adalah sistem AI OCR Finansial untuk aplikasi TataDana.
Tugasmu adalah menganalisis gambar struk belanja dan mengekstrak:
1. Nama merchant / toko
2. Total pembayaran
3. Kategori umum struk
4. Rincian item per baris (nama item, harga per item, dan estimasi kategori per item)
Format balasan HANYA JSON:
{
  "valid": true,
  "merchant": "Nama Toko / Supermarket",
  "total": 125000,
  "kategori": "Belanja Kebutuhan",
  "catatan": "Struk belanja di Nama Toko",
  "items": [
    { "item_name": "Roti Gandum", "price": 25000, "category_name": "Makanan & Minuman" },
    { "item_name": "Sabun Cuci", "price": 35000, "category_name": "Belanja Kebutuhan" }
  ]
}`;

  try {
    const aiRes = await callAIOrchestrator({
      feature: 'photo_ocr',
      systemPrompt,
      userPrompt: `Tolong ekstrak struk belanja dari file: ${photoFileId}`,
      imageBase64
    });

    let cleaned = aiRes.text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleaned);

    const items: ReceiptItem[] = (parsed.items || []).map((it: any) => ({
      item_name: it.item_name || 'Item',
      price: Number(it.price) || 0,
      category_name: it.category_name || parsed.kategori || 'Belanja Kebutuhan'
    }));

    return {
      allowed: true,
      data: {
        jenis: 'pengeluaran',
        nominal: Number(parsed.total) || items.reduce((s, i) => s + i.price, 0) || 50000,
        kategori: parsed.kategori || 'Belanja Kebutuhan',
        catatan: `Belanja di ${parsed.merchant || 'Merchant'} (${items.length} item)`,
        merchant: parsed.merchant || 'Struk Belanja',
        items
      }
    };
  } catch (err: any) {
    throw new Error('Gagal memproses struk dengan AI Vision. Pastikan foto struk terlihat jelas dan terang.');
  }
}
