'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { meetingIsLive } from '@/lib/advisor-crm';
import type { MeetingParty, MeetingStatus } from '@/lib/advisor-crm';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

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
 * שממנו נקבעה — בלי שהלקוח יצטרך לרענן: כל כמה שניות, ומיד בחזרה ללשונית.
 */
export function useClientMeetings() {
  const [meetings, setMeetings] = useState<ClientMeetingView[]>([]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/meetings', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      const next: ClientMeetingView[] = Array.isArray(body) ? body : [];
      setMeetings((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    } catch {
      // תקלה רגעית ברענון לא מוחקת פגישות שכבר מוצגות
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // פגישה שהיועץ קבע או הזיז מופיעה תוך שניות, וגם מיד בחזרה ללשונית
  useLiveRefresh(() => void refresh());

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
