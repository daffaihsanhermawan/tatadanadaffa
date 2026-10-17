import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate } from '@/lib/telegram/processor';

/**
 * Main Telegram Webhook Endpoint
 * Public URL: POST /api/telegram/webhook
 * Idempotent: Skips if update_id already processed
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const result = await processTelegramUpdate(payload);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Telegram Webhook Error]:', err);
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
