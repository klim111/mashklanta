/** הודעות שגיאה בעברית לשגיאות NextAuth / OAuth שחוזרות ב-query. */
export function authErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "OAuthSignin":
    case "OAuthCallback":
      return "ההתחברות עם Google נכשלה. בדקו שמפתחות Google מוגדרים ושה-Redirect URI נכון.";
    case "OAuthCreateAccount":
    case "Callback":
      return "לא ניתן ליצור חשבון מ-Google. נסו שוב או הירשמו עם מייל.";
    case "OAuthAccountNotLinked":
      return "המייל הזה כבר רשום אצלנו בדרך אחרת. התחברו עם סיסמה, או פנו לתמיכה לקישור החשבון.";
    case "AccessDenied":
      return "הגישה נדחתה. יש לאשר את ההרשאות בחלון של Google.";
    case "Configuration":
      return "התחברות עם Google עדיין לא הוגדרה בשרת. חסרים מפתחות OAuth.";
    case "Verification":
      return "פג תוקף הקישור. נסו להתחבר שוב.";
    default:
      return code ? "אירעה שגיאה בהתחברות. נסו שוב." : "";
  }
}
