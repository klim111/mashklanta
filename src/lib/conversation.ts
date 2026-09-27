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
  /** קבצים שצורפו להודעה */
  attachments: AttachmentView[];
}

/** קובץ מצורף כפי שהדפדפן רואה אותו — בלי שום נתיב אחסון */
export interface AttachmentView {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
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
  /**
   * מייל משולח שלא מוכר לשיחה — מוצג רק ללקוח, עם אישור השולח או מחיקה, ונכנס
   * לשיחה רק אחרי אישור
   */
  held: boolean;
  /** נמחק מהפיד ונמצא בארכיון המיילים */
  archived: boolean;
  attachments: EmailAttachmentView[];
}

/** קובץ שצורף למייל, כפי שנשמר עם המייל */
export interface StoredAttachment {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  /**
   * נתיב הקובץ בחנות הקבצים — לקובץ שצורף מהפלטפורמה. בלעדיו הקובץ נמצא אצל
   * ספק המיילים (מייל נכנס). לא נשלח לדפדפן
   */
  blob?: string;
}

export interface EmailAttachmentView extends AttachmentView {
  /** PDF או תמונה בגודל שהתיק מקבל — אפשר לשמור בתיק ולצפות בפלטפורמה */
  savable: boolean;
  /** התהליך שבתיק שלו הקובץ כבר נשמר */
  savedToPlanId: string | null;
}

/** מסמך מתיק המסמכים שאפשר לצרף למייל או להודעה */
export interface ConversationDocument {
  id: string;
  name: string;
  fileName: string;
  contentType: string;
  size: number;
  /** התהליך שבתיק שלו המסמך */
  planName: string;
}

/** תיק מסמכים שאפשר לשמור אליו — תהליך פתוח של הלקוח */
export interface AttachmentFolder {
  planId: string;
  name: string;
}

/**
 * BANKER — בנקאי (מהשלב של האישור העקרוני, או שנוסף ידנית), ADVISOR — היועץ
 * המלווה, CLIENT — הלקוח, CONTACT — איש מקצוע אחר שנוסף ידנית (עורך דין, שמאי…)
 */
export type ContactKind = 'BANKER' | 'ADVISOR' | 'CLIENT' | 'CONTACT';

/** נמען שאפשר לשלוח אליו מייל מהשיחה — רק אנשים שכבר קשורים לתהליך */
export interface ConversationContact {
  kind: ContactKind;
  email: string;
  name: string;
  /** לבנקאי — הבנק שהוא מטפל בבקשה בו */
  bank: string | null;
  /** התפקיד של נמען שנוסף ידנית (מפתח מ-`RECIPIENT_ROLES`) */
  role?: RecipientRole | null;
  /** המזהה של נמען שנוסף ידנית — כדי שאפשר יהיה להסיר אותו */
  recipientId?: string | null;
}

/** התפקידים שאפשר לבחור לנמען שמוסיפים מתיבת המיילים */
export const RECIPIENT_ROLES = {
  BANKER: 'בנקאי',
  ADVISOR: 'יועץ',
  LAWYER: 'עורך דין',
  APPRAISER: 'שמאי',
  INSURANCE: 'סוכן ביטוח',
  BROKER: 'מתווך',
  ACCOUNTANT: 'רואה חשבון',
  OTHER: 'אחר',
} as const;

export type RecipientRole = keyof typeof RECIPIENT_ROLES;

export function isRecipientRole(value: unknown): value is RecipientRole {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RECIPIENT_ROLES, value);
}

/** התווית של נמען: התפקיד שנבחר, או הסוג */
export function recipientRoleLabel(contact: ConversationContact): string {
  if (contact.role) return RECIPIENT_ROLES[contact.role];
  return contact.kind === 'BANKER' ? 'בנקאי' : contact.kind === 'ADVISOR' ? 'יועץ' : 'לקוח';
}

/** עד כמה נמענים אפשר להוסיף ידנית לשיחה אחת */
export const MAX_CUSTOM_RECIPIENTS = 30;

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

/** הקידומת של הכתובות הראשונות (c-<מפתח>@inbox…), שממשיכות לעבוד */
const LEGACY_MAILBOX_PREFIX = 'c-';

