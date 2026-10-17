import { AIProviderConfig, AILog } from '@/types';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { decryptSecret } from '@/lib/utils/encryption';
import { extractDateFromText } from '@/lib/utils/timezone';

export interface AICallOptions {
  feature: 'text_parse' | 'photo_ocr' | 'voice_transcribe' | 'financial_advisor' | 'category_recommendation';
  systemPrompt: string;
  userPrompt: string;
  imageBase64?: string;
  audioBase64?: string;
  temperature?: number;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
}

/**
 * Execute AI call across multi-provider with single or parallel failover strategy
 */
export async function callAIOrchestrator(options: AICallOptions): Promise<AIResponse> {
  const startTime = Date.now();
  const providers = Array.from(inMemoryStore.aiProviders.values())
    .filter(p => p.is_active)
    .sort((a, b) => a.priority - b.priority);

  if (providers.length === 0) {
    throw new Error('Tidak ada provider AI aktif yang terkonfigurasi di sistem.');
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    const providerStartTime = Date.now();
    try {
      const apiKey = decryptSecret(provider.api_key_encrypted) || process.env[`${provider.name.toUpperCase()}_API_KEY`] || '';

      const responseText = await executeProviderCall(provider, apiKey, options);
      const latencyMs = Date.now() - providerStartTime;

      const logEntry: AILog = {
        id: `ai-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        provider: provider.name,
        feature: options.feature,
        prompt_preview: options.userPrompt.slice(0, 150),
        tokens_used: Math.round(options.userPrompt.length / 4) + 60,
        cost_estimated: 0.0005,
        latency_ms: latencyMs,
        status: 'success',
        created_at: new Date().toISOString()
      };
      inMemoryStore.aiLogs.unshift(logEntry);

      return {
        text: responseText,
        provider: provider.name,
        model: provider.model_name,
        tokensUsed: logEntry.tokens_used,
        latencyMs,
      };
    } catch (err: any) {
      lastError = err;
      const latencyMs = Date.now() - providerStartTime;

      const logEntry: AILog = {
        id: `ai-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        provider: provider.name,
        feature: options.feature,
        prompt_preview: options.userPrompt.slice(0, 150),
        tokens_used: 0,
        cost_estimated: 0,
        latency_ms: latencyMs,
        status: 'error',
        error_message: err?.message || 'Provider execution failed',
        created_at: new Date().toISOString()
      };
      inMemoryStore.aiLogs.unshift(logEntry);

      // If in single mode, do not failover to next provider
      if (provider.mode === 'single') {
        throw err;
      }
      // If in failover mode, continue loop to next provider
      console.warn(`[AI Failover] Provider ${provider.name} failed (${err.message}). Trying next fallback provider...`);
    }
  }

  throw lastError || new Error('Semua AI provider gagal merespons.');
}

/**
 * Dispatch call to specific provider API or robust smart mock engine if keys are placeholder
 */
