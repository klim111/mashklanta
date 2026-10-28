'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { TOOL_DATA_KEYS, TOOL_HAS_CONTENT, parseResume } from '@/lib/tool-data';
import type { AccountToolData, ResumeInfo, ResumeTool, StoredKey, ToolDataKey } from '@/lib/tool-data';
import {
  clearGuestRefinance,
  guestRefinanceMix,
  loadDraft,
  loadGuestMix,
} from '@/components/refinance-check/refinanceCheckStore';
import { adoptEquityDraft, readEquityDraft } from '@/components/equity-planning/useEquityPlan';
import { expireGuestData } from '@/components/guest/guestData';

/**
 * מה שהלקוח הזין בכלים הפתוחים, בין הדפדפן לחשבון (src/lib/tool-data.ts).
 *
 * אורח עובד על אחסון הדפדפן בלבד. בכניסה הראשונה אחרי ההרשמה, מה שהזין עובר
 * לחשבון — רק לכלי שאין לו עדיין נתונים בחשבון, כדי לא לדרוס עבודה קיימת —
 * ומשם הכלי נפתח מהחשבון ושומר אליו. כך מסלולים שהוזנו בבדיקת המיחזור לפני
 * ההרשמה מחכים בכלי המיחזור, בכל מכשיר.
 */

export const TOOL_DATA_CHANGED_EVENT = 'mashklanta:tool-data-changed';

/** מה שהכלי שומר בדפדפן — אצל האורח, ובכלים שממשיכים לשמור עותק מקומי גם למחובר */
const GUEST_SOURCES: Record<ToolDataKey, { read: () => unknown; clear?: () => void }> = {
  refinance: { read: guestRefinanceMix, clear: clearGuestRefinance },
  affordability: { read: () => readLocalJson('mortgagePlanningData') },
  consumerLoans: { read: () => readLocalJson('consumer-loans-state') },
};

function readLocalJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** מה שהאורח הזין בכלי הזה בדפדפן הנוכחי, אם הזין משהו */
export function readGuestToolData(key: ToolDataKey): unknown {
  // מה שהאורח הזין לפני זמן רב כבר לא נשמר (src/components/guest/guestData.ts)
  expireGuestData();
  const value = GUEST_SOURCES[key].read();
  return TOOL_HAS_CONTENT[key](value) ? value : null;
}

/** השלב שבו האורח עצר בכל כלי, לפי מה שהכלי שמר בדפדפן */
function guestSteps(): ResumeInfo['steps'] {
  const steps: ResumeInfo['steps'] = {};
  const planning = readLocalJson('mortgagePlanningData') as { currentStep?: unknown } | null;
  if (typeof planning?.currentStep === 'string') steps.affordability = planning.currentStep;
  // מסך ההצצה בכלי המלא בא אחרי הבדיקה המהירה
  const refinanceStep = loadGuestMix() ? 'preview' : loadDraft()?.step;
  if (refinanceStep) steps.refinance = refinanceStep;
  const equity = readEquityDraft();
  if (equity) steps.equity = String(equity.currentStep);
  return steps;
}

/**
 * כל מה שהאורח הזין בכלים החינמיים, והשלב שבו עצר בכל אחד — נשלח עם בקשת
 * ההרשמה ונשמר בחשבון כשהמייל מאושר, גם אם האישור נעשה בדפדפן אחר.
 */
export function collectGuestSnapshot(): Record<string, unknown> | undefined {
  try {
    const snapshot: Record<string, unknown> = {};
    for (const key of TOOL_DATA_KEYS) {
      const value = readGuestToolData(key);
      if (value) snapshot[key] = value;
    }
    const equity = readEquityDraft();
    if (equity) snapshot.equity = equity;
    if (Object.keys(snapshot).length === 0) return undefined;
    snapshot.steps = guestSteps();
    return snapshot;
  } catch {
    return undefined;
  }
}

/**
 * הנתונים בחשבון, אחרי שמה שהוזן בדפדפן לפני ההרשמה עבר אליהם. נטען פעם אחת
 * לכל טעינת דף, ומשותף לכל הכלים והכרטיסים שבו.
 */
let cached: Promise<AccountToolData> | null = null;

async function fetchToolData(): Promise<AccountToolData> {
  const response = await fetch('/api/profile/tool-data', { cache: 'no-store' });
  if (!response.ok) throw new Error(`tool data: ${response.status}`);
  return (await response.json()) as AccountToolData;
}

export async function putToolData(key: StoredKey, data: unknown): Promise<boolean> {
  try {
    const response = await fetch('/api/profile/tool-data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data }),
    });
    if (response.ok) {
      if (cached) {
        cached = cached.then((current) => ({ ...current, [key]: data ?? undefined }));
      }
      window.dispatchEvent(new Event(TOOL_DATA_CHANGED_EVENT));
    }
    return response.ok;
  } catch {
    return false;
  }
}

