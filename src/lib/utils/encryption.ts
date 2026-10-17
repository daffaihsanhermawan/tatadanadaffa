import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = (process.env.APP_ENCRYPTION_SECRET || 'tatadana-super-secret-key-32chars!!').padEnd(32, '!').slice(0, 32);
const IV_LENGTH = 16;

/**
 * Encrypt a sensitive token/string using AES-256-CBC
 */
export function encryptSecret(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-CBC encrypted token/string
 */
export function decryptSecret(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const [ivHex, encryptedData] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return encryptedText;
  }
}
