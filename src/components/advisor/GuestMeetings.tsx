'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Copy, FolderOpen, Link2, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate, formatTime } from '@/lib/advisor-crm';
import type { GuestMeetingView } from '@/lib/guest-meetings';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { defaultMeetingSlot, fromLocalInputValue } from './ui';

/**
 * פגישות בלינק חד-פעמי (src/lib/guest-meetings.ts) באזור היועץ: הנתונים,
 * חלון הקביעה והשורה בלוח השנה.
 */

export function guestLinkUrl(meeting: Pick<GuestMeetingView, 'linkPath'>): string {
  return typeof window !== 'undefined' ? `${window.location.origin}${meeting.linkPath}` : meeting.linkPath;
}

export function useGuestMeetings(enabled = true) {
  const [meetings, setMeetings] = useState<GuestMeetingView[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch('/api/advisor/guest-meetings', { cache: 'no-store' });
      if (response.ok) {
        const next = (await response.json()) as GuestMeetingView[];
        setMeetings((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
      }
    } finally {
      setReady(true);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useLiveRefresh(() => void refresh(), enabled);

  const create = useCallback(
    async (input: { title: string; guestName: string; startsAt: string; note: string }) => {
      const response = await fetch('/api/advisor/guest-meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).catch(() => null);
      const body = await response?.json().catch(() => null);
      if (!response?.ok || !body?.id) return { error: body?.error ?? 'הפגישה לא נקבעה', meeting: null };
      await refresh();
      return { error: null, meeting: body as GuestMeetingView };
    },
    [refresh]
  );

  const cancel = useCallback(
    async (id: string) => {
      await fetch(`/api/advisor/guest-meetings/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
      await refresh();
    },
    [refresh]
  );

  return { meetings, ready, refresh, create, cancel };
}

function CopyLinkButton({ meeting, className = '' }: { meeting: GuestMeetingView; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(guestLinkUrl(meeting)).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'הועתק' : 'העתקת הלינק'}
    </button>
  );
}

const STATE_LABEL: Record<GuestMeetingView['state'], string> = {
  early: 'הלינק ייפתח במועד',
  open: 'הלינק פתוח עכשיו',
  expired: 'הלינק פג',
  cancelled: 'בוטלה',
};

/** פגישה בלינק חד-פעמי בלוח השנה — פגישה קבועה, בלי אישור של הצד השני */
export function GuestMeetingRow({ meeting, onCancel }: { meeting: GuestMeetingView; onCancel: () => void }) {
  const live = meeting.state === 'early' || meeting.state === 'open';
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-black text-slate-900">
            <Link2 className="h-4 w-4 shrink-0 text-violet-600" />
            <span className="truncate">{meeting.title}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {formatDate(meeting.startsAt)} · {formatTime(meeting.startsAt)}–{formatTime(meeting.endsAt)}
            {meeting.guestName ? ` · ${meeting.guestName}` : ''}
          </p>
          <p
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-2xs font-bold ${
              meeting.state === 'open'
                ? 'bg-emerald-100 text-emerald-800'
                : meeting.state === 'early'
                  ? 'bg-violet-100 text-violet-800'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            פגישה קבועה בלינק חד-פעמי · {STATE_LABEL[meeting.state]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {live && <CopyLinkButton meeting={meeting} />}
          {live && (
            <Link
              href={`/meeting/g/${meeting.id}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-black text-white hover:bg-violet-700"
            >
              <Video className="h-3.5 w-3.5" />
              כניסה לפגישה
            </Link>
          )}
          {meeting.clientId && (
            <Link
              href={`/advisor-dashboard/client/${meeting.clientId}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              {meeting.clientName ?? 'תיק הלקוח'}
            </Link>
          )}
          {live && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('לבטל את הפגישה? הלינק יפסיק לעבוד מיד')) onCancel();
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label="ביטול הפגישה"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * קביעת פגישה בלינק חד-פעמי, עם מי שאינו רשום. אחרי הקביעה מוצג הלינק
 * להעתקה; הוא תקף מהמועד ועוד שעה וחצי.
 */
export function GuestMeetingDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: ReturnType<typeof useGuestMeetings>['create'];
}) {
  const [title, setTitle] = useState('');
  const [guestName, setGuestName] = useState('');
  const [slot, setSlot] = useState(defaultMeetingSlot);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<GuestMeetingView | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setGuestName('');
    setSlot(defaultMeetingSlot());
    setNote('');
    setError(null);
    setCreated(null);
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const startsAt = fromLocalInputValue(slot);
    if (!startsAt) {
      setError('בחרו תאריך ושעה');
      return;
    }
    setBusy(true);
    const result = await onCreate({ title: title.trim(), guestName: guestName.trim(), startsAt, note: note.trim() });
    setBusy(false);
    if (result.error) setError(result.error);
    else setCreated(result.meeting);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg text-right">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-right">
            <Link2 className="h-5 w-5 text-violet-600" />
            פגישת וידאו בלינק חד-פעמי
          </DialogTitle>
          <DialogDescription className="text-right">
            למי שעדיין לא רשום. הפגישה נכנסת ללוח השנה כפגישה קבועה, והלינק תקף מהמועד ועוד שעה וחצי. האורח רואה רק
            את מסך הפגישה, ושום דבר שהוא מזין לא נשמר.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-black text-emerald-900">הפגישה נקבעה</p>
              <p className="mt-0.5 text-xs text-emerald-800">
                {formatDate(created.startsAt)} · {formatTime(created.startsAt)} · הלינק תקף עד {formatTime(created.endsAt)}
              </p>
              <code dir="ltr" className="mt-2 block break-all rounded-lg bg-white p-2 text-xs text-slate-800">
                {guestLinkUrl(created)}
              </code>
              <div className="mt-2 flex flex-wrap gap-1">
                <CopyLinkButton meeting={created} className="bg-white" />
                <Link
                  href={`/meeting/g/${created.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-black text-white hover:bg-violet-700"
                >
                  <Video className="h-3.5 w-3.5" />
                  לחדר הפגישה
                </Link>
              </div>
            </div>
            <Button type="button" variant="ghost" className="h-9 text-xs" onClick={() => onOpenChange(false)}>
              סגירה
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">נושא הפגישה</span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-10 text-sm"
                placeholder="פגישת היכרות"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-700">עם מי (לא חובה)</span>
                <Input value={guestName} onChange={(event) => setGuestName(event.target.value)} className="h-10 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-700">תאריך ושעה</span>
                <Input
                  type="datetime-local"
                  value={slot}
                  onChange={(event) => setSlot(event.target.value)}
                  className="h-10 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">הערה לעצמך (לא חובה)</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm"
              />
            </label>
            {error && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {error}
              </p>
            )}
            <DialogFooter className="gap-2 sm:justify-start">
              <Button type="submit" disabled={busy} className="h-9 bg-violet-600 text-xs hover:bg-violet-700">
                <Link2 className="ml-1 h-4 w-4" />
                {busy ? 'קובע…' : 'קביעה ויצירת לינק'}
              </Button>
              <Button type="button" variant="ghost" className="h-9 text-xs" onClick={() => onOpenChange(false)}>
                ביטול
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
