'use client';

import React, { useState } from 'react';
import { CalendarCheck2, CalendarClock, Clock, Send } from 'lucide-react';
import { meetingAwaits, meetingIsLive } from '@/lib/advisor-crm';
import type { MeetingParty, MeetingReply, MeetingStatus } from '@/lib/advisor-crm';
import { fromLocalInputValue, toLocalInputValue } from '@/components/advisor/ui';

export interface AnswerableMeeting {
  id: string;
  startsAt: string;
  status: MeetingStatus;
  proposedBy: MeetingParty;
}

/**
 * מה שהלקוח יכול לעשות עם פגישה, בכל מקום שהיא מוצגת לו — בלוח השנה, בתוך
 * השלב ובפגישה להשלמת הפרטים להגשה לבנקים:
 *
 * - כשהיועץ הציע מועד: לאשר אותו, או להציע מועד אחר — שעובר לאישור היועץ.
 * - כשהלקוח הציע מועד: הודעה שההצעה ממתינה לאישור היועץ, ואפשר לשנות אותה.
 * - כשהפגישה מאושרת: אפשר לבקש מועד אחר, שעובר לאישור היועץ.
 */
export function ClientMeetingAnswer({
  meeting,
  onAnswer,
  allowDecline = false,
}: {
  meeting: AnswerableMeeting;
  onAnswer: (reply: MeetingReply) => Promise<string | null>;
  /** "המועד לא מתאים" בלי להציע מועד אחר — רק בפרטי הפגישה בלוח השנה */
  allowDecline?: boolean;
}) {
  const [proposing, setProposing] = useState(false);
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!meetingIsLive(meeting.status)) return null;
  const awaitsMe = meetingAwaits(meeting, 'CLIENT');
  const awaitsAdvisor = meetingAwaits(meeting, 'ADVISOR');

  const send = async (reply: MeetingReply) => {
    setBusy(true);
    setError(null);
    const failure = await onAnswer(reply);
    setBusy(false);
    if (failure) setError(failure);
    else setProposing(false);
  };

  const proposed = fromLocalInputValue(slot);

  return (
    <div className="w-full space-y-2">
      {awaitsAdvisor && !proposing && (
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-amber-800">
          <Clock className="h-4 w-4 shrink-0" />
          הצעתם את המועד הזה, והוא ממתין לאישור היועץ. אם היועץ יציע מועד אחר, הוא יופיע כאן לאישורכם.
        </p>
      )}

      {!proposing ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {awaitsMe && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void send({ action: 'accept' })}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-button font-black text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CalendarCheck2 className="h-4 w-4" />
              אשרו את המועד
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSlot(toLocalInputValue(meeting.startsAt));
              setProposing(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-button font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <CalendarClock className="h-4 w-4" />
            {awaitsMe ? 'הציעו מועד אחר' : awaitsAdvisor ? 'שינוי המועד שהצעתם' : 'בקשו מועד אחר'}
          </button>
          {allowDecline && awaitsMe && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void send({ action: 'decline' })}
              className="rounded-xl px-3 py-2.5 text-button font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              המועד לא מתאים
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <span className="text-sm font-black text-slate-700">המועד שמתאים לכם:</span>
          <input
            type="datetime-local"
            value={slot}
            onChange={(event) => setSlot(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-400 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy || !proposed || proposed === meeting.startsAt}
            onClick={() => proposed && void send({ action: 'propose', startsAt: proposed })}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-button font-black text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            שליחה לאישור היועץ
          </button>
          <button
            type="button"
            onClick={() => setProposing(false)}
            className="rounded-xl px-3 py-2 text-button font-bold text-slate-500 hover:bg-white"
          >
            ביטול
          </button>
        </div>
      )}

      {error && <p className="text-center text-sm font-bold text-rose-600">{error}</p>}
    </div>
  );
}

/** שליחת תשובה לפגישה מצד הלקוח — לשימוש במסכים שלא עוברים דרך useMeetings */
export async function sendMeetingReply(meetingId: string, reply: MeetingReply): Promise<string | null> {
  try {
    const response = await fetch(`/api/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reply),
    });
    if (response.ok) return null;
    const body = await response.json().catch(() => null);
    return typeof body?.error === 'string' ? body.error : 'התשובה לא נשמרה';
  } catch {
    return 'התשובה לא נשמרה';
  }
}
