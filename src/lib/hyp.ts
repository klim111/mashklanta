/**
 * חיבור למסוף הסליקה של משכלנתא ב-HYP (https://developers.hyp.co.il/pay).
 *
 * הלקוח משלם בעמוד התשלום המאובטח של HYP, ופרטי הכרטיס לא עוברים דרכנו בכלל:
 * 1. השרת מבקש מ-HYP חתימה על פרטי העסקה (`action=APISign&What=SIGN`), ומקבל
 *    בחזרה את הפרמטרים החתומים של עמוד התשלום.
 * 2. הלקוח עובר לעמוד התשלום עם הפרמטרים האלה ומשלם שם.
 * 3. HYP מחזירה את הלקוח לדף ההצלחה או הכישלון שמוגדרים במסוף, עם תוצאת
 *    העסקה בכתובת. לפני שנרשם תשלום, השרת מוודא מול HYP שהחתימה על התוצאה
 *    אמיתית (`action=APISign&What=VERIFY`) — בלי זה כל אחד יכול היה לזייף
 *    כתובת חזרה עם `CCode=0`.
 *
 * פרטי המסוף נקראים ממשתני סביבה בלבד (HYP_MASOF, HYP_API_KEY, HYP_PASSP) ולא
 * נכתבים ללוג. החלק הטהור של הקובץ (בניית הפרמטרים וקריאת התשובה) נבדק
 * בבדיקות יחידה.
 */

export const HYP_PAY_URL = 'https://pay.hyp.co.il/p/';

/** בפיתוח מקומי אפשר להפנות לשרת HYP מדומה; בייצור תמיד HYP האמיתית */
function payUrl(): string {
  const override = process.env.NODE_ENV !== 'production' ? process.env.HYP_PAY_URL_DEV : undefined;
  return override || HYP_PAY_URL;
}

/** קוד התשובה של HYP לעסקה שאושרה */
export const HYP_APPROVED = '0';

export interface HypConfig {
  masof: string;
  apiKey: string;
  passP: string;
  /** האם לבקש מ-HYP להפיק חשבונית לכל תשלום (מודול החשבוניות של המסוף) */
  sendInvoice: boolean;
}

export function hypConfig(env: Record<string, string | undefined> = process.env): HypConfig | null {
  const masof = env.HYP_MASOF?.trim();
  const apiKey = env.HYP_API_KEY?.trim();
  const passP = env.HYP_PASSP?.trim();
  if (!masof || !apiKey || !passP) return null;
  return { masof, apiKey, passP, sendInvoice: env.HYP_SEND_INVOICE?.trim().toLowerCase() !== 'false' };
}

export interface HypPaymentRequest {
  /** מספר ההזמנה שלנו — חוזר מ-HYP ומזהה את המעבר לתשלום */
  order: string;
  /** הסכום בשקלים */
  amount: number;
  /** תיאור העסקה, כפי שיופיע בעמוד התשלום ובחשבונית */
  description: string;
  clientName: string;
  email: string;
  phone?: string | null;
}

/**
 * HYP מחזירה חלק מהשדות בכתובת החזרה בלי קידוד, ולכן תווים שמפרקים כתובת
 * מוחלפים ברווח. התווים `[`, `]` ו-`~` שמורים לשורות החשבונית.
 */
