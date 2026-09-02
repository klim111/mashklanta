'use client';

import React, { useMemo, useState } from 'react';
import { ListChecks, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLAN_STAGES, taskIsClosed, taskIsOverdue } from '@/lib/advisor-crm';
import type { PlanStageId } from '@/lib/advisor-crm';
import { EmptyState, StageIcon, stageGradient, stageLabel } from './ui';
import { TaskComposer } from './TaskComposer';
import { TaskRow } from './TaskRow';
import { useAdvisorTasks } from './useAdvisorCrm';
import type { AdvisorClient } from './useAdvisorClients';

/**
 * לוח המשימות של היועץ, מסודר לפי חמשת השלבים של כלי תכנון המשכנתא.
 *
 * זו הסיבה שהשלבים כאן זהים לאלה שבצד הלקוח: משימה שייכת לשלב שבו הלקוח באמת
 * נמצא, ולכן העמודה שבה היא יושבת אומרת מיד מה מצב התיק.
 */
export function TasksPanel({
  clients,
  onChanged,
}: {
  clients: AdvisorClient[];
  onChanged?: () => void;
}) {
  const [clientFilter, setClientFilter] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  const { tasks, ready, create, update, remove } = useAdvisorTasks({
    clientId: clientFilter || undefined,
    includeClosed: showClosed,
  });

  const byStage = useMemo(() => {
    const map = new Map<PlanStageId, typeof tasks>();
    PLAN_STAGES.forEach((stage) => map.set(stage, []));
    tasks.forEach((task) => map.get(task.stage)?.push(task));
    return map;
  }, [tasks]);

  const openCount = tasks.filter((task) => !taskIsClosed(task.status)).length;
  const overdueCount = tasks.filter((task) => taskIsOverdue(task)).length;

  const afterChange = async () => {
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900">
          <ListChecks className="h-4 w-4 text-blue-600" />
          המשימות שלי
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
            {openCount} פתוחות
          </span>
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
              {overdueCount} באיחור
            </span>
          )}
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <select
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
            aria-label="סינון לפי לקוח"
          >
            <option value="">כל הלקוחות</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant={showClosed ? 'default' : 'outline'}
            className="h-9 text-xs"
            onClick={() => setShowClosed((value) => !value)}
          >
            {showClosed ? 'מציג גם שהושלמו' : 'הצג גם שהושלמו'}
          </Button>
        </div>
      </div>

      <TaskComposer
        clients={clients.map((client) => ({ id: client.id, name: client.name }))}
        onCreate={async (input) => {
          const failure = await create(input);
          if (!failure) await afterChange();
          return failure;
        }}
      />

      {!ready ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-6 w-6" />}
          title="אין משימות פתוחות"
          hint="פתחו משימה ללקוח בשלב שבו הוא נמצא, וקבעו לה תאריך — היא תופיע כאן ובלוח השנה."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {PLAN_STAGES.map((stage, index) => {
            const stageTasks = byStage.get(stage) ?? [];
            if (stageTasks.length === 0) return null;

            return (
              <section
                key={stage}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <header
                  className={`flex items-center gap-2 bg-gradient-to-l ${stageGradient(
                    stage
                  )} px-3 py-2 text-white`}
                >
                  <StageIcon stage={stage} className="h-4 w-4" />
                  <span className="text-xs font-black">
                    שלב {index + 1} · {stageLabel(stage)}
                  </span>
                  <span className="ms-auto rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">
                    {stageTasks.length}
                  </span>
                </header>

                <div className="space-y-2 p-3">
                  {stageTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      showClient
                      showStage={false}
                      onToggle={async (status) => {
                        await update(task.id, { status });
                        await afterChange();
                      }}
                      onReschedule={async (dueDate) => {
                        await update(task.id, { dueDate });
                        await afterChange();
                      }}
                      onDelete={async () => {
                        await remove(task.id);
                        await afterChange();
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
