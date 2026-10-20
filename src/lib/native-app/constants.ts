/**
 * הגדרות האפליקציה לנייד (Capacitor) שמשותפות לאתר ולשרת.
 * חלק מהן מופיע גם ב-capacitor.config.ts ובקבצי הפרויקטים ב-mobile/ — שינוי כאן
 * מחייב שינוי גם שם.
 */

/** מזהה האפליקציה בחנויות, וגם ה-scheme של הקישורים שחוזרים אליה */
export const APP_ID = 'com.mashkalanta.app';
export const APP_URL_SCHEME = APP_ID;

/** הקישור שמחזיר את הכניסה עם Google מהדפדפן לאפליקציה */
export const APP_AUTH_CALLBACK = `${APP_URL_SCHEME}://auth/callback`;

/**
 * אתרים חיצוניים שנפתחים בתוך האפליקציה ולא בדפדפן, כי הם חוזרים לאתר
 * בסוף התהליך: עמוד התשלום של HYP.
 */
export const IN_APP_HOSTS = ['pay.hyp.co.il'];

/** המפתח שבו נשמר הסוד של הכניסה עם Google עד שהקוד חוזר מהדפדפן */
export const HANDOFF_VERIFIER_KEY = 'mashkalanta.appHandoffVerifier';
