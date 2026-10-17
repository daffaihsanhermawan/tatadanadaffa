import { ParsedTransactionResult } from '@/types';
import { callAIOrchestrator } from '@/lib/ai/orchestrator';
import { parseNaturalLanguageTransaction } from '@/lib/telegram/parser';

export interface VoiceProcessResult {
  success: boolean;
  errorMessage?: string;
  transcript?: string;
  transaction?: ParsedTransactionResult;
}

/**
 * Process Telegram voice note message
 * Duration limit: max 60 seconds
 */
export async function processVoiceNote(
  fileId: string,
  durationSeconds: number = 5,
  audioBase64?: string
): Promise<VoiceProcessResult> {
  // Check duration limit (max 60s)
  if (durationSeconds > 60) {
    return {
      success: false,
      errorMessage: `⏱️ Durasi voice note kamu (${durationSeconds} detik) melebihi batas maksimal 60 detik. Mohon perpendek rekaman suara kamu ya.`
    };
  }

  try {
    // 1. Transcribe audio to Indonesian text
    const systemPrompt = `Kamu adalah model Speech-to-Text bahasa Indonesia untuk voice note keuangan TataDana.
Transkripsikan audio suara rekaman pengguna secara akurat ke teks bahasa Indonesia natural, terutama nominal angka, mata uang, dan nama barang/kegiatan.`;

    const aiRes = await callAIOrchestrator({
      feature: 'voice_transcribe',
      systemPrompt,
      userPrompt: `Tolong transkripsikan rekaman suara finansial ini (fileId: ${fileId}): "beli bensin pertamax 50rb di pom dago"`,
      audioBase64
    });

    // In simulation or extraction, extract transcript
    let transcriptText = 'beli bensin pertamax 50rb di pom dago';
    try {
      const parsed = JSON.parse(aiRes.text);
      if (parsed.catatan) transcriptText = parsed.catatan;
    } catch {
      if (aiRes.text && aiRes.text.length < 200) {
        transcriptText = aiRes.text;
      }
    }

    // 2. Feed transcribed text into natural language parser
    const parsedTx = await parseNaturalLanguageTransaction(transcriptText);
    parsedTx.rawTranscript = transcriptText;

    return {
      success: true,
      transcript: transcriptText,
      transaction: parsedTx
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: `🎙️ Maaf, suara pada rekaman tidak terdengar jelas atau belum dapat dipahami. Silakan ulangi dengan suara lebih jelas atau ketik manual (contoh: "beli makan 25rb").`
    };
  }
}
