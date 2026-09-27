'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  EMPTY_EQUITY_PLAN,
  isFinancingProfile,
  planDataFromView,
  sanitizeExpenses,
} from '@/lib/equity-planning';
import type { EquityPlanView, EquityPlanningData } from '@/lib/equity-planning';

/** הטיוטה של מי שעדיין לא נרשם — נשמרת בדפדפן בלבד, ועוברת לחשבון בהרשמה */
export const EQUITY_DRAFT_KEY = 'mashklanta:equity-planning-draft';

/**
 * נשלח אחרי כל שמירה מוצלחת בחשבון, כדי שהסקירה ולוח השנה בדאשבורד יציגו את
 * אותם מספרים שהכלי מציג — גם כשהכלי פתוח בתוך האזור האישי.
 */
export const EQUITY_PLAN_CHANGED_EVENT = 'mashklanta:equity-plan-changed';

export type EquitySaveState = 'idle' | 'saving' | 'saved' | 'error';

function readDraft(): EquityPlanningData | null {
  try {
    const raw = window.localStorage.getItem(EQUITY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const property = (parsed.propertyData ?? {}) as Record<string, unknown>;
    const price = Number(property.price);
    return {
      propertyData: {
        price: Number.isFinite(price) ? price : 0,
        targetDate: typeof property.targetDate === 'string' ? property.targetDate : '',
        financingProfile: isFinancingProfile(property.financingProfile)
          ? property.financingProfile
          : 'first-home',
      },
      expenses: sanitizeExpenses(parsed.expenses),
      usesBroker: parsed.usesBroker === true,
      currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : 0,
    };
  } catch {
    return null;
  }
}

function writeDraft(data: EquityPlanningData) {
  try {
    window.localStorage.setItem(EQUITY_DRAFT_KEY, JSON.stringify(data));
  } catch {
    // דפדפן שחוסם אחסון מקומי — הנתונים נשארים בזיכרון המסך בלבד
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(EQUITY_DRAFT_KEY);
  } catch {
    // אין מה לעשות — הטיוטה פשוט תישאר ותידרס בשמירה הבאה
  }
}

function hasContent(data: EquityPlanningData): boolean {
  return (
    data.propertyData.price > 0 ||
    data.expenses.some((expense) => expense.amount > 0 || expense.description.trim().length > 0)
  );
}

/**
 * הנתונים של כלי תכנון ההוצאות, עם השמירה שמתאימה למי שמשתמש בו.
 *
 * מי שאינו רשום עובד על טיוטה מקומית בלבד — היא נשמרת בדפדפן כדי שלא תאבד
 * בדרך להרשמה. ברגע שהוא נרשם ונכנס, הטיוטה נשמרת בחשבון שלו בטבלת תכנון
 * ההון העצמי, ומשם והלאה כל שינוי נשמר בבסיס הנתונים.
 */
export function useEquityPlan() {
  const { status } = useSession();
  const signedIn = status === 'authenticated';
  const [data, setData] = useState<EquityPlanningData>(EMPTY_EQUITY_PLAN);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<EquitySaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  /** נטען משרת/מטיוטה — עד שזה קורה אין מה לשמור, כדי לא לדרוס נתונים קיימים */
  const loaded = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback(async (next: EquityPlanningData) => {
    setSaveState('saving');
    try {
      const response = await fetch('/api/equity-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyPrice: next.propertyData.price,
          targetDate: next.propertyData.targetDate,
          financingProfile: next.propertyData.financingProfile,
          usesBroker: next.usesBroker,
          expenses: next.expenses,
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as EquityPlanView;
      setSaveState('saved');
      setSavedAt(body.updatedAt);
      window.dispatchEvent(new Event(EQUITY_PLAN_CHANGED_EVENT));
      return true;
    } catch {
      setSaveState('error');
      return false;
    }
  }, []);

  // טעינה ראשונה: מהחשבון לרשומים, מהטיוטה המקומית לכל השאר
  useEffect(() => {
    if (status === 'loading') return;
    let cancelled = false;

    const load = async () => {
      const draft = readDraft();

      if (!signedIn) {
        if (!cancelled) {
          if (draft) setData(draft);
          loaded.current = true;
          setReady(true);
        }
        return;
      }

      try {
        const response = await fetch('/api/equity-plans', { cache: 'no-store' });
        const stored = response.ok ? ((await response.json()) as EquityPlanView | null) : null;
        const fromServer = planDataFromView(stored);
        if (cancelled) return;

        // נרשם אחרי שכבר הזין ערכים — הטיוטה עוברת לחשבון ונשמרת בבסיס הנתונים
        if (draft && hasContent(draft) && (!fromServer || !hasContent(fromServer))) {
          setData(draft);
          loaded.current = true;
          setReady(true);
          const ok = await push(draft);
          if (ok) clearDraft();
          return;
        }

        if (fromServer) {
          setData(fromServer);
          setSavedAt(stored?.updatedAt ?? null);
        } else if (draft) {
          setData(draft);
        }
        clearDraft();
      } catch {
        if (!cancelled && draft) setData(draft);
      } finally {
        if (!cancelled) {
          loaded.current = true;
          setReady(true);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [status, signedIn, push]);

  // שמירה שוטפת — לחשבון לרשומים, לטיוטה המקומית לכל השאר
  useEffect(() => {
    if (!loaded.current) return;

    if (!signedIn) {
      writeDraft(data);
      return;
    }

    // אין מה לשמור עד שהוזן משהו, וגם אין טעם לפתוח רשומה ריקה בבסיס הנתונים
    if (!hasContent(data) && !savedAt) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void push(data), 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, signedIn, push, savedAt]);

  const reset = useCallback(async () => {
    setData(EMPTY_EQUITY_PLAN);
    if (signedIn) {
      await fetch('/api/equity-plans', { method: 'DELETE' }).catch(() => null);
      setSavedAt(null);
      setSaveState('idle');
      window.dispatchEvent(new Event(EQUITY_PLAN_CHANGED_EVENT));
    } else {
      clearDraft();
    }
  }, [signedIn]);

  return { data, setData, ready, signedIn, saveState, savedAt, reset, saveNow: () => push(data) };
}