function cleanDomain(domain: string | null | undefined): string {
  return (domain || '').trim().toLowerCase().replace(/^@/, '');
}

/** רשימת דומיינים ממשתנה סביבה — מופרדים בפסיק או ברווח */
export function domainList(value: string | null | undefined): string[] {
  return (value || '')
    .split(/[\s,]+/)
    .map(cleanDomain)
    .filter(Boolean);
}

/**
 * הכתובת האישית של הלקוח, כשיש דומיין לקבלה: `igor.l@mashkalanta.com`, לפי
 * שם הכתובת ששמור ללקוח. גם המפתח הישן (`c-…`) עובר כאן, כשזה מה שיש.
 */
export function mailboxAddress(name: string | null, domain: string | null | undefined): string | null {
  const host = cleanDomain(domain);
  if (!name || !host) return null;
  return `${name}@${host}`;
}

/**
 * שמות שלא ניתנים ללקוחות — כתובות כלליות של משכלנתא, וכתובות שספקי מייל
 * ובנקים מצפים שיהיו של בעל הדומיין.
 */
const RESERVED_MAILBOX_NAMES = new Set([
  'abuse', 'accessibility', 'account', 'accounts', 'admin', 'administrator', 'advisor', 'advisors', 'billing',
  'bounce', 'bounces', 'client', 'clients', 'contact', 'daemon', 'dmarc', 'help', 'hello', 'hostmaster', 'info',
  'legal', 'mail', 'mailer-daemon', 'marketing', 'mashkalanta', 'news', 'newsletter', 'no-reply', 'noc',
  'noreply', 'office', 'payments', 'postmaster', 'privacy', 'root', 'sales', 'security', 'service', 'support',
  'system', 'team', 'webmaster', 'www',
]);

const MAILBOX_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,38}[a-z0-9])?$/;

export function isReservedMailboxName(name: string, systemAddress?: string | null): boolean {
  const own = (systemAddress || '').split('@')[0]?.toLowerCase();
  return RESERVED_MAILBOX_NAMES.has(name) || name === own || name.startsWith(LEGACY_MAILBOX_PREFIX);
}

/**
 * הבסיס לשם הכתובת האישית: שם המשתמש, או החלק שלפני ה-@ במייל, בלי תגית (+…),
 * באותיות קטנות ורק בתווים שמותרים בכתובת. שם שמור או ריק — `client`, ואז
 * נוסף לו מספר.
 */
export function mailboxNameBase(usernameOrEmail: string | null | undefined): string {
  const local = normalizeEmail(usernameOrEmail).split('@')[0].replace(/\+.*$/, '');
  const clean = local
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/[._-]{2,}/g, (run) => run[0])
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 30)
    .replace(/[._-]+$/, '')
    // c-… שמור לכתובות הישנות
    .replace(/^c-/, 'c');
  return clean || 'client';
}

/**
 * שמות לנסות לפי הסדר: הבסיס, ואז הבסיס עם מספר (igor2, igor3…). שם שמור
 * מתחיל ישר מהמספר.
 */
export function mailboxNameCandidates(email: string | null | undefined, systemAddress?: string | null, count = 20): string[] {
  const base = mailboxNameBase(email);
  const names: string[] = [];
  if (!isReservedMailboxName(base, systemAddress) && MAILBOX_NAME_PATTERN.test(base)) names.push(base);
  for (let index = 2; names.length < count; index++) names.push(`${base}${index}`);
  return names;
}

export interface MailboxTarget {
  /** השם בכתובת, כפי שנכתב (igor.l) */
  name: string;
  /** מפתח של כתובת ישנה (c-<מפתח>), כשהכתובת בפורמט הזה */
  legacyKey: string | null;
}

/**
 * מתוך הנמענים של מייל נכנס — הכתובות האישיות שהוא נשלח אליהן. נבדקות רק
 * כתובות בדומייני הקבלה, כדי שכתובת דומה בדומיין אחר לא תנותב לשיחה, ולא
 * כתובות כלליות (info@, hello@).
 */
