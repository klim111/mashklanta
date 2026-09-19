'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlans } from '@/components/plan/usePlan';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import { useRateRequests } from '@/components/mortgage-advisor/rateRequest/useRateRequests';
import { useAdvisorNotes, useMeetings } from '@/components/advisor/useAdvisorCrm';
import { useClientTasks } from '@/components/plan/tasks/useClientTasks';
import { advisorStages as stagesOf } from '@/lib/advisor-orders';
import type { AdvisorOrder } from '@/lib/advisor-orders';
import { buildCalendarEvents, buildClientTasks, clientTaskIdOf } from '@/lib/client-agenda';
import type { AgendaInput, AgendaRateRequest, ClientTaskState } from '@/lib/client-agenda';
import { useClientTaskStates } from './useClientTaskStates';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { isUnassociatedMix } from '@/components/plan/UnassignedMixes';
import {
  CONTACTED_ADVISOR_EVENT,
  CONTACTED_ADVISOR_KEY,
} from '@/components/plan/advisor/AdvisorLeadDialog';

/**
 * כל הנתונים של האזור האישי, במקום אחד.
 *
 * הדאשבורד מציג את אותם תהליכים, פגישות ובקשות בכמה אזורים — בסקירה כתמצית,
 * ובאזור המתאים בפירוט. טעינה אחת כאן, במקום בכל אזור בנפרד, שומרת שהמספרים
 * בסקירה ובפירוט יהיו תמיד אותם מספרים.
 */
export function useClientDashboard() {
  const plansState = usePlans();
  const mixesState = useSavedMixes();
  const meetingsState = useMeetings();
  const { requests, ready: requestsReady } = useRateRequests();
  const { notes } = useAdvisorNotes();
  /** המשימות שהלקוח הוסיף לעצמו — לרשימת המשימות וללוח השנה */
  const clientTasksState = useClientTasks({});
  /** מועדים וסימונים שהלקוח קבע למשימות הנגזרות, שאין להן רשומה משלהן */
  const taskStatesState = useClientTaskStates();

  const activeIds = plansState.plans
    .filter((plan) => plan.status === 'IN_PROGRESS')
    .map((plan) => plan.id);
  const activeKey = activeIds.join(',');

  /** השלבים שיועץ מטפל בהם — לכל תהליך פתוח */
  const [advisorStages, setAdvisorStages] = useState<Record<string, PlanStageId[]>>({});

  const refreshAdvisorStages = useCallback(async () => {
    const ids = activeKey ? activeKey.split(',') : [];
    const entries = await Promise.all(
      ids.map(async (planId): Promise<[string, PlanStageId[]]> => {
        try {
          const response = await fetch(`/api/plans/${planId}/advisor-orders`, { cache: 'no-store' });
          if (!response.ok) return [planId, []];
          const body = (await response.json()) as AdvisorOrder[];
          return [planId, stagesOf(Array.isArray(body) ? body : [])];
        } catch {
          return [planId, []];
        }
      })
    );
    setAdvisorStages(Object.fromEntries(entries));
  }, [activeKey]);

  useEffect(() => {
    void refreshAdvisorStages();
  }, [refreshAdvisorStages]);

  /**
   * האם הלקוח כבר פנה ליועץ. הפנייה עצמה נשמרת בשרת בלי קשר לתהליך, ולכן
   * הסימון כאן מקומי — הוא משמש רק כדי להחליף את מסך הפתיחה בדאשבורד המלא.
   */
  const [contactedAdvisor, setContactedAdvisor] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setContactedAdvisor(window.localStorage.getItem(CONTACTED_ADVISOR_KEY) === '1');
      } catch {
        setContactedAdvisor(false);
      }
    };
    read();
    window.addEventListener(CONTACTED_ADVISOR_EVENT, read);
    return () => window.removeEventListener(CONTACTED_ADVISOR_EVENT, read);
  }, []);

  const rateRequests = useMemo<AgendaRateRequest[]>(
    () =>
      requests.map((request) => ({
        id: request.id,
        mixName: request.document.mixName,
        bankName: request.document.details.bankName || null,
        offers: mixesState.saved.filter(
          (item) =>
            item.mix.quote &&
            (item.mix.quote.requestId === request.id || item.mix.quote.sourceMixId === request.mix.id)
        ).length,
      })),
    [requests, mixesState.saved]
  );

  const unassignedMixes = useMemo(
    () => mixesState.saved.filter(isUnassociatedMix).length,
    [mixesState.saved]
  );

  const input = useMemo<AgendaInput>(
    () => ({
      plans: plansState.plans,
      meetings: meetingsState.meetings,
      rateRequests,
      unassignedMixes,
      notes,
      advisorStages,
      clientTasks: clientTasksState.tasks,
      taskStates: taskStatesState.states,
    }),
    [
      plansState.plans,
      meetingsState.meetings,
      rateRequests,
      unassignedMixes,
      notes,
      advisorStages,
      clientTasksState.tasks,
      taskStatesState.states,
    ]
  );

  const tasks = useMemo(() => buildClientTasks(input), [input]);

  /**
   * קביעת מועד למשימה, מאיפה שלא באה.
   *
   * למשימה שהלקוח הוסיף יש רשומה משלה, ולכן המועד נשמר עליה; משימה נגזרת אין
   * לה רשומה, והמועד שלה נשמר בנפרד לפי מזהה המשימה. הקריאה כאן אחת, כדי
   * שהמסך לא יצטרך לדעת מאיפה כל משימה הגיעה.
   */
  const scheduleTask = useCallback(
    (taskId: string, due: string | null) => {
      const ownId = clientTaskIdOf(taskId);
      if (ownId) {
        void clientTasksState.patch(ownId, { dueAt: due });
        return;
      }
      void taskStatesState.schedule(taskId, due);
    },
    [clientTasksState, taskStatesState]
  );
  const events = useMemo(() => buildCalendarEvents(input, tasks), [input, tasks]);

  /**
   * כניסה ראשונה: עדיין אין תהליך, פגישה, משימה או פנייה ליועץ. במצב הזה
   * הדאשבורד מציג את שאלת הפתיחה במרכז המסך במקום את תמונת המצב.
   */
  const firstVisit =
    plansState.plans.length === 0 &&
    events.length === 0 &&
    tasks.length === 0 &&
    requests.length === 0 &&
    !contactedAdvisor;

  return {
    plansState,
    mixesState,
    meetingsState,
    clientTasksState,
    requests,
    notes,
    advisorStages,
    tasks,
    events,
    taskStates: taskStatesState,
    scheduleTask,
    contactedAdvisor,
    firstVisit,
    ready: plansState.ready && mixesState.ready && meetingsState.ready && requestsReady,
  };
}

export type ClientDashboardData = ReturnType<typeof useClientDashboard>;
