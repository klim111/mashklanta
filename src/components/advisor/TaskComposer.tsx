'use client';

import React, { useState } from 'react';
import { AlertTriangle, CalendarPlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PLAN_STAGES, STAGE_TASK_TEMPLATES } from '@/lib/advisor-crm';
import type { PlanStageId } from '@/lib/advisor-crm';
import { stageLabel } from './ui';
import { fromLocalInputValue } from './ui';
import type { NewTaskInput } from './useAdvisorCrm';

/** הערך שמייצג "בלי שיוך ללקוח" בבורר הלקוח */
const NO_CLIENT = '';

interface TaskFormProps {
  /** כשהוא קבוע — הטופס נפתח מתוך לקוח מסוים ואין מה לבחור */
  clientId?: string;
  clients?: Array<{ id: string; name: string }>;
  /** כשהוא קבוע — הטופס נפתח מתוך שלב מסוים */
  stage?: PlanStageId;
  onCreate: (input: NewTaskInput) => Promise<string | null>;
  /** נקרא אחרי יצירה מוצלחת — סגירת הטופס או הדיאלוג שמסביבו */
  onDone?: () => void;
  onCancel?: () => void;
  /** הצעות מוכנות לשלב, בלחיצה אחת */
  showTemplates?: boolean;
}

/**
 * שדות המשימה החדשה.
 *
 * המשימה תמיד יושבת על שלב, אבל השיוך ללקוח הוא רשות: משימה בלי לקוח היא
 * משימה של היועץ עצמו, והיא מופיעה בלוח השנה ובסדר היום בדיוק כמו כל אחרת.
 */
export function TaskForm({
  clientId,
  clients,
  stage,
  onCreate,
  onDone,
  onCancel,
  showTemplates = true,
}: TaskFormProps) {
  const [targetClient, setTargetClient] = useState(clientId ?? NO_CLIENT);
  const [targetStage, setTargetStage] = useState<PlanStageId>(stage ?? 'ANALYSIS');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeClient = clientId ?? targetClient;
  const activeStage = stage ?? targetStage;

  const create = async (taskTitle: string) => {
    setBusy(true);
    const failure = await onCreate({
      clientId: activeClient || null,
      stage: activeStage,
      title: taskTitle,
      details: details.trim() || undefined,
      dueDate: fromLocalInputValue(due),
    });
    setBusy(false);

    if (failure) {
      setError(failure);
      return;
    }
    setTitle('');
    setDetails('');
    setDue('');
    setError(null);
    onDone?.();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('כתבו מה צריך לעשות');
      return;
    }
    await create(title.trim());
  };

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        {!clientId && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-700">לקוח</span>
            <select
              value={targetClient}
              onChange={(event) => setTargetClient(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"
            >
              <option value={NO_CLIENT}>ללא שיוך ללקוח</option>
              {(clients ?? []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {!stage && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-700">שלב בתהליך</span>
            <select
              value={targetStage}
              onChange={(event) => setTargetStage(event.target.value as PlanStageId)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"
            >
              {PLAN_STAGES.map((item, index) => (
                <option key={item} value={item}>
                  שלב {index + 1} · {stageLabel(item)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="מה צריך לעשות"
        className="h-9 bg-white text-sm"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-700">
            תאריך ושעה לביצוע
          </span>
          <Input
            type="datetime-local"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className="h-9 bg-white text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-700">פירוט (לא חובה)</span>
          <Input
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            className="h-9 bg-white text-sm"
            placeholder="פרטים נוספים"
          />
        </label>
      </div>

      {showTemplates && (
        <div className="flex flex-wrap gap-1.5">
          {STAGE_TASK_TEMPLATES[activeStage].map((template) => (
            <button
              key={template}
              type="button"
              disabled={busy}
              onClick={() => void create(template)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700"
            >
              + {template}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={busy}>
          <CalendarPlus className="ml-1 h-3.5 w-3.5" />
          {busy ? 'מוסיף...' : 'הוסף משימה'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={onCancel}
          >
            ביטול
          </Button>
        )}
      </div>
    </form>
  );
}

type TaskComposerProps = Omit<TaskFormProps, 'onDone' | 'onCancel'>;

/**
 * פתיחת משימה חדשה במקום שבו היא מוצגת — כפתור שנפתח לטופס באותו אזור, בלי
 * לעזוב את ההקשר שממנו נלחץ.
 */
export function TaskComposer(props: TaskComposerProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 text-xs"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        משימה חדשה
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
      <TaskForm {...props} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
    </div>
  );
}