export function mailboxTargets(
  addresses: readonly string[],
  domains: string | readonly string[] | null | undefined,
  systemAddress?: string | null
): MailboxTarget[] {
  const hosts = (Array.isArray(domains) ? domains : [domains]).map((item) => cleanDomain(item as string)).filter(Boolean);
  const targets: MailboxTarget[] = [];
  for (const raw of addresses) {
    const { email } = parseAddress(raw);
    const at = email.lastIndexOf('@');
    if (at < 0 || !hosts.includes(email.slice(at + 1))) continue;
    const name = email.slice(0, at).replace(/\+.*$/, '');
    const legacy = name.startsWith(LEGACY_MAILBOX_PREFIX) ? name.slice(LEGACY_MAILBOX_PREFIX.length) : '';
    const legacyKey = /^[a-z0-9]{16,64}$/.test(legacy) ? legacy : null;
    if (!legacyKey && (!MAILBOX_NAME_PATTERN.test(name) || isReservedMailboxName(name, systemAddress))) continue;
    if (!targets.some((item) => item.name === name)) targets.push({ name, legacyKey });
  }
  return targets;
}

/** האם אחת הכתובות היא בדומייני הקבלה — מייל לכתובת כללית (info@) ולא ללקוח */
export function addressedToDomains(
  addresses: readonly string[],
  domains: readonly string[]
): string | null {
  for (const raw of addresses) {
    const { email } = parseAddress(raw);
    const host = email.slice(email.lastIndexOf('@') + 1);
    if (email.includes('@') && domains.includes(host)) return email;
  }
  return null;
}

/** ספקי מייל פרטיים — כתובת בנקאי ב-gmail לא פותחת את כל gmail */
const PERSONAL_MAIL_DOMAINS = new Set([
  '012.net.il', 'aol.com', 'bezeqint.net', 'gmail.com', 'gmx.com', 'googlemail.com', 'hotmail.com', 'icloud.com',
  'live.com', 'mail.ru', 'me.com', 'msn.com', 'netvision.net.il', 'outlook.com', 'proton.me', 'protonmail.com',
  'walla.co.il', 'walla.com', 'yahoo.com', 'yandex.ru', 'zahav.net.il',
]);

/**
 * האם מייל נכנס לכתובת האישית נכנס ישר לשיחה: מהלקוח, מהיועץ, מבנקאי שהוזן
 * (או מכתובת אחרת באותו בנק), ממי שכבר קיבל מייל מהשיחה, או משולח שהלקוח כבר
 * אישר. כל השאר ממתין לאישור הלקוח — כך מי שמנחש כתובת לא מכניס מיילים לשיחה.
 */
export function senderAllowed(
  sender: string,
  contacts: readonly ConversationContact[],
  correspondents: ReadonlySet<string>
): boolean {
  const { email } = parseAddress(sender);
  if (!isValidEmail(email)) return false;
  if (correspondents.has(email) || contacts.some((contact) => contact.email === email)) return true;
  const host = email.slice(email.lastIndexOf('@') + 1);
  return (
    !PERSONAL_MAIL_DOMAINS.has(host) &&
    contacts.some((contact) => contact.kind === 'BANKER' && contact.email.endsWith(`@${host}`))
  );
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
    /^בתאריך .+(כתב|כתבה|נכתב|מאת).*:\s*$/,
    /^-{2,}\s*Original Message\s*-{2,}/i,
    /^-{2,}\s*הודעה מקורית\s*-{2,}/,
    /^From: .+/i,
    /^מאת: .+/,
  ];
  // ג'ימייל בעברית עוטף את שורת הציטוט בתווי כיווניות, שמסתירים ממנה את ההתחלה
  const plain = (line: string) => line.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim();
  const cut = lines.findIndex((line) => markers.some((pattern) => pattern.test(plain(line))));
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
    .filter((contact) => (contact.kind === 'CLIENT' || contact.kind === 'ADVISOR') && !inTo.has(contact.email))
    .map((contact) => contact.email);
}

