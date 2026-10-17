import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { getUpdates } from '@/lib/telegram/bot-api';
import { processTelegramUpdate } from '@/lib/telegram/processor';

let lastOffset = 0;

/**
 * Polling API for Localhost Development
 * GET /api/telegram/poll?userId=...
 * Fetches pending messages from Telegram and processes them immediately.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user-demo-tatadana';

    const link = inMemoryStore.telegramLinks.get(userId);
    const botToken = link?.bot_token_raw || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || botToken.startsWith('mock_')) {
      return NextResponse.json({ ok: false, message: 'Belum ada token bot Telegram aktif.' });
    }

    const updatesRes = await getUpdates(botToken, lastOffset, 2);
    if (!updatesRes.ok || !updatesRes.result || updatesRes.result.length === 0) {
      return NextResponse.json({ ok: true, count: 0, message: 'Tidak ada pesan baru.' });
    }

    const updates = updatesRes.result;
    const processed: any[] = [];

    for (const update of updates) {
      if (update.update_id >= lastOffset) {
        lastOffset = update.update_id + 1;
      }
      const res = await processTelegramUpdate(update, botToken);
      processed.push({ updateId: update.update_id, res });
    }

    return NextResponse.json({
      ok: true,
      count: processed.length,
      processed
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}
