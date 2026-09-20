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

export { DemoApiRouter };
