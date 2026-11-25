'use client';

/**
 * מה שאורח הזין בכלים החינמיים נשמר בדפדפן רק לזמן קצר.
 *
 * הדפדפן שומר את הנתונים מספיק זמן כדי לעבור בין הכלים ולהשלים הרשמה (גם
 * כשקישור האישור נפתח בלשונית חדשה), ובכניסה הראשונה אחרי ההרשמה הם עוברים
 * לחשבון. מי שלא נרשם וחוזר לאתר מאוחר יותר מתחיל מכלים ריקים — כמו שאומרת
 * ההתראה שבכלים: רק הרשמה שומרת את הנתונים (בקשת בעל האתר, 2026-10-10).
 */

/** כמה זמן אחרי השינוי האחרון הנתונים של האורח עוד נשמרים */
export const GUEST_DATA_TTL_MS = 3 * 60 * 60 * 1000;

const TOUCHED_KEY = 'mashklanta:guest-data-touched';

/** המפתחות שבהם הכלים החינמיים שומרים את מה שהאורח הזין */
export const GUEST_DATA_KEYS = [
  'mashklanta:refinance-check',
  'mashklanta:refinance-mix',
  'mortgagePlanningData',
  'mortgagePlanningSelection',
  'consumer-loans-state',
  'mashklanta:equity-planning-draft',
] as const;

/** אורח שינה משהו באחד הכלים — מכאן נספר הזמן עד שהנתונים נמחקים */
export function touchGuestData(now: number = Date.now()) {
  try {
    window.localStorage.setItem(TOUCHED_KEY, String(now));
  } catch {
    // אחסון חסום — ממילא לא נשמר דבר
  }
}

/** האם הנתונים של האורח כבר ישנים מדי. בלי חותמת זמן — אין מה למחוק */
export function guestDataExpired(touched: string | null, now: number = Date.now()): boolean {
  if (!touched) return false;
  const at = Number(touched);
  return Number.isFinite(at) && now - at > GUEST_DATA_TTL_MS;
}

/**
 * מחיקת מה שהאורח הזין, אם עבר הזמן. נקרא לפני כל קריאה של טיוטת אורח, ולכן
 * כניסה מאוחרת לאתר תמיד פותחת כלים ריקים.
 */
export function expireGuestData(now: number = Date.now()) {
  try {
    if (!guestDataExpired(window.localStorage.getItem(TOUCHED_KEY), now)) return;
    for (const key of GUEST_DATA_KEYS) window.localStorage.removeItem(key);
    window.localStorage.removeItem(TOUCHED_KEY);
    window.sessionStorage.removeItem('mashklanta:refinance-check');
  } catch {
    // אחסון חסום — אין מה למחוק
  }
}
