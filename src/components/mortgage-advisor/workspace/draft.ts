'use client';

import { sanitizeMix } from '../engine';
import type { OptimizationConstraints, WorkspaceMix } from '../engine';

const DRAFT_KEY = 'mashklanta:advisor-draft';
const HANDOFF_KEY = 'mashklanta:advisor-handoff';

export interface WorkspaceDraft {
  mix: WorkspaceMix;
  constraints?: OptimizationConstraints;
}

function readMix(key: string): WorkspaceDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceDraft>;
    const mix = sanitizeMix(parsed?.mix);
    return mix ? { mix, constraints: parsed?.constraints } : null;
  } catch {
    return null;
  }
}

/**
 * טיוטת העבודה האחרונה. הכלי לא טוען אותה מעצמו — הוא נפתח ריק, ומציע
 * להמשיך ממנה רק אם היועץ בוחר בכך במפורש.
 */
export function readDraft(): WorkspaceDraft | null {
  return readMix(DRAFT_KEY);
}

export function writeDraft(draft: WorkspaceDraft) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // מכסת אחסון — השמירה המקומית היא נוחות ולא תלות
  }
}

export function clearDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DRAFT_KEY);
}

/**
 * מכין תמהיל לפתיחה בכלי התכנון. משמש כשמגיעים לכלי משלב אחר — פתיחת תמהיל
 * שמור מהאזור האישי, או מסך שבו כבר הוזנו הפרטים.
 */
export function stageMixForWorkspace(mix: WorkspaceMix) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HANDOFF_KEY, JSON.stringify({ mix }));
  } catch {
    // אם האחסון מלא, הכלי פשוט ייפתח ריק
  }
}

/**
 * קורא תמהיל שהועבר מהמסך הקודם ומוחק אותו, כדי שהוא ייטען פעם אחת בלבד
 * ולא ידרוס עבודה חדשה בכל טעינה של הדף.
 */
export function consumeStagedMix(): WorkspaceMix | null {
  const staged = readMix(HANDOFF_KEY);
  if (typeof window !== 'undefined') window.localStorage.removeItem(HANDOFF_KEY);
  return staged?.mix ?? null;
}
