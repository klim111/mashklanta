'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlans } from '@/components/plan/usePlan';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import { useRateRequests } from '@/components/mortgage-advisor/rateRequest/useRateRequests';
import { useAdvisorNotes, useMeetings } from '@/components/advisor/useAdvisorCrm';
import { advisorStages as stagesOf } from '@/lib/advisor-orders';
import type { AdvisorOrder } from '@/lib/advisor-orders';
import { buildCalendarEvents, buildClientTasks } from '@/lib/client-agenda';
import type { AgendaInput, AgendaRateRequest } from '@/lib/client-agenda';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { isUnassociatedMix } from '@/components/plan/PlansOverview';

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
    }),
    [plansState.plans, meetingsState.meetings, rateRequests, unassignedMixes, notes, advisorStages]
  );

  const tasks = useMemo(() => buildClientTasks(input), [input]);
  const events = useMemo(() => buildCalendarEvents(input), [input]);

  return {
    plansState,
    mixesState,
    meetingsState,
    requests,
    notes,
    advisorStages,
    tasks,
    events,
    ready: plansState.ready && mixesState.ready && meetingsState.ready && requestsReady,
  };
}

export type ClientDashboardData = ReturnType<typeof useClientDashboard>;
