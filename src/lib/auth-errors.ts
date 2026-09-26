/** הודעות שגיאה בעברית לשגיאות NextAuth / OAuth שחוזרות ב-query או מ-signIn. */
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
    case "CredentialsSignin":
      return "שם משתמש או סיסמה שגויים";
    case "EmailNotVerified":
      return "עוד לא אישרתם את כתובת המייל. פתחו את הקישור ששלחנו לכם כדי להשלים את ההרשמה.";
    case "NotAdvisor":
      return "הכניסה הזו מיועדת ליועצים הרשומים במערכת בלבד. לקוחות מתחברים בטופס שלמעלה.";
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