export function hypText(value: string, max = 120): string {
  return value
    .replace(/[#&?=%+[\]~"<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** שם פרטי ושם משפחה, כפי ש-HYP מבקשת אותם */
export function splitName(full: string): { first: string; last: string } {
  const parts = hypText(full, 80).split(' ').filter(Boolean);
  if (parts.length === 0) return { first: 'לקוח', last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

/** שורת פריט לחשבונית: [מק"ט~תיאור~כמות~מחיר ליחידה] */
export function invoiceLine(description: string, amount: number): string {
  return `[0~${hypText(description, 60)}~1~${amount.toFixed(2)}]`;
}

/** הפרמטרים לבקשת החתימה על עמוד התשלום */
export function signParams(config: HypConfig, request: HypPaymentRequest): URLSearchParams {
  const { first, last } = splitName(request.clientName);
  const params = new URLSearchParams({
    action: 'APISign',
    What: 'SIGN',
    KEY: config.apiKey,
    PassP: config.passP,
    Masof: config.masof,
    Order: hypText(request.order, 40),
    Info: hypText(request.description),
    Amount: request.amount.toFixed(2),
    // שקלים, תשלום אחד, עמוד בעברית
    Coin: '1',
    Tash: '1',
    FixTash: 'True',
    PageLang: 'HEB',
    UTF8: 'True',
    UTF8out: 'True',
    // HYP חותמת על התוצאה, כדי שנוכל לאמת אותה (VERIFY)
    Sign: 'True',
    MoreData: 'True',
    // תעודת זהות לא נאספת — הלקוח ממלא אותה בעמוד של HYP אם המסוף דורש
    UserId: '000000000',
    ClientName: first,
    ClientLName: last,
    email: request.email.trim(),
    tmp: '1',
  });
  if (request.phone) params.set('cell', request.phone.replace(/\D+/g, ''));
  if (config.sendInvoice) {
    // HYP מפיקה חשבונית מס/קבלה ושולחת אותה ללקוח במייל
    params.set('SendHesh', 'True');
    params.set('sendemail', 'True');
    params.set('Pritim', 'True');
    params.set('heshDesc', invoiceLine(request.description, request.amount));
  }
  return params;
}

/**
 * תשובת HYP לבקשת החתימה היא מחרוזת פרמטרים לעמוד התשלום. תשובה בלי
 * `signature` היא שגיאה (למשל `CCode=901` — פרטי מסוף שגויים).
 */
export function paymentPageUrl(signResponse: string): string | null {
  const body = signResponse.trim().replace(/^\?/, '');
  const params = new URLSearchParams(body);
  if (!params.get('signature') || params.get('action') !== 'pay') return null;
  return `${payUrl()}?${body}`;
}

/** התוצאה כפי שהיא חוזרת מעמוד התשלום */
export interface HypReturn {
  order: string;
  transactionId: string;
  code: string;
  amount: number;
  /** מספר החשבונית שהופקה, כשהמסוף מפיק חשבוניות */
  invoiceNumber: string | null;
  last4: string;
  brand: string;
}

/** HYP מחזירה את שמות השדות לפעמים באותיות שונות — מחפשים בלי תלות בגודל */
function pick(params: URLSearchParams, name: string): string {
  const lower = name.toLowerCase();
  for (const [key, value] of params) {
    if (key.toLowerCase() === lower) return value;
  }
  return '';
}

/** קודי המותג של HYP (`Brand`) */
const BRANDS: Record<string, string> = {
  '1': 'mastercard',
  '2': 'visa',
  '3': 'maestro',
  '5': 'isracard',
  '6': 'diners',
  '7': 'amex',
};

export function parseReturn(params: URLSearchParams): HypReturn {
  const hesh = pick(params, 'Hesh').trim();
  return {
    order: pick(params, 'Order'),
    transactionId: pick(params, 'Id'),
    code: pick(params, 'CCode'),
    amount: Number(pick(params, 'Amount')),
    invoiceNumber: hesh && hesh !== '0' ? hesh : null,
    last4: pick(params, 'L4digit').replace(/\D+/g, '').slice(-4),
    brand: BRANDS[pick(params, 'Brand')] ?? 'unknown',
  };
}

/**
 * הפרמטרים לאימות התוצאה: כל מה ש-HYP החזירה, כמו שהוא, ועוד פרטי המסוף.
 * שדות שאנחנו מוסיפים בעצמנו מוחלפים, כדי שהכתובת לא תוכל לדרוס אותם.
 */
export function verifyParams(config: HypConfig, returned: URLSearchParams): URLSearchParams {
  const reserved = new Set(['action', 'what', 'key', 'passp', 'masof']);
  const params = new URLSearchParams({
    action: 'APISign',
    What: 'VERIFY',
    KEY: config.apiKey,
    PassP: config.passP,
    Masof: config.masof,
  });
  for (const [key, value] of returned) {
    if (!reserved.has(key.toLowerCase())) params.append(key, value);
  }
  return params;
}

/** תשובת האימות: `CCode=0` — החתימה אמיתית. כל דבר אחר (למשל 902) — לא */
export function verifyResponseOk(body: string): boolean {
  return new URLSearchParams(body.trim().replace(/^\?/, '')).get('CCode') === HYP_APPROVED;
}

async function hypGet(params: URLSearchParams): Promise<string> {
  const response = await fetch(`${payUrl()}?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HYP responded ${response.status}`);
  return response.text();
}

/** הכתובת של עמוד התשלום לעסקה, או שגיאה כש-HYP סירבה לחתום */
export async function createPaymentPage(config: HypConfig, request: HypPaymentRequest): Promise<string> {
  const body = await hypGet(signParams(config, request));
  const url = paymentPageUrl(body);
  if (!url) {
    const code = new URLSearchParams(body.trim()).get('CCode') ?? 'unknown';
    throw new Error(`HYP refused to sign the payment page (CCode=${code})`);
  }
  return url;
}

/** האם התוצאה שחזרה מעמוד התשלום נחתמה באמת על ידי HYP */
export async function verifyReturn(config: HypConfig, returned: URLSearchParams): Promise<boolean> {
  if (!pick(returned, 'Sign')) return false;
  return verifyResponseOk(await hypGet(verifyParams(config, returned)));
}
