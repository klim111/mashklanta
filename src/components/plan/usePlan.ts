'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PLAN_STAGES, emptyPlanData, nextPlanStage, parseStageData, planFlowOf } from '@/lib/mortgage-plan';
import type {
  PlanData,
  PlanKind,
  PlanStageId,
  PlanStageStatus,
  PlanStatus,
  RefinanceMode,
} from '@/lib/mortgage-plan';
import type { ProcessAccess } from '@/lib/process-access';
import { DEMO_ADDRESS, DEMO_MORTGAGE, DEMO_PLAN_ID, DEMO_PROPERTY_VALUE, demoPlanData, isDemoPlan } from '@/lib/demo-plan';

export { DEMO_PLAN_ID, isDemoPlan };

function demoPlan(): PlanView {
  const now = new Date().toISOString();
  return {
    id: DEMO_PLAN_ID,
    name: 'סיור היכרות בכלי',
    status: 'IN_PROGRESS',
    kind: 'NEW',
    refinanceMode: null,
    currentStage: 'ANALYSIS',
    progress: 0,
    propertyValue: DEMO_PROPERTY_VALUE,
    propertyAddress: DEMO_ADDRESS,
    mortgageAmount: DEMO_MORTGAGE,
    monthlyPayment: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    stages: PLAN_STAGES.map((stage) => ({
      stage,
      status: 'IN_PROGRESS' as PlanStageStatus,
      data: null,
      completedAt: null,
    })),
    data: demoPlanData(),
  };
}

/** תהליך תכנון כפי שהוא מגיע מהשרת */
export interface PlanView {
  id: string;
  name: string;
  status: PlanStatus;
  /** משכנתא חדשה או מיחזור — נגזר מנתוני שלב התמהיל */
  kind: PlanKind;
  /** במיחזור: פנימי, חיצוני, או null כל עוד לא נבחר */
  refinanceMode: RefinanceMode | null;
  currentStage: PlanStageId;
  progress: number;
  propertyValue: number | null;
  propertyAddress: string | null;
  mortgageAmount: number | null;
  monthlyPayment: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stages: Array<{
    stage: PlanStageId;
    status: PlanStageStatus;
    data: unknown;
    completedAt: string | null;
  }>;
  data: PlanData;
  /**
   * הגישה לכלים בתהליך — 35 יום מכל תשלום. חסר בתהליכי הדגמה, ואז הכלים
   * פתוחים.
   */
  access?: ProcessAccess;
}

/** תיקון תהליך שהתקבל מהשרת, כך שכל שדה שהטופס נוגע בו קיים ומהסוג הנכון */
function normalize(raw: unknown): PlanView | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (typeof source.id !== 'string') return null;

  const incoming = (source.data ?? {}) as Record<string, unknown>;
  const data = emptyPlanData();
  PLAN_STAGES.forEach((stage) => {
    (data as Record<PlanStageId, unknown>)[stage] = parseStageData(stage, incoming[stage]);
  });

  const flow = planFlowOf(data);
  return { ...(source as unknown as PlanView), kind: flow.kind, refinanceMode: flow.refinanceMode, data };
}

async function readPlan(response: Response): Promise<PlanView> {
  const plan = normalize(await response.json());
  if (!plan) throw new Error('invalid plan payload');
  return plan;
}

