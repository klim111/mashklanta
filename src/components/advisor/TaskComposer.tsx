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

interface TaskComposerProps {
  /** כשהוא קבוע — הטופס נפתח מתוך לקוח מסוים ואין מה לבחור */
  clientId?: string;
  clients?: Array<{ id: string; name: string }>;
  /** כשהוא קבוע — הטופס נפתח מתוך שלב מסוים */
  stage?: PlanStageId;
  onCreate: (input: NewTaskInput) => Promise<string | null>;
  /** הצעות מוכנות לשלב, בלחיצה אחת */
  showTemplates?: boolean;
}

/**
 * פתיחת משימה חדשה.
 *
 * המשימה תמיד יושבת על לקוח ועל שלב — אלה שני השדות שאי אפשר בלעדיהם, כי בלי
 * שיוך אין למשימה מקום לא בלוח השלבים של הלקוח ולא בלוח השנה.
 */
export function TaskComposer({
  clientId,
  clients,
  stage,
  onCreate,
  showTemplates = true,
}: TaskComposerProps) {
  const [open, setOpen] = useState(false);
  const [targetClient, setTargetClient] = useState(clientId ?? '');
  const [targetStage, setTargetStage] = useState<PlanStageId>(stage ?? 'ANALYSIS');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeClient = clientId ?? targetClient;
  const activeStage = stage ?? targetStage;

  const create = async (taskTitle: string) => {
    if (!activeClient) {
      setError('בחרו לקוח למשימה');
      return;
    }
    setBusy(true);
    const failure = await onCreate({
      clientId: activeClient,
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
    setOpen(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('כתבו מה צריך לעשות');
      return;
    }
    await create(title.trim());
  };

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
    <form
      onSubmit={submit}
      className="space-y-2.5 rounded-xl border border-blue-200 bg-blue-50/40 p-3"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {!clientId && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-700">לקוח</span>
            <select
              value={targetClient}
              onChange={(event) => setTargetClient(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"
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
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs"
          onClick={() => setOpen(false)}
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}
