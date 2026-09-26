/**
 * ההתכתבות בין הלקוח ליועץ — הצ'אט וטאב המיילים.
 *
 * לכל לקוח שיחה אחת, מזוהה בחשבון שלו. הצ'אט הוא בין הלקוח ליועץ בלבד;
 * טאב המיילים מרכז את המיילים שנשלחו מהפלטפורמה לבנקאי ולשני הצדדים, ואת
 * מה שחזר לכתובת האישית של הלקוח.
 *
 * הקובץ הזה טהור — בלי מסד ובלי רשת — כדי שאפשר יהיה לבדוק אותו.
 */

export type ConversationRole = 'CLIENT' | 'ADVISOR';

export interface ChatMessageView {
  id: string;
  authorRole: ConversationRole;
  authorName: string | null;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface ConversationEmailView {
  id: string;
  direction: 'OUTBOUND' | 'INBOUND';
  senderRole: ConversationRole | null;
  fromAddress: string;
  fromName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  text: string;
  bank: string | null;
  createdAt: string;
  /** מייל נכנס שהצד שמסתכל עדיין לא פתח */
  unread: boolean;
}

export type ContactKind = 'BANKER' | 'ADVISOR' | 'CLIENT';

/** נמען שאפשר לשלוח אליו מייל מהשיחה — רק אנשים שכבר קשורים לתהליך */
export interface ConversationContact {
  kind: ContactKind;
  email: string;
  name: string;
  /** לבנקאי — הבנק שהוא מטפל בבקשה בו */
  bank: string | null;
}

export interface ConversationSummary {
  unreadChat: number;
  unreadEmails: number;
  /** היועץ המלווה, כשכבר שויך */
  advisorName: string | null;
  /**
   * הכתובת האישית שמקבלת מיילים לשיחה. ריקה כל עוד קבלת מיילים לא הוגדרה
   * בשרת — ואז רק שליחה עובדת
   */
  mailboxAddress: string | null;
  /** קבלת מיילים מוגדרת — תשובה למייל שנשלח מכאן חוזרת לשיחה */
  receivesEmail: boolean;
}

/** שורה בתיבת ההודעות של היועץ: לקוח אחד והשיחה שלו */
export interface AdvisorInboxRow {
  clientUserId: string;
  clientId: string | null;
  name: string;
  email: string | null;
  /** הלקוח עדיין לא שויך ליועץ — כל יועץ רואה את השיחה */
  unassigned: boolean;
  lastAt: string | null;
  lastPreview: string | null;
  unreadChat: number;
  unreadEmails: number;
}

export const MAX_CHAT_LENGTH = 4000;
export const MAX_EMAIL_LENGTH = 20000;
export const MAX_SUBJECT_LENGTH = 200;

const EMAIL_PATTERN = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

/**
 * פירוק כתובת בפורמט `שם <mail@x.com>` או `mail@x.com` לשם ולכתובת.
 */
export function parseAddress(raw: string): { name: string | null; email: string } {
  const value = raw.trim();
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim();
    return { name: name || null, email: normalizeEmail(match[2]) };
  }
  return { name: null, email: normalizeEmail(value) };
}

/** הכתובת בלבד מתוך `EMAIL_FROM`, שיכול להכיל גם שם תצוגה */
export function senderAddress(emailFrom: string | undefined | null): string {
  const parsed = parseAddress(emailFrom || '');
  return isValidEmail(parsed.email) ? parsed.email : 'noreply@mashkalanta.co.il';
}

/**
 * שם התצוגה של השולח. המייל יוצא מהדומיין של הפלטפורמה (רק הוא מאומת לשליחה),
 * ולכן השם מבהיר מי כתב אותו בפועל.
 */
