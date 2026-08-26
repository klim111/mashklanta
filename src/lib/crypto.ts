import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * הצפנה ברמת השדה לנתונים רגישים (הכנסות, התחייבויות, דירוג אשראי).
 *
 * הערכים נשמרים כטקסט מוצפן בעמודות המסד, כך שגיבוי, לוג שאילתות או גישה
 * לקריאה בלבד למסד אינם חושפים אותם. המחיר: אי אפשר לסנן, למיין או לחשב על
 * השדות האלה ב-SQL — לשם כך יש עמודות bucket נפרדות שאינן מוצפנות.
 *
 * יצירת מפתח:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const CURRENT_VERSION = 'v1';

let cachedKey: Buffer | null = null;

/**
 * המפתח נטען בעצלתיים ולא ברמת המודול, כדי שבנייה בלי המשתנה מוגדר לא תיכשל
 * ורק שימוש בפועל יידרוש אותו.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('FIELD_ENCRYPTION_KEY is not set — cannot read or write encrypted fields');
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}`
    );
  }

  cachedKey = key;
  return key;
}

/** לשימוש בבדיקות, אחרי שינוי משתנה הסביבה */
export function resetEncryptionKeyCache(): void {
  cachedKey = null;
}

/**
 * שם השדה נכנס כ-AAD, כך שטקסט מוצפן של שדה אחד אינו תקף בשדה אחר. בלי זה
 * אפשר היה להעתיק ערך מעמודת creditScore לעמודת income והוא היה מפוענח כרגיל.
 */
function assertContext(context: string): void {
  if (!context) throw new Error('Encryption context (field name) is required');
}

export function encryptField(plaintext: string, context: string): string {
  assertContext(context);

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [CURRENT_VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decryptField(payload: string, context: string): string {
  assertContext(context);

  const parts = payload.split('.');
  if (parts.length !== 4) {
    throw new Error('Malformed encrypted payload');
  }

  const [version, ivB64, tagB64, ciphertextB64] = parts;
  if (version !== CURRENT_VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('Malformed encrypted payload');
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAAD(Buffer.from(context, 'utf8'));
  decipher.setAuthTag(tag);

  // כישלון כאן משמעו מפתח שגוי או נתון שהשתנה — עדיף להיכשל מאשר להציג ערך חלקי
  return Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]).toString('utf8');
}

/** האם הערך נראה כטקסט מוצפן שלנו, לזיהוי נתונים שטרם עברו הצפנה */
export function isEncrypted(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 4 && parts[0] === CURRENT_VERSION;
}

export function encryptNumber(value: number | null | undefined, context: string): string | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) throw new Error(`Cannot encrypt non-finite number for ${context}`);
  return encryptField(String(value), context);
}

export function decryptNumber(payload: string | null | undefined, context: string): number | null {
  if (payload === null || payload === undefined) return null;
  const parsed = Number(decryptField(payload, context));
  if (!Number.isFinite(parsed)) throw new Error(`Decrypted value for ${context} is not a number`);
  return parsed;
}
