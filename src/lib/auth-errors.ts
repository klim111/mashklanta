import { SITE_CONTACT } from "./site-contact";

/** "בטלפון 050-882-2207 או במייל info@mashkalanta.com" — לכל הודעה שמפנה לתמיכה */
export const SUPPORT_CONTACT_TEXT = `בטלפון ${SITE_CONTACT.phone} או במייל ${SITE_CONTACT.email}`;

/** כשההתחברות עם Google אינה זמינה כרגע — בלי פרטים טכניים, עם דרך להמשיך */
export const GOOGLE_UNAVAILABLE_MESSAGE = `ההתחברות עם Google אינה זמינה כרגע. אפשר להתחבר עם מייל וסיסמה, או לפנות אלינו ${SUPPORT_CONTACT_TEXT}.`;

/** הודעות שגיאה בעברית לשגיאות NextAuth / OAuth שחוזרות ב-query או מ-signIn. */
export function authErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "OAuthSignin":
    case "OAuthCallback":
      return `ההתחברות עם Google נכשלה. נסו שוב, התחברו עם מייל וסיסמה, או פנו אלינו ${SUPPORT_CONTACT_TEXT}.`;
    case "OAuthCreateAccount":
    case "Callback":
      return "לא ניתן ליצור חשבון מ-Google. נסו שוב או הירשמו עם מייל.";
    case "OAuthAccountNotLinked":
      return `המייל הזה כבר רשום אצלנו בדרך אחרת. התחברו עם סיסמה, או פנו אלינו ${SUPPORT_CONTACT_TEXT} לקישור החשבון.`;
    case "AccessDenied":
      return "הגישה נדחתה. יש לאשר את ההרשאות בחלון של Google.";
    case "Configuration":
      return GOOGLE_UNAVAILABLE_MESSAGE;
    case "Verification":
      return "פג תוקף הקישור. נסו להתחבר שוב.";
    case "CredentialsSignin":
      return "המייל או הסיסמה שגויים";
    case "EmailNotVerified":
      return "עוד לא אישרתם את כתובת המייל. פתחו את הקישור ששלחנו לכם כדי להשלים את ההרשמה.";
    case "GoogleNotAllowed":
      return "אי אפשר להתחבר לחשבון הזה עם Google.";
    case "AdvisorLinkInvalid":
      return "הקישור אינו תקף. ייתכן שכבר השתמשת בו, או שנשלח קישור חדש יותר.";
    case "AdvisorLinkExpired":
      return "פג תוקף הקישור. בקש קישור חדש.";
    case "AdvisorLinkOtherBrowser":
      return "הקישור עובד רק בדפדפן שבו ביקשת אותו. פתח אותו שם, או בקש קישור חדש מהדפדפן הזה.";
    case "GoogleEmailUnverified":
      return "Google לא אישרה את כתובת המייל של החשבון הזה, ולכן אי אפשר להתחבר איתו.";
    case "VerificationInvalid":
      return "הקישור אינו תקף. ייתכן שכבר השתמשתם בו, או שנשלח קישור חדש יותר.";
    case "VerificationExpired":
      return "פג תוקף הקישור. אפשר לשלוח קישור חדש.";
    case "VerificationPasswordRequired":
      return "הסיסמה אינה תואמת לזו שנבחרה בהרשמה.";
    case "VerificationAccountExists":
      return "כבר קיים חשבון עם המייל הזה. אפשר להתחבר אליו.";
    default:
      return code ? "אירעה שגיאה בהתחברות. נסו שוב." : "";
  }
}
