/**
 * ארגז החול של ההדגמה — הפעלה וכיבוי במקום אחד.
 *
 * מופעל ברגע שהדגמה מתחילה ומכובה ביציאה. כל עוד הוא פעיל: קריאות ה-API
 * נענות מזיכרון, אחסון הדפדפן מבודד, וה-session הוא הפרסונה של ההדגמה.
 */

import { DemoApiRouter } from './api-router';
import { installFetchShim } from './fetch-shim';
import { installStorageShim } from './storage-shim';

export interface DemoSandbox {
  router: DemoApiRouter;
  dispose: () => void;
}

export function createSandbox(options: { onSignOut?: () => void } = {}): DemoSandbox {
  const router = new DemoApiRouter({ onSignOut: options.onSignOut });
  const restoreStorage = installStorageShim();
  const restoreFetch = installFetchShim(router);
  return {
    router,
    dispose: () => {
      restoreFetch();
      restoreStorage();
    },
  };
}

/**
 * ארגז החול הפעיל — יחיד לכל הדף.
 *
 * React עשוי לרנדר את זמן הריצה יותר מפעם אחת לפני ההרכבה (טעינה עצלה, Suspense),
 * ולכן היצירה אינה נשענת על ref: עותק אחד בלבד, שמתפרק ביציאה. כך היציאה תמיד
 * מחזירה את ה-fetch המקורי ולא נשאר ארגז חול "מתחת" לזה שפורק.
 */
let activeSandbox: DemoSandbox | null = null;

export function ensureSandbox(options: { onSignOut?: () => void } = {}): DemoSandbox {
  if (!activeSandbox) activeSandbox = createSandbox(options);
  return activeSandbox;
}

export function disposeSandbox() {
  activeSandbox?.dispose();
  activeSandbox = null;
}

export { DemoApiRouter };
