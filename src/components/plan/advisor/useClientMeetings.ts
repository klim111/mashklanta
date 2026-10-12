'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { meetingIsLive } from '@/lib/advisor-crm';
import type { MeetingParty, MeetingStatus } from '@/lib/advisor-crm';

export interface ClientMeetingView {
  id: string;
  stage: PlanStageId | null;
  title: string;
  startsAt: string;
  location: string | null;
  status: MeetingStatus;
  /** מי הציע את המועד הנוכחי — כשהפגישה ממתינה, הצד השני הוא שמאשר */
  proposedBy: MeetingParty;
}

/**
 * הפגישות של הלקוח עם היועץ — כולל אלה שממתינות לאישורו או לאישור היועץ.
 *
 * הן נטענות מהשרת כדי שפגישה שהיועץ קבע תופיע גם בדאשבורד וגם בתוך השלב
 * שממנו נקבעה — בלי שהלקוח יצטרך לרענן. מתרעננות גם בכל חזרה ללשונית.
 */
export function useClientMeetings() {
  const [meetings, setMeetings] = useState<ClientMeetingView[]>([]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/meetings', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      setMeetings(Array.isArray(body) ? body : []);
    } catch {
      setMeetings([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return { meetings, refresh };
}

/** הפגישה הקרובה ביותר שנקבעה לשלב מסוים, אם יש */
export function meetingForStage(
  meetings: ClientMeetingView[],
  stage: PlanStageId
): ClientMeetingView | null {
  const upcoming = meetings
    .filter((m) => m.stage === stage && meetingIsLive(m.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return upcoming[0] ?? null;
}