async function executeProviderCall(
  provider: AIProviderConfig, 
  apiKey: string, 
  options: AICallOptions
): Promise<string> {
  // If a real production API key is present and not mock, execute HTTP fetch
  if (apiKey && !apiKey.startsWith('mock_') && !apiKey.startsWith('ENCRYPTED_')) {
    if (provider.name === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model_name}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${options.systemPrompt}\n\n${options.userPrompt}` }] }]
        })
      });
      if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (provider.name === 'openai' || provider.name === 'deepseek') {
      const baseUrl = provider.name === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: provider.model_name,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt }
          ],
          temperature: options.temperature || 0.2
        })
      });
      if (!res.ok) throw new Error(`${provider.display_name} API error: ${res.statusText}`);
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || '';
    }
  }

  // High-fidelity fallback AI simulation for offline / testing / development environments
  return simulateAIResponse(options);
}

/**
 * High-fidelity fallback AI processor for reliable local development & testing
 */
function simulateAIResponse(options: AICallOptions): string {
  const text = options.userPrompt.toLowerCase();

  if (options.feature === 'text_parse' || options.feature === 'voice_transcribe') {
    // Detect income keywords
    const isIncome = /gajian|gaji|terima|dapat|transfer masuk|bonus|penjualan|pemasukan|inflow/.test(text);
    const isTransfer = /transfer ke|kirim ke|pindah ke/.test(text);

    // Extract nominal
    let nominal = 0;
    // Check "1.5jt", "1,5jt", "5jt"
    const jtMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/);
    if (jtMatch) {
      nominal = parseFloat(jtMatch[1].replace(',', '.')) * 1000000;
    } else {
      // Check "15rb", "15ribu", "500k"
      const rbMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)/);
      if (rbMatch) {
        nominal = parseFloat(rbMatch[1].replace(',', '.')) * 1000;
      } else {
        const plainNum = text.match(/(\d[\d.,]*)/);
        if (plainNum) {
          const cleaned = plainNum[1].replace(/[.,]/g, '');
          nominal = parseInt(cleaned, 10);
        }
      }
    }

    if (nominal <= 0) {
      return JSON.stringify({
        error: 'Nominal transaksi tidak terdeteksi atau tidak valid.',
        valid: false
      });
    }

    let kategori = 'Makanan & Minuman';
    if (isIncome) {
      kategori = 'Gaji Bulanan';
    } else if (isTransfer) {
      kategori = 'Transfer';
    } else if (/bensin|pertalite|pertamax|grab|gojek|ojol|tol|parkir|transport/.test(text)) {
      kategori = 'Transportasi';
    } else if (/netflix|spotify|game|steam|bioskop|nonton|liburan/.test(text)) {
      kategori = 'Hiburan & Hobi';
    } else if (/listrik|pln|pdam|wifi|indihome|pulsa|paket data|kontrakan|sewa/.test(text)) {
      kategori = 'Tagihan & Utilitas';
    } else if (/obat|dokter|klinik|apotek|vitamin/.test(text)) {
      kategori = 'Kesehatan & Medis';
    } else if (/baju|sepatu|superindo|indomaret|alfamart|belanja|iphone|hp|laptop|gadget|ipad|macbook/.test(text)) {
      kategori = 'Belanja Kebutuhan';
    }

    let dompet: string | undefined = undefined;
    if (/\b(?:gopay|go-pay|go pay)\b/.test(text)) dompet = 'gopay';
    else if (/\b(?:ovo)\b/.test(text)) dompet = 'ovo';
    else if (/\b(?:dana)\b/.test(text)) dompet = 'dana';
    else if (/\b(?:shopeepay|spay|shopee pay)\b/.test(text)) dompet = 'shopeepay';
    else if (/\b(?:bca|bank bca)\b/.test(text)) dompet = 'bca';
    else if (/\b(?:mandiri|livin)\b/.test(text)) dompet = 'mandiri';
    else if (/\b(?:bni)\b/.test(text)) dompet = 'bni';
    else if (/\b(?:bri|brimo)\b/.test(text)) dompet = 'bri';
    else if (/\b(?:jago|bank jago)\b/.test(text)) dompet = 'jago';
    else if (/\b(?:tunai|cash|uang tunai)\b/.test(text)) dompet = 'tunai';
    else if (/\b(?:bank|rekening)\b/.test(text)) dompet = 'bank';

    const detectedDate = extractDateFromText(options.userPrompt);

    return JSON.stringify({
      valid: true,
      jenis: isIncome ? 'pemasukan' : isTransfer ? 'transfer' : 'pengeluaran',
      nominal: Math.round(nominal),
      kategori: kategori,
      dompet: dompet || null,
      date: detectedDate || null,
      catatan: options.userPrompt.trim(),
    });
  }

  if (options.feature === 'photo_ocr') {
    return JSON.stringify({
      valid: true,
      merchant: 'Superindo Supermarket',
      total: 285000,
      kategori: 'Belanja Kebutuhan',
      catatan: 'Belanja mingguan dari foto struk',
      items: [
        { item_name: 'Minyak Goreng 2L', price: 34000, category_name: 'Belanja Kebutuhan' },
        { item_name: 'Beras Pandan Wangi 5kg', price: 78000, category_name: 'Belanja Kebutuhan' },
        { item_name: 'Daging Ayam Broiler 1kg', price: 55000, category_name: 'Makanan & Minuman' },
        { item_name: 'Apel Fuji Manis', price: 42000, category_name: 'Makanan & Minuman' },
        { item_name: 'Sabun Cair & Shampoo', price: 76000, category_name: 'Belanja Kebutuhan' },
      ]
    });
  }

  if (options.feature === 'financial_advisor') {
    return `Pengeluaran kategori Makanan & Minuman kamu minggu ini meningkat 60% dibanding minggu lalu. Sebagian besar berasal dari makan di luar saat jam kerja.\n💡 Saran: Coba alokasikan budget makan siang mingguan maksimal Rp150.000 atau bawa bekal 2 hari dalam seminggu untuk menghemat hingga Rp400.000 bulan ini!`;
  }

  if (options.feature === 'category_recommendation') {
    return JSON.stringify([
      { name: 'Makanan & Minuman', icon: '🍜', color: '#F97316', type: 'expense' },
      { name: 'Transportasi', icon: '🚗', color: '#3B82F6', type: 'expense' },
      { name: 'Kost & Tagihan', icon: '🏠', color: '#EF4444', type: 'expense' },
      { name: 'Kopi & Nongkrong', icon: '☕', color: '#8B5CF6', type: 'expense' },
      { name: 'Belanja & Skincare', icon: '💄', color: '#EC4899', type: 'expense' },
      { name: 'Gaji Pokok', icon: '💰', color: '#22C55E', type: 'income' },
      { name: 'Side Hustle', icon: '💼', color: '#F59E0B', type: 'income' },
    ]);
  }

  return 'OK';
}
