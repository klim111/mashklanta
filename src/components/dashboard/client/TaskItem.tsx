'use client';

import { AlertCircle, ArrowLeft, Info, Zap } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/advisor-crm';
import type { AgendaTarget, ClientTask } from '@/lib/client-agenda';
import { StageChip } from '@/components/advisor/ui';

const TONES = {
  urgent: { icon: AlertCircle, ring: 'border-rose-200 bg-rose-50/60', badge: 'bg-rose-100 text-rose-700', label: 'דחוף' },
  action: { icon: Zap, ring: 'border-slate-200 bg-white', badge: 'bg-blue-100 text-blue-700', label: 'לביצוע' },
  info: { icon: Info, ring: 'border-slate-200 bg-slate-50/70', badge: 'bg-slate-200 text-slate-700', label: 'לידיעה' },
} as const;

/** משימה אחת של הלקוח — לחיצה מובילה למקום שבו עושים אותה */
export function TaskItem({
  task,
  compact = false,
  onOpen,
}: {
  task: ClientTask;
  compact?: boolean;
  onOpen: (target: AgendaTarget) => void;
}) {
  const tone = TONES[task.tone];
  const Icon = tone.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(task.target)}
      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-right transition-colors hover:border-blue-300 ${tone.ring}`}
    >
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone.badge}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-black leading-snug text-slate-900 ${compact ? 'text-sm' : 'text-[15px]'}`}>
          {task.title}
        </span>
        {!compact && <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">{task.hint}</span>}
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className={`rounded-full px-2 py-0.5 font-bold ${tone.badge}`}>{tone.label}</span>
          {task.due && (
            <span className="font-semibold">
              {formatDate(task.due)} · {formatTime(task.due)}
            </span>
          )}
          {!compact && task.stage && <StageChip stage={task.stage} />}
        </span>
      </span>
      <ArrowLeft className="mt-2 h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}
