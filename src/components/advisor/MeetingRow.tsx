'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CalendarCheck2, CalendarClock, Clock, MapPin, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatDate,
  formatTime,
  meetingAwaits,
  meetingIsLive,
  meetingStatusLabel,
  relativeDayLabel,
} from '@/lib/advisor-crm';
import type { AdvisorMeetingView, MeetingParty, MeetingReply } from '@/lib/advisor-crm';
import { StageChip, fromLocalInputValue, toLocalInputValue } from './ui';
import { VideoCallButton } from '@/components/meeting-call/VideoCallButton';

const STATUS_STYLES: Record<AdvisorMeetingView['status'], string> = {
  PROPOSED: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  DECLINED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

interface MeetingRowProps {
  meeting: AdvisorMeetingView;
  /** מי מסתכל: היועץ רואה את שם הלקוח, והלקוח רואה את שם היועץ */
  viewer: 'advisor' | 'client';
  /**
   * קישור לדף הלקוח. פעיל אצל היועץ כברירת מחדל, כדי שלחיצה על פגישה בלוח השנה
   * תביא אותו ישר לשלבים, לתמהילים ולהערות של אותו לקוח — ומכובה כשהוא כבר שם.
   */
  linkToClient?: boolean;
  onCancel?: () => void;
  /**
   * תשובה לפגישה: אישור כשהיא ממתינה לצד שמסתכל, או הצעת מועד אחר — שמעבירה
   * אותה לאישור הצד השני
   */
  onAnswer?: (reply: MeetingReply) => Promise<string | null | void> | void;
}

/** פגישה אחת, באותה צורה בשני הצדדים */
export function MeetingRow({
  meeting,
  viewer,
  linkToClient = viewer === 'advisor',
  onCancel,
  onAnswer,
}: MeetingRowProps) {
  const party: MeetingParty = viewer === 'advisor' ? 'ADVISOR' : 'CLIENT';
  const awaitsMe = meetingAwaits(meeting, party);
  const live = meetingIsLive(meeting.status);
  const [proposing, setProposing] = useState(false);
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (reply: MeetingReply) => {
    if (!onAnswer) return;
    setBusy(true);
    setError(null);
    const failure = await onAnswer(reply);
    setBusy(false);
    if (failure) setError(failure);
    else setProposing(false);
  };

  const stop = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const body = (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300">
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <span className="text-[10px] font-bold leading-none">{formatDate(meeting.startsAt).slice(0, 5)}</span>
        <span className="text-xs font-black leading-tight">{formatTime(meeting.startsAt)}</span>
      </div>

      {/* רוחב מינימלי — בעמודה צרה הכפתורים יורדים שורה במקום לקצץ את הכותרת */}
      <div className="min-w-[9rem] flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{meeting.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">
            {viewer === 'advisor' ? meeting.clientName : meeting.advisorName}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {relativeDayLabel(meeting.startsAt)} · {meeting.durationMinutes} דק׳
          </span>
          {meeting.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3" />
              {meeting.location}
            </span>
          )}
          {meeting.stage && <StageChip stage={meeting.stage} />}
        </div>
        {meeting.note && <p className="mt-1 text-[11px] text-slate-500">{meeting.note}</p>}
      </div>

      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${awaitsMe ? 'bg-amber-500 text-white' : STATUS_STYLES[meeting.status]}`}
      >
        {meetingStatusLabel(meeting, party)}
      </span>

      {live && !proposing && <VideoCallButton meeting={meeting} />}

      {onAnswer && live && !proposing && (
        <div className="flex items-center gap-1.5">
          {awaitsMe && (
            <Button
              size="sm"
              className="h-8 text-[11px]"
              disabled={busy}
              onClick={(event) => {
                stop(event);
                void send({ action: 'accept' });
              }}
            >
              <CalendarCheck2 className="ml-1 h-3.5 w-3.5" />
              אשר את המועד
            </Button>
          )}
          <Button
            size="sm"
            variant={awaitsMe ? 'outline' : 'ghost'}
            className="h-8 text-[11px]"
            disabled={busy}
            onClick={(event) => {
              stop(event);
              setSlot(toLocalInputValue(meeting.startsAt));
              setProposing(true);
            }}
          >
            <CalendarClock className="ml-1 h-3.5 w-3.5" />
            {awaitsMe ? 'הצע מועד אחר' : 'שינוי מועד'}
          </Button>
        </div>
      )}

      {onCancel && live && (
        <button
          type="button"
          aria-label="ביטול הפגישה"
          onClick={(event) => {
            event.preventDefault();
            onCancel();
          }}
          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {proposing && (
        <div className="flex w-full flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          <span className="text-[11px] font-bold text-slate-600">מועד מוצע:</span>
          <input
            type="datetime-local"
            value={slot}
            onChange={(event) => setSlot(event.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 focus:border-blue-400 focus:outline-none"
          />
          <Button
            size="sm"
            className="h-8 text-[11px]"
            disabled={busy || !fromLocalInputValue(slot) || fromLocalInputValue(slot) === meeting.startsAt}
            onClick={(event) => {
              stop(event);
              const startsAt = fromLocalInputValue(slot);
              if (startsAt) void send({ action: 'propose', startsAt });
            }}
          >
            <Send className="ml-1 h-3.5 w-3.5" />
            {viewer === 'advisor' ? 'שליחה לאישור הלקוח' : 'שליחה לאישור היועץ'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-[11px] text-slate-500"
            onClick={(event) => {
              stop(event);
              setProposing(false);
            }}
          >
            ביטול
          </Button>
        </div>
      )}
      {error && <p className="w-full text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );

  // בזמן הצעת מועד השורה לא מקשרת לדף הלקוח, כדי שבחירת התאריך לא תנווט ממנה
  if (linkToClient && !proposing) {
    return (
      <Link href={`/advisor-dashboard/client/${meeting.clientId}`} className="block">
        {body}
      </Link>
    );
  }

  return body;
}