export function loadAccountToolData(): Promise<AccountToolData> {
  if (!cached) {
    cached = syncGuestData().catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

async function putRaw(key: StoredKey, data: unknown): Promise<boolean> {
  const response = await fetch('/api/profile/tool-data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, data }),
  });
  return response.ok;
}

async function syncGuestData(): Promise<AccountToolData> {
  const account = await fetchToolData();
  // השלבים נקראים לפני שהטיוטות עוברות לחשבון ונמחקות מהדפדפן
  const steps = guestSteps();
  const moved: ResumeTool[] = [];

  for (const key of TOOL_DATA_KEYS) {
    const guest = readGuestToolData(key);
    if (!guest) continue;
    if (TOOL_HAS_CONTENT[key](account[key])) {
      // כבר בחשבון (למשל נשמר עם ההרשמה) — העותק של האורח מיותר
      GUEST_SOURCES[key].clear?.();
      continue;
    }
    if (!(await putRaw(key, guest))) continue;
    account[key] = guest;
    GUEST_SOURCES[key].clear?.();
    moved.push(key);
  }

  // תכנון ההון העצמי שמור בטבלה משלו: טיוטה שנשמרה עם ההרשמה, או זו שבדפדפן
  if (account.equity) {
    await adoptEquityDraft(account.equity);
    if (await putRaw('equity', null)) delete account.equity;
  }
  if (await adoptEquityDraft()) moved.push('equity');

  /**
   * מי שהזין בכלים ונכנס לחשבון מהדפדפן הזה — גם אם לא שלח אותם עם ההרשמה —
   * מקבל את ההודעה "תרצו להמשיך?" עם הכלים האלה.
   */
  if (moved.length > 0) {
    const existing = parseResume(account.resume);
    const tools = [...new Set([...(existing?.tools ?? []), ...moved])];
    const resume = { tools, steps: { ...steps, ...existing?.steps }, savedAt: new Date().toISOString() };
    if (await putRaw('resume', resume)) account.resume = resume;
    window.dispatchEvent(new Event(TOOL_DATA_CHANGED_EVENT));
  }
  return account;
}

export interface ToolDataState<T> {
  /** עד שידוע מה לפתוח — הכלי ממתין, כדי לא להציג טופס ריק ואז להחליף אותו */
  ready: boolean;
  signedIn: boolean;
  /** מה לפתוח: מהחשבון למחובר, מהדפדפן לאורח; null כשאין */
  initial: T | null;
  /** שמירה לחשבון (למחובר בלבד), באיחור קצר כדי לא לשלוח כל הקשה */
  save: (value: T) => void;
}

/**
 * הנתונים של כלי אחד. `revive` מתרגם את מה שנשמר כ-JSON חזרה למבנה של הכלי.
 */
export function useToolData<T>(key: ToolDataKey, revive: (value: unknown) => T | null): ToolDataState<T> {
  const { status } = useSession();
  const signedIn = status === 'authenticated';
  const [state, setState] = useState<{ ready: boolean; initial: T | null }>({ ready: false, initial: null });
  const reviveRef = useRef(revive);
  reviveRef.current = revive;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** האם כבר נשמר משהו לכלי בחשבון — רק אז שמירה של מצב ריק מוחקת אותו */
  const stored = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;
    let cancelled = false;

    if (!signedIn) {
      // יציאה מהחשבון — הכניסה הבאה טוענת מחדש, אולי של משתמש אחר
      cached = null;
      const guest = readGuestToolData(key);
      setState({ ready: true, initial: guest ? reviveRef.current(guest) : null });
      return;
    }

    loadAccountToolData()
      .then((account) => {
        if (cancelled) return;
        const value = account[key];
        stored.current = TOOL_HAS_CONTENT[key](value);
        setState({ ready: true, initial: stored.current ? reviveRef.current(value) : null });
      })
      .catch(() => {
        // בלי חיבור לחשבון — מה שיש בדפדפן עדיף על טופס ריק
        if (cancelled) return;
        const guest = readGuestToolData(key);
        setState({ ready: true, initial: guest ? reviveRef.current(guest) : null });
      });

    return () => {
      cancelled = true;
    };
  }, [status, signedIn, key]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const save = useCallback(
    (value: T) => {
      if (!signedIn) return;
      const hasContent = TOOL_HAS_CONTENT[key](value);
      if (!hasContent && !stored.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        stored.current = hasContent;
        void putToolData(key, hasContent ? value : null);
      }, 800);
    },
    [signedIn, key]
  );

  return { ready: state.ready, signedIn, initial: state.initial, save };
}
