/**
 * חישוב כתובת הבסיס של ההתחברות, וממנה ה-Redirect URI שנשלח לגוגל.
 *
 * גוגל מחזירה `Error 400: redirect_uri_mismatch` כשה-URI שהשרת שולח אינו זהה,
 * תו בתו, לאחד שרשום ב-OAuth Client שב-Google Cloud Console. NextAuth בונה את
 * ה-URI הזה מכתובת הבסיס שהוא מזהה:
 *
 *   • ב-Vercel (או כש-AUTH_TRUST_HOST מוגדר) — מהכותרות של הבקשה עצמה,
 *     כלומר מהדומיין שממנו הגולש טוען את האתר. לכן דפלוי של Preview,
 *     או כניסה דרך www כשרשום הדומיין בלי www, מייצרים URI שלא רשום.
 *   • בכל סביבה אחרת — מ-NEXTAUTH_URL בדיוק כפי שהוא. מרכאות עוטפות, רווח,
 *     או http במקום https הופכים אותו לכתובת אחרת מזו שרשומה אצל גוגל.
 *
 * כאן מנקים את הערך פעם אחת, ומכאן גם שאר האפליקציה יודעת מהו ה-URI המדויק
 * שצריך להיות רשום — במקום לנחש.
 */

/** ערך ממשתנה סביבה, בלי רווחים ובלי מרכאות עוטפות. */
export function readEnv(name: string): string {
  return cleanEnvValue(process.env[name]);
}

/**
 * ניקוי ערך של משתנה סביבה. בקובץ `.env` המרכאות מוסרות על ידי dotenv, אבל
 * בממשק של ספקי האחסון הן נשמרות כחלק מהערך.
 */
export function cleanEnvValue(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  return value.replace(/^["']|["']$/g, "").trim();
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

/**
 * נרמול כתובת בסיס לצורה `protocol://host[:port]` — בלי סלאש בסוף, בלי הנתיב
 * `/api/auth` שלפעמים מודבק בטעות, ועם פרוטוקול גם כשנכתב רק הדומיין.
 * מחזיר null כשאין ערך שמיש.
 */
export function normalizeAuthUrl(raw: string | undefined | null): string | null {
  const value = cleanEnvValue(raw);
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value)
    ? value
    : `${LOCAL_HOSTS.has(value.split(":")[0]) ? "http" : "https"}://${value}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  if (!url.hostname) return null;

  return url.origin;
}

/**
 * הכתובת הרשמית של האתר — זו שממנה חייבת לצאת ההתחברות עם גוגל, וזו שה-URI
 * שלה רשום ב-Google Cloud Console.
 */
export function canonicalSiteOrigin(): string | null {
  const fromProductionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (
    normalizeAuthUrl(process.env.NEXTAUTH_URL) ??
    normalizeAuthUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeAuthUrl(process.env.APP_URL) ??
    normalizeAuthUrl(fromProductionDomain)
  );
}

/** ה-Redirect URI שגוגל חייבת להכיר, עבור כתובת בסיס נתונה. */
export function googleRedirectUri(origin: string): string {
  return `${origin}/api/auth/callback/google`;
}

/**
 * כתיבת הערך המנורמל חזרה ל-NEXTAUTH_URL, כדי ש-NextAuth עצמו יקבל כתובת
 * נקייה. נקרא פעם אחת בטעינת מודול ההתחברות, לפני שנשלחת בקשה כלשהי.
 */
export function applyNormalizedAuthUrl(): string | null {
  const normalized = normalizeAuthUrl(process.env.NEXTAUTH_URL);
  if (normalized) {
    process.env.NEXTAUTH_URL = normalized;
    if (process.env.NEXTAUTH_URL_INTERNAL) {
      const internal = normalizeAuthUrl(process.env.NEXTAUTH_URL_INTERNAL);
      if (internal) process.env.NEXTAUTH_URL_INTERNAL = internal;
    }
  }
  return normalized;
}

/** האם NextAuth יגזור את כתובת הבסיס מכותרות הבקשה במקום מ-NEXTAUTH_URL. */
export function trustsRequestHost(): boolean {
  return Boolean(process.env.VERCEL ?? process.env.AUTH_TRUST_HOST);
}

type HeaderLookup = { get(name: string): string | null };

/**
 * כתובת הבסיס שממנה NextAuth ייצר את ה-Redirect URI עבור הבקשה הזו — אותה
 * לוגיקה בדיוק כמו ב-`detectOrigin` של next-auth v4.
 */
export function runtimeOrigin(headers: HeaderLookup): string | null {
  if (trustsRequestHost()) {
    const host = headers.get("x-forwarded-host") ?? headers.get("host");
    if (!host) return null;
    const protocol = headers.get("x-forwarded-proto") === "http" ? "http" : "https";
    return normalizeAuthUrl(`${protocol}://${host}`);
  }
  // בלי NEXTAUTH_URL, next-auth נופל לברירת המחדל של פיתוח מקומי
  return normalizeAuthUrl(process.env.NEXTAUTH_URL) ?? "http://localhost:3000";
}
