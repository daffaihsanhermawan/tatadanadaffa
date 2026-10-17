/**
 * Telegram Bot API HTTP Wrapper
 */

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramGetMeResponse {
  ok: boolean;
  result?: TelegramUser;
  description?: string;
  error_code?: number;
}

export interface TelegramSetWebhookResponse {
  ok: boolean;
  result?: boolean;
  description?: string;
}

/**
 * Validate token via GET https://api.telegram.org/bot<TOKEN>/getMe
 */
export async function getMe(botToken: string): Promise<TelegramGetMeResponse> {
  if (!botToken) {
    return { ok: false, description: 'Token bot tidak boleh kosong.' };
  }

  // Allow mock testing in offline/demo environments
  if (botToken.startsWith('mock_')) {
    return {
      ok: true,
      result: {
        id: 987654321,
        is_bot: true,
        first_name: 'TataDana Assistant',
        username: 'TataDanaBot'
      }
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, description: err?.message || 'Gagal menghubungi server Telegram.' };
  }
}

/**
 * Configure Telegram Webhook via POST https://api.telegram.org/bot<TOKEN>/setWebhook
 */
export async function setWebhook(botToken: string, webhookUrl: string): Promise<TelegramSetWebhookResponse> {
  if (!botToken || !webhookUrl) {
    return { ok: false, description: 'Token dan URL webhook wajib disediakan.' };
  }

  if (botToken.startsWith('mock_')) {
    return { ok: true, result: true, description: 'Webhook set successfully (mock mode)' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, description: err?.message || 'Gagal mendaftarkan webhook ke Telegram.' };
  }
}

/**
 * Delete Telegram Webhook via POST https://api.telegram.org/bot<TOKEN>/deleteWebhook
 * Required when switching to Polling mode
 */
export async function deleteWebhook(botToken: string): Promise<{ ok: boolean; description?: string }> {
  if (!botToken) {
    return { ok: false, description: 'Token tidak boleh kosong.' };
  }

  if (botToken.startsWith('mock_')) {
    return { ok: true, description: 'Webhook deleted (mock mode)' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, description: err?.message || 'Gagal menghapus webhook Telegram.' };
  }
}

/**
 * Fetch incoming updates via Long Polling GET https://api.telegram.org/bot<TOKEN>/getUpdates
 */
export async function getUpdates(
  botToken: string, 
  offset: number = 0, 
  timeout: number = 10
): Promise<{ ok: boolean; result?: any[]; description?: string }> {
  if (!botToken) {
    return { ok: false, description: 'Token tidak boleh kosong.' };
  }

  if (botToken.startsWith('mock_')) {
    return { ok: true, result: [] };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=${timeout}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, description: err?.message || 'Gagal mengambil update dari Telegram.' };
  }
}

/**
 * Send text message to user on Telegram
 */
export async function sendTelegramMessage(botToken: string, chatId: number | string, text: string): Promise<boolean> {
  if (!botToken || !chatId || !text) return false;

  if (botToken.startsWith('mock_')) {
    console.log(`[MOCK TELEGRAM BOT -> Chat ${chatId}]:\n${text}`);
    return true;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      })
    });
    const data = await res.json();
    if (!data.ok) {
      console.warn('[Telegram sendMessage failed]:', data.description);
    }
    return !!data.ok;
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
    return false;
  }
}
