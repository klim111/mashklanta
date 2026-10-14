'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * עדכון בלי ריפרש בין הלקוח ליועץ.
 *
 * כל המסכים הפתוחים בלשונית חולקים בדיקה אחת: כל כמה שניות, כל עוד הלשונית
 * גלויה, ומיד כשחוזרים אליה, הדפדפן שואל את השרת רק אם משהו השתנה
 * (`/api/live`, src/lib/live-stamp.ts). כשהתשובה משתנה — הלקוח הזין שדה, היועץ
 * קבע פגישה, נפתחה בקשת ליווי או נרשם לקוח חדש — כל הוק שנרשם כאן טוען מחדש את
 * מה שהוא מציג. הטעינה הראשונה נשארת אצל מי שקורא להוק.
 */

const CHECK_MS = 5000;

const listeners = new Set<() => void>();
let lastStamp: string | null = null;
let timer: number | null = null;
let checking = false;

async function check() {
  if (checking || document.visibilityState !== 'visible') return;
  checking = true;
  try {
    const response = await fetch('/api/live', { cache: 'no-store' });
    if (!response.ok) return;
    const { stamp } = (await response.json()) as { stamp?: string };
    if (!stamp) return;
    const changed = lastStamp !== null && stamp !== lastStamp;
    lastStamp = stamp;
    if (changed) listeners.forEach((listener) => listener());
  } catch {
    // רשת שנפלה לרגע — הבדיקה הבאה תשלים
  } finally {
    checking = false;
  }
}

function onReturn() {
  void check();
}

function start() {
  void check();
  timer = window.setInterval(() => void check(), CHECK_MS);
  document.addEventListener('visibilitychange', onReturn);
  window.addEventListener('focus', onReturn);
}

function stop() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  lastStamp = null;
  document.removeEventListener('visibilitychange', onReturn);
  window.removeEventListener('focus', onReturn);
}

export function useLiveRefresh(refresh: () => void, enabled = true) {
  const saved = useRef(refresh);
  saved.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    const listener = () => saved.current();
    listeners.add(listener);
    if (listeners.size === 1) start();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) stop();
    };
  }, [enabled]);
}

/**
 * מונה שעולה בכל שינוי — לטעינות שכתובות כ-useEffect: מוסיפים אותו לתלויות
 * והטעינה רצה שוב כשהצד השני הזין משהו.
 */
export function useLiveVersion(enabled = true): number {
  const [version, setVersion] = useState(0);
  useLiveRefresh(() => setVersion((current) => current + 1), enabled);
  return version;
}