export function senderDisplayName(name: string | null, role: ConversationRole, appName: string): string {
  const clean = (name || '').replace(/["<>\r\n]/g, '').trim();
  if (!clean) return role === 'ADVISOR' ? `יועץ ${appName}` : appName;
  return `${clean} באמצעות ${appName}`;
}

const MAILBOX_PREFIX = 'c-';

/** הכתובת האישית של הלקוח לקבלת מיילים, כשיש דומיין לקבלה */
export function mailboxAddress(key: string | null, domain: string | null | undefined): string | null {
  const host = (domain || '').trim().toLowerCase().replace(/^@/, '');
  if (!key || !host) return null;
  return `${MAILBOX_PREFIX}${key}@${host}`;
}

/**
 * מתוך רשימת הנמענים של מייל נכנס — המפתח של הלקוח שהמייל שייך אליו. נבדקות
 * רק כתובות בדומיין הקבלה, כדי שכתובת דומה בדומיין אחר לא תנותב לשיחה.
 */
export function mailboxKeyFromAddresses(
  addresses: readonly string[],
  domain: string | null | undefined
): string | null {
  const host = (domain || '').trim().toLowerCase().replace(/^@/, '');
  if (!host) return null;
  for (const raw of addresses) {
    const { email } = parseAddress(raw);
    const at = email.lastIndexOf('@');
    if (at < 0 || email.slice(at + 1) !== host) continue;
    const local = email.slice(0, at);
    if (!local.startsWith(MAILBOX_PREFIX)) continue;
    const key = local.slice(MAILBOX_PREFIX.length).replace(/\+.*$/, '');
    if (/^[a-z0-9]{16,64}$/.test(key)) return key;
  }
  return null;
}

/** בריחה של טקסט לפני שהוא נכנס ל-HTML של מייל */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** גוף מייל יוצא: הטקסט שהוקלד, מימין לשמאל, עם שורה שמסבירה מאיפה הוא נשלח */
export function emailHtml(text: string, footer: string): string {
  const body = escapeHtml(text).replace(/\r?\n/g, '<br>');
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:16px;font-family:Assistant,Arial,sans-serif;direction:rtl;color:#0f172a;font-size:15px;line-height:1.7;">
  <div>${body}</div>
  <p style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;">${escapeHtml(footer)}</p>
</body>
</html>`;
}

/** טקסט מתוך HTML, כשמייל נכנס הגיע בלי גרסת טקסט */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * התשובה עצמה, בלי ההיסטוריה המצוטטת שתוכנות מייל מוסיפות מתחת לה. השיחה
 * כבר מציגה את המיילים הקודמים, ולכן הציטוט רק מאריך כל תשובה.
 */
export function trimQuotedReply(text: string): string {
  // מייל שהלקוח העביר — המייל המועבר הוא התוכן עצמו, ואין מה לחתוך
  if (/Forwarded message|הודעה שהועברה|הודעה מועברת|^Fwd?:/im.test(text)) return text.trim();
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const markers = [
    /^On .+ wrote:\s*$/i,
    /^בתאריך .+(כתב|כתבה|נכתב).*:\s*$/,
    /^-{2,}\s*Original Message\s*-{2,}/i,
    /^-{2,}\s*הודעה מקורית\s*-{2,}/,
    /^From: .+/i,
    /^מאת: .+/,
  ];
  const cut = lines.findIndex((line) => markers.some((pattern) => pattern.test(line.trim())));
  const kept = (cut > 0 ? lines.slice(0, cut) : lines).filter((line) => !line.startsWith('>'));
  const result = kept.join('\n').trim();
  return result || text.trim();
}

/** נושא מייל: בלי שורות חדשות (הזרקת כותרות) ובאורך סביר */
export function cleanSubject(value: unknown): string {
  return (typeof value === 'string' ? value : '').replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_SUBJECT_LENGTH);
}

/** הבנקאים שהלקוח הזין בשלב האישור העקרוני, בלי כפילויות */
export function bankerContacts(
  approvals: readonly { bank: string; bankerName?: string; bankerEmail?: string }[]
): ConversationContact[] {
  const seen = new Set<string>();
  const result: ConversationContact[] = [];
  for (const row of approvals) {
    const email = normalizeEmail(row.bankerEmail);
    if (!isValidEmail(email) || seen.has(email)) continue;
    seen.add(email);
    result.push({
      kind: 'BANKER',
      email,
      name: row.bankerName?.trim() || `הבנקאי ב${row.bank}`,
      bank: row.bank,
    });
  }
  return result;
}

/**
 * הנמענים שמותר לשלוח אליהם מהשיחה. הפלטפורמה אינה שולחת לכל כתובת שהוקלדה —
 * רק לבנקאי שהלקוח הזין, ליועץ המלווה וללקוח עצמו — כדי שלא תשמש לשליחת
 * מיילים לזרים בשם הדומיין שלה.
 */
export function allowedRecipients(
  requested: readonly string[],
  contacts: readonly ConversationContact[]
): { recipients: ConversationContact[]; rejected: string[] } {
  const byEmail = new Map(contacts.map((contact) => [contact.email, contact]));
  const recipients: ConversationContact[] = [];
  const rejected: string[] = [];
  for (const raw of requested) {
    const email = normalizeEmail(raw);
    const contact = byEmail.get(email);
    if (contact) {
      if (!recipients.some((item) => item.email === email)) recipients.push(contact);
    } else if (email) rejected.push(email);
  }
  return { recipients, rejected };
}

/**
 * מי מקבל העתק: הלקוח והיועץ תמיד נשארים בתמונה — מי שאינו בין הנמענים מקבל
 * העתק. כך הבנק רואה בשרשור את המייל שהלקוח נרשם איתו.
 */
export function carbonCopies(
  to: readonly ConversationContact[],
  contacts: readonly ConversationContact[]
): string[] {
  const inTo = new Set(to.map((item) => item.email));
  return contacts
    .filter((contact) => contact.kind !== 'BANKER' && !inTo.has(contact.email))
    .map((contact) => contact.email);
}

/** הבנק שמייל שייך אליו, לפי הבנקאים שבין הכתובות */
export function bankFor(addresses: readonly string[], contacts: readonly ConversationContact[]): string | null {
  const emails = new Set(addresses.map((raw) => parseAddress(raw).email));
  return contacts.find((contact) => contact.kind === 'BANKER' && emails.has(contact.email))?.bank ?? null;
}
