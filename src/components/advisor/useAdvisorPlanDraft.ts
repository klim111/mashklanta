'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlan } from '@/components/plan/usePlan';
import type { PlanView } from '@/components/plan/usePlan';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import {
  NAVIGATION_KEYS,
  applyDraft,
  changedPaths,
  clientChangedPaths,
  emptyDraft,
  pendingPaths,
  recordEdit,
} from '@/lib/advisor-draft';
import type { PlanDrafts, StageDraft } from '@/lib/advisor-draft';
import type { PlanData, PlanStageId } from '@/lib/mortgage-plan';

const SAVE_MS = 700;

/**
 * עריכה נרשמת בטיוטה רק אם היא באה בעקבות פעולה של היועץ. כמה עמודים מסנכרנים
 * נתונים בעצמם כשהם נפתחים (למשל ההגעות לסניף מול המשימות); אצל הלקוח זה
 * נשמר כרגיל, אבל אצל היועץ זה אינו שינוי שלו ואין מה לשדר.
 */
const USER_INPUT_WINDOW_MS = 5000;
let lastUserInput = 0;
if (typeof window !== 'undefined') {
  const mark = () => {
    lastUserInput = Date.now();
  };
  ['pointerdown', 'keydown', 'input', 'change'].forEach((type) =>
    window.addEventListener(type, mark, { capture: true, passive: true })
  );
}

/** עדכון אחרון שהלקוח עשה בשלב, כפי שהיועץ ראה אותו מגיע */
export interface ClientUpdate {
  paths: string[];
  at: string;
}

/**
 * התהליך של הלקוח כפי שהיועץ עובד עליו.
 *
 * נתוני הלקוח מגיעים בזמן אמת (usePlan). מה שהיועץ משנה לא נשמר בהם: הוא
 * נרשם כטיוטה של היועץ לאותו שלב (src/lib/advisor-draft.ts), נשמר בשרת כדי
 * לא ללכת לאיבוד, ומוצג ליועץ מעל נתוני הלקוח. רק `broadcast` — הכפתור "שדר"
 * — מעביר את הטיוטה ללקוח.
 *
 * המבנה שמוחזר זהה ל-usePlan, כך שכל עמוד של שלב שהלקוח רואה עובד גם כאן כמו
 * שהוא, עם הטיוטה.
 */