/** הבנק שמייל שייך אליו, לפי הבנקאים שבין הכתובות */
export function bankFor(addresses: readonly string[], contacts: readonly ConversationContact[]): string | null {
  const emails = new Set(addresses.map((raw) => parseAddress(raw).email));
  return contacts.find((contact) => contact.kind === 'BANKER' && emails.has(contact.email))?.bank ?? null;
}

/**
 * הקבצים המצורפים של מייל נכנס, בלי התמונות שמשובצות בגוף המייל (חתימות,
 * לוגו) — אלה חלק מהעיצוב של המייל ולא מסמך שנשלח.
 */
export function inboundAttachments(
  list: readonly {
    id: string;
    filename: string | null;
    size: number;
    content_type: string;
    content_id: string | null;
    content_disposition: string | null;
  }[]
): StoredAttachment[] {
  return list
    .filter((item) => !(item.content_disposition === 'inline' && item.content_id && item.content_type.startsWith('image/')))
    .map((item) => ({
      id: item.id,
      fileName: (item.filename || '').replace(/[\r\n"\\/]/g, ' ').trim() || 'קובץ מצורף',
      contentType: (item.content_type || 'application/octet-stream').split(';')[0].trim().toLowerCase(),
      size: Math.max(0, item.size || 0),
    }));
}

/** הקבצים שנשמרו עם המייל, מתוך עמודת ה-JSON — מה שלא בצורה הנכונה מדולג */
export function storedAttachments(value: unknown): StoredAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = item as Partial<StoredAttachment> | null;
    if (!row || typeof row.id !== 'string' || typeof row.fileName !== 'string') return [];
    return [
      {
        id: row.id,
        fileName: row.fileName,
        contentType: typeof row.contentType === 'string' ? row.contentType : 'application/octet-stream',
        size: typeof row.size === 'number' ? row.size : 0,
        ...(typeof row.blob === 'string' && row.blob ? { blob: row.blob } : {}),
      },
    ];
  });
}

/** הקובץ בלי נתיב האחסון שלו — מה שמותר להגיע לדפדפן */
export function attachmentView(item: StoredAttachment): AttachmentView {
  return { id: item.id, fileName: item.fileName, contentType: item.contentType, size: item.size };
}

/** קבצים שהמשתמש מצרף למייל או להודעה: עד 5 */
export const MAX_OUTGOING_FILES = 5;

/**
 * קובץ שמצרפים בשליחה: קובץ שהדפדפן העלה עכשיו לאחסון (`upload`, עם הנתיב
 * שקיבל), או מסמך מתיק המסמכים (`document`).
 */
export type OutgoingFileRef =
  | { kind: 'upload'; pathname: string; fileName: string }
  | { kind: 'document'; documentId: string };

export function parseOutgoingFiles(value: unknown): OutgoingFileRef[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_OUTGOING_FILES) return null;
  const refs: OutgoingFileRef[] = [];
  for (const item of value) {
    const row = item as Record<string, unknown> | null;
    if (row?.kind === 'upload' && typeof row.pathname === 'string' && typeof row.fileName === 'string') {
      refs.push({ kind: 'upload', pathname: row.pathname, fileName: row.fileName.replace(/[\r\n"\\/]/g, '').slice(0, 120) || 'file' });
    } else if (row?.kind === 'document' && typeof row.documentId === 'string') {
      refs.push({ kind: 'document', documentId: row.documentId });
    } else {
      return null;
    }
  }
  return refs;
}

/** התחילית בחנות הקבצים של קבצים שצורפו בהתכתבות של לקוח */
export function conversationFilePrefix(clientUserId: string): string {
  return `conversation/${clientUserId}/`;
}

/**
 * קובץ גדול מזה לא עובר דרך השרת (לפונקציה ב-Vercel יש מגבלה על גודל
 * התשובה), ולכן נפתח ישר מהקישור הזמני של ספק המיילים ולא בתצוגה המקדימה
 */
export const MAX_STREAMED_ATTACHMENT_BYTES = 4 * 1024 * 1024;

/** המפתח של קובץ מצורף בתיק המסמכים — אותו קובץ נשמר פעם אחת בכל תהליך */
export function attachmentDocumentKey(attachmentId: string): string {
  return `email:${attachmentId}`;
}