export async function fetchPlans(): Promise<PlanView[]> {
  const response = await fetch('/api/plans', { cache: 'no-store' });
  if (!response.ok) throw new Error(`failed to load plans: ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body)) return [];
  return body.flatMap((item) => {
    const plan = normalize(item);
    return plan ? [plan] : [];
  });
}

/** פתיחת תהליך מיחזור מכלי המיחזור, עם התמהיל שנבנה בו */
export async function createRefinancePlan(refinance: unknown, mix: unknown): Promise<PlanView> {
  const response = await fetch('/api/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refinance, mix }),
  });
  if (!response.ok) throw new Error(`failed to create refinance plan: ${response.status}`);
  return readPlan(response);
}

export async function createPlan(name?: string): Promise<PlanView> {
  const response = await fetch('/api/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(name ? { name } : {}),
  });
  if (!response.ok) throw new Error(`failed to create plan: ${response.status}`);
  return readPlan(response);
}

/**
 * מחיקת תהליך מבסיס הנתונים.
 *
 * מחזירה הודעת שגיאה כשהמחיקה נדחתה — למשל כששלב כבר בעבודה אצל היועץ
 * והתשלום עליו סודר — כדי שהלקוח יראה בדיוק מה מונע את הביטול.
 */
export async function deletePlanRequest(planId: string): Promise<string | null> {
  const response = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
  if (response.ok) return null;
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : 'לא הצלחנו למחוק את התהליך. נסו שוב.';
}

/** רשימת התהליכים באזור האישי */
export function usePlans() {
  const [plans, setPlans] = useState<PlanView[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPlans(await fetchPlans());
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את התהליכים שלכם');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const start = useCallback(async (name?: string) => {
    try {
      const plan = await createPlan(name);
      setPlans((current) => [plan, ...current]);
      setError(null);
      return plan;
    } catch {
      setError('לא הצלחנו לפתוח תהליך חדש. נסו שוב בעוד רגע.');
      throw new Error('failed to create plan');
    }
  }, []);

  /** מחיקה סופית. התהליך יורד מהרשימה רק כשהשרת אישר שהוא נמחק */
  const remove = useCallback(async (planId: string): Promise<string | null> => {
    const failure = await deletePlanRequest(planId);
    if (failure) return failure;
    setPlans((current) => current.filter((plan) => plan.id !== planId));
    return null;
  }, []);

  const patchDeal = useCallback(
    async (
      planId: string,
      deal: { propertyAddress?: string; propertyValue?: number | null; mortgageAmount?: number | null }
    ) => {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal }),
      });
      if (!response.ok) throw new Error('failed to update deal');
      const plan = await readPlan(response);
      setPlans((current) => current.map((item) => (item.id === plan.id ? plan : item)));
      return plan;
    },
    []
  );

  return { plans, ready, error, refresh, start, remove, patchDeal };
}

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 900;

/**
 * תהליך בודד, עם שמירה אוטומטית.
 *
 * העריכה מתעדכנת מיד במסך, והשרת מקבל את הנתונים אחרי הפוגה קצרה בהקלדה. כל
 * תשובה מהשרת מחליפה את התהליך המקומי, ולכן ההתקדמות והסיכומים תמיד מגיעים
 * ממקור אחד — בסיס הנתונים.
 */
export function usePlan(planId: string) {
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  /** מה חסר כדי לסגור את השלב, כשהשרת דחה סגירה */
  const [blocked, setBlocked] = useState<PlanStageId | null>(null);

  const pending = useRef<Map<PlanStageId, unknown>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demo = isDemoPlan(planId);

  useEffect(() => {
    let cancelled = false;

    if (demo) {
      setPlan(demoPlan());
      setError(null);
      setReady(true);
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      try {
        const response = await fetch(`/api/plans/${planId}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(String(response.status));
        const loaded = await readPlan(response);
        if (!cancelled) {
          setPlan(loaded);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('התהליך לא נמצא, או שאין לכם גישה אליו');
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [planId, demo]);

  const push = useCallback(
    async (stage: PlanStageId, data: unknown, complete: boolean) => {
      if (demo) {
        // תהליך ההדגמה: השלב נסגר מקומית והתהליך עובר לשלב הבא, בלי שרת
        setPlan((current) => {
          if (!current) return current;
          const next = nextPlanStage(stage, planFlowOf(current.data)) ?? stage;
          return {
            ...current,
            currentStage: complete ? next : current.currentStage,
            stages: current.stages.map((item) =>
              item.stage === stage && complete
                ? { ...item, status: 'COMPLETED', completedAt: new Date().toISOString() }
                : item
            ),
          };
        });
        setSaveState('idle');
        return;
      }
      setSaveState('saving');
      try {
        const response = await fetch(`/api/plans/${planId}/stages/${stage}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, complete }),
        });

        if (response.status === 409) {
          // השלב נשמר אך לא נסגר — חסרים נתונים שהשלבים הבאים נשענים עליהם
          const body = await response.json().catch(() => null);
          const updated = normalize(body?.plan);
          if (updated) setPlan(updated);
          setBlocked(stage);
          setSaveState('saved');
          return;
        }

        if (!response.ok) throw new Error(String(response.status));

        setPlan(await readPlan(response));
        setBlocked(null);
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    },
    [planId, demo]
  );

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const queued = Array.from(pending.current.entries());
    pending.current.clear();
    for (const [stage, data] of queued) {
      await push(stage, data, false);
    }
  }, [push]);

  /** עדכון נתוני שלב. השמירה מתבצעת אחרי הפוגה בהקלדה */
  const updateStage = useCallback(
    <S extends PlanStageId>(stage: S, next: PlanData[S]) => {
      setPlan((current) => {
        if (!current) return current;
        return { ...current, data: { ...current.data, [stage]: next } };
      });

      if (demo) return;

      pending.current.set(stage, next);
      setSaveState('dirty');

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void flush();
      }, AUTOSAVE_MS);
    },
    [flush, demo]
  );

  /**
   * "חתמתי על המשכנתא בבנק" — סגירת השלב האחרון וסיום התהליך. מחזיר האם
   * התהליך סומן כמושלם.
   */
  const markSigned = useCallback(async (): Promise<boolean> => {
    if (demo) {
      setPlan((current) =>
        current
          ? { ...current, status: 'COMPLETED', progress: 100, completedAt: new Date().toISOString() }
          : current
      );
      return true;
    }
    await flush();
    const response = await fetch(`/api/plans/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signed: true }),
    });
    if (!response.ok) return false;
    setPlan(await readPlan(response));
    setBlocked(null);
    return true;
  }, [demo, flush, planId]);

  /** סגירת השלב ומעבר לשלב הבא */
  const completeStage = useCallback(
    async (stage: PlanStageId) => {
      const data = pending.current.get(stage) ?? plan?.data[stage];
      pending.current.delete(stage);
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      await push(stage, data, true);
    },
    [plan, push]
  );

  const goToStage = useCallback(
    async (stage: PlanStageId) => {
      if (demo) {
        setPlan((current) => (current ? { ...current, currentStage: stage } : current));
        return;
      }
      await flush();
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStage: stage }),
      });
      if (response.ok) {
        setPlan(await readPlan(response));
        setBlocked(null);
      }
    },
    [flush, planId, demo]
  );

  const rename = useCallback(
    async (name: string) => {
      if (demo) {
        setPlan((current) => (current ? { ...current, name } : current));
        return;
      }
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (response.ok) setPlan(await readPlan(response));
    },
    [planId, demo]
  );

  // שמירה של עריכה שעדיין לא נשלחה, כשעוזבים את הדף
  useEffect(() => {
    const persist = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      const queued = Array.from(pending.current.entries());
      pending.current.clear();
      queued.forEach(([stage, data]) => {
        void fetch(`/api/plans/${planId}/stages/${stage}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, complete: false }),
          keepalive: true,
        });
      });
    };

    window.addEventListener('pagehide', persist);
    return () => {
      window.removeEventListener('pagehide', persist);
    };
  }, [planId]);

  return {
    plan,
    ready,
    error,
    saveState,
    blocked,
    updateStage,
    completeStage,
    markSigned,
    goToStage,
    rename,
    flush,
  };
}
