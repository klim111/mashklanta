'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, ArrowLeft, CalendarPlus, Info, X, Zap } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/advisor-crm';
import type { AgendaTarget, ClientTask } from '@/lib/client-agenda';
import { StageChip } from '@/components/advisor/ui';

const TONES = {
  urgent: { icon: AlertCircle, ring: 'border-rose-200 bg-rose-50/60', badge: 'bg-rose-100 text-rose-700', label: 'דחוף' },
  action: { icon: Zap, ring: 'border-slate-200 bg-white', badge: 'bg-blue-100 text-blue-700', label: 'לביצוע' },
  info: { icon: Info, ring: 'border-slate-200 bg-slate-50/70', badge: 'bg-slate-200 text-slate-700', label: 'לידיעה' },
} as const;

/** `datetime-local` עובד בזמן מקומי, ולכן ההמרה נעשית ידנית ולא דרך toISOString */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * משימה אחת של הלקוח.
 *
 * לחיצה על גוף המשימה מובילה למקום שבו עושים אותה, ולצדה אפשר לקבוע מועד
 * ושעה לביצוע — המועד משבץ את המשימה בלוח השנה ומעביר אותה לקבוצה המתאימה.
 */
export function TaskItem({
  task,
  compact = false,
  overdue = false,
  onOpen,
  onSchedule,
}: {
  task: ClientTask;
  compact?: boolean;
  /** המועד שנקבע כבר עבר והמשימה לא הושלמה */
  overdue?: boolean;
  onOpen: (target: AgendaTarget) => void;
  /** קביעת מועד או ביטולו. בלעדיה המשימה מוצגת בלי אפשרות תזמון */
  onSchedule?: (due: string | null) => void;
}) {
  const tone = TONES[task.tone];
  const Icon = overdue ? AlertTriangle : tone.icon;
  const [picking, setPicking] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (picking) inputRef.current?.focus();
  }, [picking]);

  const shell = overdue
    ? 'border-rose-300 bg-rose-50'
    : task.scheduled
      ? 'border-blue-200 bg-blue-50/40'
      : tone.ring;

  return (
    <div className={`rounded-xl border px-3 py-2.5 transition-colors ${shell}`}>
      <button
        type="button"
        onClick={() => onOpen(task.target)}
        className="flex w-full items-start gap-3 text-right"
      >
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            overdue ? 'bg-rose-200 text-rose-800' : tone.badge
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block font-black leading-snug text-slate-900 ${compact ? 'text-sm' : 'text-[15px]'}`}>
            {task.title}
          </span>
          {!compact && <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">{task.hint}</span>}
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span
              className={`rounded-full px-2 py-0.5 font-bold ${
                overdue ? 'bg-rose-200 text-rose-900' : tone.badge
              }`}
            >
              {overdue ? 'המועד עבר' : tone.label}
            </span>
            {task.due && (
              <span className={`font-semibold ${overdue ? 'text-rose-700' : ''}`}>
                {formatDate(task.due)} · {formatTime(task.due)}
              </span>
            )}
            {!compact && task.stage && <StageChip stage={task.stage} />}
          </span>
        </span>
        <ArrowLeft className="mt-2 h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {onSchedule && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 border-t border-slate-200/70 pt-2">
          {picking ? (
            <>
              <input
                ref={inputRef}
                type="datetime-local"
                defaultValue={toLocalInput(task.due)}
                onChange={(event) => {
                  const next = fromLocalInput(event.target.value);
                  if (next) {
                    onSchedule(next);
                    setPicking(false);
                  }
                }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-bold text-slate-800 outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setPicking(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="ביטול"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPicking(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-black transition-colors ${
                  overdue
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                <CalendarPlus className="h-4 w-4" />
                {overdue ? 'קביעת מועד חדש' : task.scheduled ? 'שינוי המועד' : 'קביעת מועד ושעה'}
              </button>
              {task.scheduled && (
                <button
                  type="button"
                  onClick={() => onSchedule(null)}
                  className="rounded-lg px-2.5 py-1.5 text-[13px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  הסרת המועד
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
