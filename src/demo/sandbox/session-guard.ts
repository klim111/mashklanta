/**
 * שומר ה-session המוקדם של ההדגמה.
 *
 * ברגע שהדגמה מתחילה, ספק ה-session של האתר מורכב מחדש עם הפרסונה הבדויה —
 * אבל next-auth מנקה את המטמון הפנימי שלו בפירוק הספק הישן ומיד מבקש
 * `/api/auth/session` מהשרת. זמן הריצה המלא של ההדגמה (וארגז החול שלו) עדיין
 * נטען באותו רגע, ולכן העטיפה הקטנה הזו מותקנת מיד וסינכרונית: כל קריאה
 * ל-`/api/auth/*` נענית מקומית כל עוד ההדגמה פעילה. הקובץ מייבא רק את
 * הפרסונה, כדי שהחנות (שנטענת בכל דף) תישאר קלה.
 */

import { demoSession } from '../data/demo-session';

let installed = false;
let active = false;

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export function activateSessionGuard() {
  if (typeof window === 'undefined') return;
  active = true;
  if (installed) return;
  installed = true;
  const original = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (active) {
      try {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.href);
        if (url.origin === window.location.origin && url.pathname.startsWith('/api/auth/')) {
          if (url.pathname === '/api/auth/session') return json(demoSession());
          if (url.pathname === '/api/auth/csrf') return json({ csrfToken: 'demo-csrf' });
          if (url.pathname === '/api/auth/signout') return json({ url: '/' });
          return json({});
        }
      } catch {
        /* כתובת לא תקינה — ממשיכים כרגיל */
      }
    }
    return original.call(window, input, init);
  };
}

/** העטיפה נשארת מותקנת (כדי לא להחליף fetch מתחת לארגז החול) אך הופכת שקופה */
export function deactivateSessionGuard() {
  active = false;
}
