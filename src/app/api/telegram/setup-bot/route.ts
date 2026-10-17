import { NextRequest, NextResponse } from 'next/server';
import { getMe, setWebhook, deleteWebhook } from '@/lib/telegram/bot-api';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { encryptSecret } from '@/lib/utils/encryption';
import fs from 'fs';
import path from 'path';

function persistTokenToEnv(token: string) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('TELEGRAM_BOT_TOKEN=')) {
        content = content.replace(/TELEGRAM_BOT_TOKEN=.*(\r?\n|$)/, `TELEGRAM_BOT_TOKEN=${token}\n`);
      } else {
        content += `\nTELEGRAM_BOT_TOKEN=${token}\n`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
    }
  } catch (e) {
    console.error('Failed to update .env.local:', e);
  }
}

/**
 * Get Saved Telegram Bot Settings
 * GET /api/telegram/setup-bot?userId=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const link = userId ? inMemoryStore.telegramLinks.get(userId) : null;
    const rawToken = link?.bot_token_raw || '';
    const botToken = rawToken.includes('mock') ? '' : rawToken;
    const botUsername = botToken ? (link?.bot_username || '') : '';
    const status = (link?.status_koneksi === 'connected' && botToken) ? 'connected' : 'disconnected';
    const mode = link?.connection_mode || 'polling';

    return NextResponse.json({
      ok: true,
      botToken,
      botUsername,
      status,
      mode,
      message: status === 'connected' ? `Bot @${botUsername} aktif.` : 'Bot belum terhubung.'
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}

/**
 * Setup Telegram Bot & Test Connection
 * POST /api/telegram/setup-bot
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId = 'user-demo-tatadana', botToken, mode = 'polling' } = body;

    if (!botToken || !botToken.trim()) {
      return NextResponse.json({
        ok: false,
        message: 'Token Bot wajib diisi. Dapatkan dari @BotFather di Telegram.'
      }, { status: 400 });
    }

    const trimmedToken = botToken.trim();

    // 1. Call Telegram getMe to verify token authenticity
    const getMeRes = await getMe(trimmedToken);
    if (!getMeRes.ok || !getMeRes.result) {
      return NextResponse.json({
        ok: false,
        status: 'disconnected',
        message: `Token tidak valid: ${getMeRes.description || 'Gagal verifikasi dengan Telegram API'}`
      }, { status: 400 });
    }

    const botInfo = getMeRes.result;

    // 2. Setup Connection Mode: Polling vs Webhook
    // For localhost dev, Polling is required so the bot can receive updates without public URL!
    if (mode === 'polling') {
      // Must delete webhook so getUpdates / Polling works on Telegram
      await deleteWebhook(trimmedToken);
    } else {
      // Webhook mode (for production)
      const webhookBase = process.env.WEBHOOK_BASE_URL || 'https://tatadana-dev.ngrok.app';
      const targetWebhookUrl = `${webhookBase}/api/telegram/webhook`;
      await setWebhook(trimmedToken, targetWebhookUrl);
    }

    // 3. Persist Token in Memory, Environment, and .env.local
    process.env.TELEGRAM_BOT_TOKEN = trimmedToken;
    persistTokenToEnv(trimmedToken);

    const encrypted = encryptSecret(trimmedToken);
    const existing = inMemoryStore.telegramLinks.get(userId);

    const updatedLink = {
      id: existing?.id || `tg-link-${Date.now()}`,
      user_id: userId,
      telegram_user_id: existing?.telegram_user_id || null,
      telegram_chat_id: existing?.telegram_chat_id || null,
      bot_token_encrypted: encrypted,
      bot_token_raw: trimmedToken,
      bot_username: botInfo.username || 'TataDanaBot',
      status_koneksi: 'connected' as const,
      connection_mode: mode as 'polling' | 'webhook',
      webhook_url: mode === 'webhook' ? `${process.env.WEBHOOK_BASE_URL || ''}/api/telegram/webhook` : null,
      linked_at: new Date().toISOString(),
    };

    inMemoryStore.telegramLinks.set(userId, updatedLink);

    return NextResponse.json({
      ok: true,
      status: 'connected',
      botUsername: botInfo.username,
      botName: botInfo.first_name,
      mode,
      message: `Berhasil terhubung dengan bot @${botInfo.username}! (Mode: ${mode === 'polling' ? 'Live Polling' : 'Webhook'})`
    });
  } catch (err: any) {
    console.error('[setup-bot error]:', err);
    return NextResponse.json({
      ok: false,
      status: 'disconnected',
      message: err?.message || 'Terjadi kesalahan sistem saat menghubungkan bot.'
    }, { status: 500 });
  }
}
