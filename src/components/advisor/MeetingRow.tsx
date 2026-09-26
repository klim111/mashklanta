'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarCheck2, Clock, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MEETING_STATUS_LABELS,
  formatDate,
  formatTime,
  relativeDayLabel,
} from '@/lib/advisor-crm';
import type { AdvisorMeetingView } from '@/lib/advisor-crm';
import { StageChip } from './ui';

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
  onRespond?: (accepted: boolean) => void;
}

/** פגישה אחת, באותה צורה בשני הצדדים */
export function MeetingRow({
  meeting,
  viewer,
  linkToClient = viewer === 'advisor',
  onCancel,
  onRespond,
}: MeetingRowProps) {
  const body = (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300">
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <span className="text-[10px] font-bold leading-none">{formatDate(meeting.startsAt).slice(0, 5)}</span>
        <span className="text-xs font-black leading-tight">{formatTime(meeting.startsAt)}</span>
      </div>

      <div className="min-w-0 flex-1">
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
        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_STYLES[meeting.status]}`}
      >
        {MEETING_STATUS_LABELS[meeting.status]}
      </span>

      {onRespond && meeting.status === 'PROPOSED' && (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 text-[11px]"
            onClick={(event) => {
              event.preventDefault();
              onRespond(true);
            }}
          >
            <CalendarCheck2 className="ml-1 h-3.5 w-3.5" />
            אשר את המועד
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-[11px] text-slate-500"
            onClick={(event) => {
              event.preventDefault();
              onRespond(false);
            }}
          >
            לא מתאים
          </Button>
        </div>
      )}

      {onCancel && (meeting.status === 'PROPOSED' || meeting.status === 'CONFIRMED') && (
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
    </div>
  );

  if (linkToClient) {
    return (
      <Link href={`/advisor-dashboard/client/${meeting.clientId}`} className="block">
        {body}
      </Link>
    );
  }

  return body;
}
