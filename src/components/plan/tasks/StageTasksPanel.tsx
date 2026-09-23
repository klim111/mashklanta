'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  FileUp,
  Landmark,
  ListChecks,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/advisor-crm';
import { STAGE_TASK_TEMPLATES } from '@/lib/client-tasks';
import type { ClientTaskView } from '@/lib/client-tasks';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import { DocumentUploadDialog } from '../documents/DocumentUploadDialog';
import { AddTaskDialog } from './AddTaskDialog';
import { useClientTasks } from './useClientTasks';

const KIND_ICONS = { TASK: ListChecks, MEETING: CalendarClock, DOCUMENT: FileUp } as const;

/**
 * המשימות המתוכננות של השלב — בתוך שולחן העבודה, מעל תוכן השלב.
 *
 * "הוסף משימה מתוכננת" פותח את התבניות של השלב וניסוח חופשי. משימה עם מועד
 * מופיעה גם בלוח השנה של האזור האישי; משימת מסמך נסגרת מהעלאת הקובץ לתיק.
 */
export function StageTasksPanel({ planId, stage }: { planId: string; stage: PlanStageId }) {
  const { tasks, ready, add, complete, attachDocument, remove } = useClientTasks({ planId, includeDone: true });
  const [addOpen, setAddOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState<ClientTaskView | null>(null);
  const [showDone, setShowDone] = useState(false);

  const stageTasks = useMemo(() => tasks.filter((task) => task.stage === stage), [tasks, stage]);
  const open = stageTasks.filter((task) => task.status === 'OPEN');
  const done = stageTasks.filter((task) => task.status === 'DONE');
  const journey = journeyStageFor(stage);
  const suggestions = STAGE_TASK_TEMPLATES[stage].length;

  return (
    <section className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ListChecks className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900">המשימות המתוכננות שלי · {journey.shortTitle}</h3>
            <p className="text-xs text-slate-500">
              {open.length === 0
                ? suggestions > 0
                  ? `יש ${suggestions} משימות מוצעות לשלב, ואפשר להוסיף כל משימה בניסוח חופשי`
                  : 'הוסיפו משימה, פגישה או מסמך בניסוח חופשי'
                : `${open.length} פתוחות${done.length ? ` · ${done.length} בוצעו` : ''}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-button font-black text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <CalendarPlus className="h-4 w-4" />
          הוסף משימה מתוכננת
        </button>
      </header>

      {ready && open.length > 0 && (
        <ul className="grid gap-2 border-t border-slate-100 px-5 py-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {open.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onComplete={() => void complete(task.id)}
                onUpload={() => setUploadFor(task)}
                onRemove={() => void remove(task.id)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {ready && done.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={() => setShowDone((value) => !value)}
            className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-800"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDone ? 'rotate-180' : ''}`} />
            {done.length} משימות שבוצעו
          </button>
          {showDone && (
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {done.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={() => void complete(task.id, false)}
                  onRemove={() => void remove(task.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <AddTaskDialog open={addOpen} onOpenChange={setAddOpen} planId={planId} stage={stage} onSubmit={add} />

      {uploadFor && (
        <DocumentUploadDialog
          open
          onOpenChange={(next) => {
            if (!next) setUploadFor(null);
          }}
          planId={planId}
          stage={stage}
          defaultTitle={uploadFor.title}
          onUploaded={(document) => void attachDocument(uploadFor.id, document.id)}
        />
      )}
    </section>
  );
}

function TaskRow({
  task,
  onComplete,
  onUpload,
  onRemove,
}: {
  task: ClientTaskView;
  onComplete: () => void;
  onUpload?: () => void;
  onRemove: () => void;
}) {
  const Icon = KIND_ICONS[task.kind];
  const isDone = task.status === 'DONE';
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 ${
        isDone ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isDone
            ? 'bg-emerald-600 text-white'
            : task.kind === 'MEETING'
              ? 'bg-violet-100 text-violet-700'
              : task.kind === 'DOCUMENT'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-700'
        }`}
      >
        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-black leading-snug ${isDone ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
          {task.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          {task.dueAt && (
            <span className="font-bold">
              {formatDate(task.dueAt)} · {formatTime(task.dueAt)}
            </span>
          )}
          {task.bank && (
            <span className="inline-flex items-center gap-1">
              <Landmark className="h-3 w-3" />
              בנק {task.bank}
            </span>
          )}
          {task.details && <span className="truncate">{task.details}</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!isDone && task.kind === 'DOCUMENT' && onUpload && (
          <button
            type="button"
            onClick={onUpload}
            title="העלאת המסמך לתיק"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-2xs font-black text-white hover:bg-emerald-700"
          >
            <Upload className="h-3.5 w-3.5" />
            העלאה
          </button>
        )}
        <button
          type="button"
          onClick={onComplete}
          title={isDone ? 'החזרה לפתוחות' : 'סימון כבוצעה'}
          className={`rounded-lg p-1.5 transition-colors ${
            isDone ? 'text-slate-400 hover:bg-slate-100' : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {isDone ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="מחיקה"
          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.li>
  );
}
