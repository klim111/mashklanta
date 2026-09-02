'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Send } from 'lucide-react';
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
import type { PlanStageId } from '@/lib/advisor-crm';
import { StageChip, defaultMeetingSlot, fromLocalInputValue } from './ui';
import type { NewMeetingInput } from './useAdvisorCrm';

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** הלקוח שהפגישה נקבעת איתו. כשהוא ריק, בוחרים אותו מהרשימה */
  clientId?: string;
  clientName?: string;
  clients?: Array<{ id: string; name: string }>;
  stage?: PlanStageId | null;
  onSubmit: (input: NewMeetingInput) => Promise<string | null>;
}

const DURATIONS = [30, 45, 60, 90];

/**
 * הצעת פגישה ללקוח: תאריך, שעה ומשך.
 *
 * הפגישה נכנסת ללוח השנה של היועץ מיד כפגישה מתוכננת, ומחכה לאישור הלקוח כדי
 * להפוך למאושרת — ולכן זו "שליחת הצעה" ולא קביעה חד-צדדית.
 */
export function MeetingDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  clients,
  stage = null,
  onSubmit,
}: MeetingDialogProps) {
  const [target, setTarget] = useState(clientId ?? '');
  const [title, setTitle] = useState('פגישת ייעוץ');
  const [slot, setSlot] = useState(defaultMeetingSlot);
  const [duration, setDuration] = useState(45);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // כל פתיחה מתחילה מהצעה נקייה, כדי שלא יישלח בטעות מועד משיחה קודמת
  useEffect(() => {
    if (!open) return;
    setTarget(clientId ?? '');
    setTitle('פגישת ייעוץ');
    setSlot(defaultMeetingSlot());
    setDuration(45);
    setLocation('');
    setNote('');
    setError(null);
  }, [open, clientId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const startsAt = fromLocalInputValue(slot);
    if (!target) {
      setError('בחרו לקוח לפגישה');
      return;
    }
    if (!startsAt) {
      setError('בחרו תאריך ושעה');
      return;
    }

    setBusy(true);
    const failure = await onSubmit({
      clientId: target,
      startsAt,
      title: title.trim() || 'פגישת ייעוץ',
      durationMinutes: duration,
      location: location.trim() || undefined,
      note: note.trim() || undefined,
      stage,
    });
    setBusy(false);

    if (failure) {
      setError(failure);
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg text-right">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-right">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            קביעת פגישה{clientName ? ` עם ${clientName}` : ''}
          </DialogTitle>
          <DialogDescription className="text-right">
            הפגישה תופיע בלוח השנה שלכם כפגישה מתוכננת. כשהלקוח יאשר את המועד היא תסומן כמאושרת.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {stage && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              נקבעת מתוך השלב
              <StageChip stage={stage} />
            </div>
          )}

          {!clientId && (
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">לקוח</span>
              <select
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">בחרו לקוח</option>
                {(clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">נושא הפגישה</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-10 text-sm"
              placeholder="פגישת ייעוץ"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">תאריך ושעה</span>
              <Input
                type="datetime-local"
                value={slot}
                onChange={(event) => setSlot(event.target.value)}
                className="h-10 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">משך</span>
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                {DURATIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} דקות
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">
              מיקום או קישור לשיחה
            </span>
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="h-10 text-sm"
              placeholder="במשרד / שיחת וידאו"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">
              הודעה ללקוח (לא חובה)
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm"
              placeholder="מה נעשה בפגישה, מה כדאי להביא"
            />
          </label>

          {error && (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={busy} className="h-9 text-xs">
              <Send className="ml-1 h-4 w-4" />
              {busy ? 'שולח...' : 'שלח הצעת פגישה'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-9 text-xs"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
