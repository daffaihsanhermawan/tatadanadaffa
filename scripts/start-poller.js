/**
 * TataDana Local Telegram Bot Poller
 * Continuously polls updates from Telegram API and forwards them to localhost webhook.
 * Allows the bot to work end-to-end on localhost without needing a public domain or ngrok!
 */

const fs = require('fs');
const path = require('path');

function getBotToken() {
  if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN.startsWith('mock_')) {
    return process.env.TELEGRAM_BOT_TOKEN;
  }
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/TELEGRAM_BOT_TOKEN=([^\r\n]+)/);
      if (match && match[1] && !match[1].startsWith('mock_')) {
        return match[1].trim();
      }
    }
  } catch (e) {}
  return null;
}

let lastOffset = 0;
let isPolling = false;

async function startPoller() {
  console.log('--------------------------------------------------');
  console.log('🤖 TataDana Telegram Bot Polling Engine Started');
  console.log('--------------------------------------------------');

  while (true) {
    const token = getBotToken();
    if (!token) {
      // Waiting for user to configure token in Settings
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    try {
      // 1. Delete webhook if switching to polling
      if (!isPolling) {
        console.log(`[POLLER] Initializing polling for bot token: ${token.slice(0, 10)}...`);
        try {
          const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
          const delData = await delRes.json();
          console.log('[POLLER] deleteWebhook status:', delData.description || delData.ok);
        } catch (e) {}
        isPolling = true;
      }

      // 2. Fetch updates using long-polling
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastOffset}&timeout=5`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        for (const update of data.result) {
          lastOffset = update.update_id + 1;
          const user = update.message?.from?.username || update.message?.from?.first_name || 'User';
          const text = update.message?.text || update.message?.caption || (update.message?.photo ? '[Photo]' : '[Media]');
          console.log(`\n📨 [TELEGRAM PESAN MASUK] dari ${user}: "${text}"`);

          // Forward to local webhook
          try {
            const hookRes = await fetch('http://localhost:3000/api/telegram/webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update)
            });
            const hookData = await hookRes.json();
            console.log(`✅ [PROCESSED]: Balasan terkirim kembali ke Telegram! (OK: ${hookData.ok})`);
          } catch (hookErr) {
            console.error('❌ [WEBHOOK FORWARD ERROR]:', hookErr.message);
          }
        }
      }
    } catch (err) {
      console.error('[POLLER ERROR]:', err.message);
      await new Promise(r => setTimeout(r, 3000));
    }

    await new Promise(r => setTimeout(r, 1000));
  }
}

startPoller();
