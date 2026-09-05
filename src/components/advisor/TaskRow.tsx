'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Check, Circle, Trash2, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDate, formatTime, taskIsOverdue } from '@/lib/advisor-crm';
import type { AdvisorTaskStatus, AdvisorTaskView, PlanStageId } from '@/lib/advisor-crm';
import { StageChip, fromLocalInputValue, toLocalInputValue } from './ui';

interface TaskRowProps {
  task: AdvisorTaskView;
  /** מוצג כשהרשימה מרכזת משימות של כמה לקוחות */
  showClient?: boolean;
  showStage?: boolean;
  onToggle: (status: AdvisorTaskStatus) => void;
  onReschedule?: (dueDate: string | null) => void;
  onDelete?: () => void;
}

/**
 * שורת משימה אחת.
 *
 * המועד ניתן לשינוי במקום, כי קביעת התאריך היא הפעולה שמכניסה את המשימה ללוח
 * השנה — ולכן היא צריכה להיות במרחק לחיצה מכל מקום שבו המשימה מוצגת.
 */
export function TaskRow({
  task,
  showClient = false,
  showStage = true,
  onToggle,
  onReschedule,
  onDelete,
}: TaskRowProps) {
  const [editingDate, setEditingDate] = useState(false);
  const done = task.status === 'DONE';
  const overdue = taskIsOverdue(task);

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border p-2.5 transition-colors ${
        done
          ? 'border-slate-100 bg-slate-50/60'
          : overdue
            ? 'border-red-200 bg-red-50/50'
            : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(done ? 'OPEN' : 'DONE')}
        aria-label={done ? 'החזר למשימה פתוחה' : 'סמן כבוצע'}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
          done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 text-transparent hover:border-emerald-400'
        }`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            done ? 'text-slate-400 line-through' : 'text-slate-900'
          }`}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          {showClient && (
            <Link
              href={`/advisor-dashboard/client/${task.clientId}`}
              className="flex items-center gap-1 font-semibold text-blue-700 hover:underline"
            >
              <UserRound className="h-3 w-3" />
              {task.clientName}
            </Link>
          )}
          {showStage && <StageChip stage={task.stage as PlanStageId} />}
          {task.details && <span className="truncate">{task.details}</span>}
        </div>
      </div>

      {editingDate && onReschedule ? (
        <Input
          type="datetime-local"
          autoFocus
          defaultValue={toLocalInputValue(task.dueDate)}
          onBlur={(event) => {
            onReschedule(fromLocalInputValue(event.target.value));
            setEditingDate(false);
          }}
          className="h-8 w-[190px] text-xs"
        />
      ) : (
        <button
          type="button"
          disabled={!onReschedule}
          onClick={() => setEditingDate(true)}
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors ${
            task.dueDate
              ? overdue
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700'
              : 'border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          <CalendarClock className="h-3 w-3" />
          {task.dueDate
            ? `${formatDate(task.dueDate)} · ${formatTime(task.dueDate)}`
            : 'קבעו תאריך'}
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="מחיקת משימה"
          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
