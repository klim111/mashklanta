import { canonicalSiteOrigin, googleRedirectUri, readEnv, runtimeOrigin, trustsRequestHost } from "@/lib/auth-url";

/** מפתחות ה-OAuth של גוגל, מנוקים ממרכאות עוטפות ומרווחים. */
export const googleClientId = readEnv("GOOGLE_CLIENT_ID");
export const googleClientSecret = readEnv("GOOGLE_CLIENT_SECRET");

/**
 * הפרובידר של גוגל נרשם רק כששני המפתחות קיימים באמת בזמן ריצה. כשהם מוגדרים
 * רק לחלק מהסביבות אצל ספק האחסון, הם פשוט לא יגיעו לדפלוי הזה — ולכן המסך
 * מדווח על כך במפורש במקום להציג כפתור שנכשל.
 */
export const googleConfigured = Boolean(
  googleClientId &&
    googleClientSecret &&
    !googleClientId.includes("your-google") &&
    !googleClientSecret.includes("your-google")
);

export type GoogleOAuthStatus = {
  configured: boolean;
  /** הכתובת הרשמית של האתר, זו שה-Redirect URI שלה אמור להיות רשום בגוגל */
  canonicalOrigin: string | null;
  /** הכתובת שממנה נטענה הבקשה הנוכחית */
  requestOrigin: string | null;
  /** ה-URI שיישלח לגוגל אם ההתחברות תתחיל מהכתובת הזו */
  redirectUri: string | null;
  /** ה-URI שאמור להיות רשום ב-Google Cloud Console */
  expectedRedirectUri: string | null;
  /** false כשההתחברות מהכתובת הזו תיפול על redirect_uri_mismatch */
  originMatches: boolean;
  /** האם כתובת הבסיס נגזרת מכותרות הבקשה (Vercel) או מ-NEXTAUTH_URL */
  originSource: "request-host" | "NEXTAUTH_URL";
  /** כל ה-URI שכדאי לרשום ב-Google Cloud Console */
  redirectUrisToRegister: string[];
};

type HeaderLookup = { get(name: string): string | null };

/**
 * תמונת מצב של הגדרת ההתחברות עם גוגל עבור הבקשה הנוכחית.
 *
 * `redirect_uri_mismatch` נובע תמיד מפער בין ה-URI שהשרת שולח לבין הרשומים
 * בגוגל, ולכן שני הערכים מחושבים כאן במפורש — כדי שהלקוח יוכל להעביר את הגולש
 * לכתובת הנכונה, ושמי שמגדיר את השרת יראה בדיוק מה לרשום.
 */
export function googleOAuthStatus(headers: HeaderLookup): GoogleOAuthStatus {
  const canonicalOrigin = canonicalSiteOrigin();
  const requestOrigin = runtimeOrigin(headers);

  const redirectUri = requestOrigin ? googleRedirectUri(requestOrigin) : null;
  const expectedRedirectUri = canonicalOrigin ? googleRedirectUri(canonicalOrigin) : redirectUri;

  const redirectUrisToRegister = Array.from(
    new Set([expectedRedirectUri, redirectUri].filter((uri): uri is string => Boolean(uri)))
  );

  return {
    configured: googleConfigured,
    canonicalOrigin,
    requestOrigin,
    redirectUri,
    expectedRedirectUri,
    originMatches: Boolean(canonicalOrigin && requestOrigin && canonicalOrigin === requestOrigin),
    originSource: trustsRequestHost() ? "request-host" : "NEXTAUTH_URL",
    redirectUrisToRegister,
  };
}