export function useAdvisorPlanDraft(planId: string | null) {
  const live = usePlan(planId ?? '');
  const [drafts, setDrafts] = useState<PlanDrafts>({});
  const [draftsReady, setDraftsReady] = useState(false);
  /** מסכים פנימיים שהיועץ פתח — אצלו בלבד, ואינם משודרים */
  const [navigation, setNavigation] = useState<Partial<Record<PlanStageId, Record<string, unknown>>>>({});
  const [clientUpdates, setClientUpdates] = useState<Partial<Record<PlanStageId, ClientUpdate>>>({});
  const [broadcasting, setBroadcasting] = useState<PlanStageId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const dirty = useRef(new Set<PlanStageId>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDrafts = useCallback(async () => {
    if (!planId) return;
    // טיוטה שעוד לא נשמרה כאן גוברת על מה שבשרת
    if (dirty.current.size > 0) return;
    try {
      const response = await fetch(`/api/plans/${planId}/advisor-draft`, { cache: 'no-store' });
      if (!response.ok) return;
      const next = (await response.json()) as PlanDrafts;
      if (dirty.current.size > 0) return;
      setDrafts((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    } catch {
      // הבדיקה הבאה תשלים
    } finally {
      setDraftsReady(true);
    }
  }, [planId]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);
  // טיוטה שנשמרה בלשונית אחרת של היועץ מופיעה גם כאן
  useLiveRefresh(() => void loadDrafts(), Boolean(planId));

  const persist = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!planId) return;
    const stages = Array.from(dirty.current);
    dirty.current.clear();
    await Promise.all(
      stages.map((stage) =>
        fetch(`/api/plans/${planId}/advisor-draft`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage, draft: draftsRef.current[stage] ?? null }),
        }).catch(() => undefined)
      )
    );
  }, [planId]);

  // מה שהלקוח שינה בעמוד מאז שהיועץ פתח אותו — כדי שהיועץ יראה שזה הגיע
  const previous = useRef<PlanData | null>(null);
  /** הטעינה שאחרי שידור מביאה את מה שהיועץ עצמו שלח — זה לא שינוי של הלקוח */
  const ownBroadcast = useRef(false);
  useEffect(() => {
    const data = live.plan?.data ?? null;
    const before = previous.current;
    previous.current = data;
    if (ownBroadcast.current && data !== before) {
      ownBroadcast.current = false;
      return;
    }
    if (!data || !before) return;
    const updates: Partial<Record<PlanStageId, ClientUpdate>> = {};
    (Object.keys(data) as PlanStageId[]).forEach((stage) => {
      const paths = changedPaths(before[stage], data[stage]).filter(
        (path) => path && !(NAVIGATION_KEYS[stage] ?? []).includes(path.split('.')[0])
      );
      if (paths.length > 0) updates[stage] = { paths, at: new Date().toISOString() };
    });
    if (Object.keys(updates).length > 0) setClientUpdates((current) => ({ ...current, ...updates }));
  }, [live.plan]);

  const plan = useMemo<PlanView | null>(() => {
    if (!live.plan) return null;
    const data = { ...live.plan.data } as Record<PlanStageId, unknown>;
    (Object.keys(data) as PlanStageId[]).forEach((stage) => {
      data[stage] = { ...(applyDraft(data[stage], drafts[stage]) as object), ...(navigation[stage] ?? {}) };
    });
    return { ...live.plan, data: data as unknown as PlanData };
  }, [live.plan, drafts, navigation]);

  const planRef = useRef(plan);
  planRef.current = plan;

  const updateStage = useCallback(
    <S extends PlanStageId>(stage: S, next: PlanData[S]) => {
      const shown = planRef.current?.data[stage];
      const clientData = live.plan?.data[stage];
      if (shown === undefined || clientData === undefined) return;
      if (Date.now() - lastUserInput > USER_INPUT_WINDOW_MS) return;

      const navKeys = NAVIGATION_KEYS[stage] ?? [];
      if (navKeys.length > 0) {
        const nav: Record<string, unknown> = {};
        navKeys.forEach((key) => {
          const value = (next as unknown as Record<string, unknown>)[key];
          if (value !== undefined) nav[key] = value;
        });
        setNavigation((current) => ({ ...current, [stage]: nav }));
      }

      const draft = recordEdit(stage, draftsRef.current[stage] ?? emptyDraft(), clientData, shown, next);
      const nextDrafts = { ...draftsRef.current };
      if (pendingPaths(draft).length > 0) nextDrafts[stage] = draft;
      else delete nextDrafts[stage];
      draftsRef.current = nextDrafts;
      setDrafts(nextDrafts);
      // שינוי שהוא רק מעבר בין מסכים פנימיים אינו נשמר בשרת
      if (JSON.stringify(nextDrafts[stage]?.values ?? null) === JSON.stringify(drafts[stage]?.values ?? null)) return;

      dirty.current.add(stage);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void persist(), SAVE_MS);
    },
    [live.plan, drafts, persist]
  );

  /** "שדר" — הטיוטה של השלב עוברת ללקוח. מחזיר האם הצליח */
  const broadcast = useCallback(
    async (stage: PlanStageId): Promise<boolean> => {
      if (!planId) return false;
      setBroadcasting(stage);
      setError(null);
      dirty.current.delete(stage);
      try {
        const response = await fetch(`/api/plans/${planId}/advisor-draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage, draft: draftsRef.current[stage] ?? null }),
        });
        if (!response.ok) throw new Error(String(response.status));
        const nextDrafts = { ...draftsRef.current };
        delete nextDrafts[stage];
        draftsRef.current = nextDrafts;
        setDrafts(nextDrafts);
        setClientUpdates((current) => ({ ...current, [stage]: undefined }));
        ownBroadcast.current = true;
        await live.reload();
        setTimeout(() => {
          ownBroadcast.current = false;
        }, 500);
        return true;
      } catch {
        setError('השידור לא הצליח. השינויים נשארו אצלכם — נסו שוב.');
        return false;
      } finally {
        setBroadcasting(null);
      }
    },
    [planId, live]
  );

  /** ביטול השינויים בשלב — העמוד חוזר למה שהלקוח רואה */
  const discard = useCallback(
    async (stage: PlanStageId) => {
      const nextDrafts = { ...draftsRef.current };
      delete nextDrafts[stage];
      draftsRef.current = nextDrafts;
      setDrafts(nextDrafts);
      dirty.current.add(stage);
      await persist();
    },
    [persist]
  );

  const dismissClientUpdate = useCallback((stage: PlanStageId) => {
    setClientUpdates((current) => ({ ...current, [stage]: undefined }));
  }, []);

  // טיוטה שעוד לא נשמרה נשלחת כשעוזבים את הדף
  useEffect(() => {
    const flush = () => {
      if (!planId || dirty.current.size === 0) return;
      Array.from(dirty.current).forEach((stage) => {
        void fetch(`/api/plans/${planId}/advisor-draft`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage, draft: draftsRef.current[stage] ?? null }),
          keepalive: true,
        });
      });
      dirty.current.clear();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [planId]);

  const stageState = useCallback(
    (stage: PlanStageId) => {
      const draft: StageDraft | undefined = drafts[stage];
      return {
        pending: pendingPaths(draft),
        clientChanged: live.plan ? clientChangedPaths(draft, live.plan.data[stage]) : [],
        clientUpdate: clientUpdates[stage] ?? null,
        updatedAt: draft?.updatedAt ?? null,
      };
    },
    [drafts, live.plan, clientUpdates]
  );

  return {
    plan,
    ready: live.ready && draftsReady,
    updateStage,
    broadcast,
    discard,
    dismissClientUpdate,
    stageState,
    broadcasting,
    error,
  };
}

export type AdvisorPlanDraft = ReturnType<typeof useAdvisorPlanDraft>;
