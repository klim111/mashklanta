'use client';

/**
 * החנות הקטנה של מצב ההדגמה — הדבר היחיד שהאתר הרגיל טוען.
 *
 * דף הבית וספקי השורש צריכים לדעת רק שתי עובדות: האם הדגמה פעילה, ואיזו.
 * המנוע עצמו (driver.js, הסמן, הצעדים) נטען בעצלות רק כשמתחילים הדגמה, ולכן
 * לגולש רגיל אין שום עלות.
 *
 * הבקשה נשמרת ב-sessionStorage האמיתי (לפני שארגז החול מחליף אותו), כך
 * שרענון באמצע ההדגמה ממשיך מאותו צעד, וסגירת הלשונית מסיימת אותה.
 */

import { useSyncExternalStore } from 'react';
import { activateSessionGuard, deactivateSessionGuard } from './sandbox/session-guard';

export interface DemoRequest {
  flowId: string;
  /** הצעד שממנו ממשיכים אחרי רענון */
  stepIndex: number;
  /** מאיפה נכנסו — לשם חוזרים ביציאה */
  returnTo: string;
  /** להתחיל מיד או להציג מסך פתיחה */
  autoplay: boolean;
}

const STORAGE_KEY = 'mashkalanta:demo';

/** ההפניה ל-sessionStorage המקורי — נלכדת לפני שארגז החול מחליף אותו */
const realSessionStorage: Storage | null = (() => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
})();

function readPersisted(): DemoRequest | null {
  try {
    const raw = realSessionStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoRequest>;
    if (typeof parsed.flowId !== 'string') return null;
    return {
      flowId: parsed.flowId,
      stepIndex: typeof parsed.stepIndex === 'number' ? parsed.stepIndex : 0,
      returnTo: typeof parsed.returnTo === 'string' ? parsed.returnTo : '/',
      autoplay: parsed.autoplay !== false,
    };
  } catch {
    return null;
  }
}

function persist(request: DemoRequest | null) {
  try {
    if (request) realSessionStorage?.setItem(STORAGE_KEY, JSON.stringify(request));
    else realSessionStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* אחסון חסום — ההדגמה עדיין עובדת, בלי המשך אחרי רענון */
  }
}

let current: DemoRequest | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function ensureHydrated() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  current = readPersisted();
  // רענון באמצע הדגמה: ה-session הבדוי צריך להיות זמין עוד לפני שזמן הריצה נטען
  if (current) activateSessionGuard();
}

export const demoStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): DemoRequest | null {
    ensureHydrated();
    return current;
  },
  getServerSnapshot(): DemoRequest | null {
    return null;
  },
  /** התחלת הדגמה — מהכפתור בדף הבית, מכרטיס בקטלוג או מהכתובת /demo/:id */
  start(flowId: string, options: { returnTo?: string; autoplay?: boolean; stepIndex?: number } = {}) {
    ensureHydrated();
    current = {
      flowId,
      stepIndex: options.stepIndex ?? 0,
      returnTo: options.returnTo ?? (typeof window !== 'undefined' ? window.location.pathname : '/'),
      autoplay: options.autoplay ?? true,
    };
    // לפני שהספקים מורכבים מחדש — כדי שהבקשה הראשונה ל-session תיענה מהפרסונה
    activateSessionGuard();
    persist(current);
    emit();
  },
  /** עדכון הצעד — כדי שרענון ימשיך מאותו מקום */
  setStep(stepIndex: number) {
    if (!current || current.stepIndex === stepIndex) return;
    current = { ...current, stepIndex };
    persist(current);
  },
  stop() {
    ensureHydrated();
    if (!current) return;
    current = null;
    deactivateSessionGuard();
    persist(null);
    emit();
  },
};

export function useDemoRequest(): DemoRequest | null {
  return useSyncExternalStore(demoStore.subscribe, demoStore.getSnapshot, demoStore.getServerSnapshot);
}

export function isDemoActive(): boolean {
  return demoStore.getSnapshot() !== null;
}
