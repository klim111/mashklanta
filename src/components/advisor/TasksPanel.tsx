"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ListChecks,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PLAN_STAGES,
  formatDate,
  formatTime,
  taskIsClosed,
  taskIsOverdue,
} from "@/lib/advisor-crm";
import type { AdvisorTaskView, PlanStageId } from "@/lib/advisor-crm";
import { EmptyState, StageIcon, stageGradient, stageLabel } from "./ui";
import { TaskComposer } from "./TaskComposer";
import { TaskRow } from "./TaskRow";
import { useAdvisorTasks, useDeletedAdvisorTasks } from "./useAdvisorCrm";
import type { AdvisorClient } from "./useAdvisorClients";

/** הערך שמסמן בבורר הלקוח את המשימות שאינן משויכות לאף לקוח */
const UNASSIGNED = "none";

/** הרשימה שמוצגת: המשימות הפתוחות, אלה שבוצעו, או רישום אלה שנמחקו */
type TasksView = "open" | "done" | "deleted";

/**
 * לוח המשימות של היועץ, מסודר לפי חמשת השלבים של כלי תכנון המשכנתא.
 *
 * זו הסיבה שהשלבים כאן זהים לאלה שבצד הלקוח: משימה שייכת לשלב שבו הלקוח באמת
 * נמצא, ולכן העמודה שבה היא יושבת אומרת מיד מה מצב התיק.
 */
export function TasksPanel({
  clients,
  onChanged,
  initialClientId,
}: {
  clients: AdvisorClient[];
  onChanged?: () => void;
  /** לקוח שהגיעו אליו מדף הלקוח — הרשימה נפתחת מסוננת אליו */
  initialClientId?: string;
}) {
  const router = useRouter();
  const [clientFilter, setClientFilter] = useState(initialClientId ?? "");
  const [view, setView] = useState<TasksView>("open");

  const { tasks, ready, create, update, remove } = useAdvisorTasks({
    clientId: clientFilter || undefined,
    onlyDone: view === "done",
  });
  const deleted = useDeletedAdvisorTasks(view === "deleted");

  /** פתיחת תיק הלקוח של המשימה */
  const openClientFile = (task: AdvisorTaskView) => {
    if (task.clientId)
      router.push(`/advisor-dashboard/client/${task.clientId}`);
  };

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
          {view === "open" && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
              {openCount} פתוחות
            </span>
          )}
          {view === "open" && overdueCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              {overdueCount} שהמועד שלהן עבר
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
            <option value={UNASSIGNED}>ללא שיוך ללקוח</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {view === "open" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 text-xs"
                onClick={() => setView("done")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                משימות שבוצעו
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 text-xs"
                onClick={() => setView("deleted")}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                משימות שנמחקו
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="default"
              className="h-9 gap-1.5 text-xs"
              onClick={() => setView("open")}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              חזרה למשימות הפתוחות
            </Button>
          )}
        </div>
      </div>

      {view === "done" && (
        <DoneTasksList
          tasks={tasks}
          ready={ready}
          onReopen={async (taskId) => {
            await update(taskId, { status: "OPEN" });
            await afterChange();
          }}
          onDelete={async (taskId) => {
            await remove(taskId);
            await afterChange();
          }}
          onOpenClientFile={openClientFile}
        />
      )}

      {view === "deleted" && (
        <DeletedTasksList
          items={deleted.items.filter((item) =>
            !clientFilter
              ? true
              : clientFilter === UNASSIGNED
                ? !item.clientId
                : item.clientId === clientFilter,
          )}
          ready={deleted.ready}
        />
      )}

      {view === "open" && (
        <>
          <TaskComposer
            clients={clients.map((client) => ({
              id: client.id,
              name: client.name,
            }))}
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
              hint="פתחו משימה — ללקוח בשלב שבו הוא נמצא, או לעצמכם בלי שיוך — וקבעו לה תאריך, כדי שתופיע כאן ובלוח השנה."
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
                        stage,
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
                          onOpenClientFile={
                            task.clientId
                              ? () => openClientFile(task)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** המשימות שבוצעו, מהאחרונה שבוצעה. כל אחת אפשר להחזיר לפתוחות או למחוק */
function DoneTasksList({
  tasks,
  ready,
  onReopen,
  onDelete,
  onOpenClientFile,
}: {
  tasks: AdvisorTaskView[];
  ready: boolean;
  onReopen: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onOpenClientFile: (task: AdvisorTaskView) => void;
}) {
  if (!ready) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-6 w-6" />}
        title="עוד אין משימות שבוצעו"
        hint="משימה שמסמנים בה ״משימה בוצעה״ יוצאת מהרשימה הפתוחה ונשמרת כאן."
      />
    );
  }
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center gap-2 bg-gradient-to-l from-emerald-600 to-teal-600 px-3 py-2 text-white">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs font-black">משימות שבוצעו</span>
        <span className="ms-auto rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">
          {tasks.length}
        </span>
      </header>
      <div className="space-y-2 p-3">
        {tasks.map((task) => (
          <div key={task.id} className="space-y-1">
            <TaskRow
              task={task}
              showClient
              onToggle={() => onReopen(task.id)}
              onDelete={() => onDelete(task.id)}
              onOpenClientFile={
                task.clientId ? () => onOpenClientFile(task) : undefined
              }
            />
            {task.completedAt && (
              <p className="ps-10 text-[11px] text-emerald-700">
                בוצעה ב־{formatDate(task.completedAt)} ·{" "}
                {formatTime(task.completedAt)}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** רישום המשימות שנמחקו — לקריאה בלבד, כדי שתמיד יהיה ברור מה נמחק ומתי */
function DeletedTasksList({
  items,
  ready,
}: {
  items: ReturnType<typeof useDeletedAdvisorTasks>["items"];
  ready: boolean;
}) {
  if (!ready) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Trash2 className="h-6 w-6" />}
        title="לא נמחקו משימות"
        hint="משימה שנמחקת יוצאת מהרשימות, ורישום שלה נשמר כאן."
      />
    );
  }
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center gap-2 bg-gradient-to-l from-slate-600 to-slate-700 px-3 py-2 text-white">
        <Trash2 className="h-4 w-4" />
        <span className="text-xs font-black">משימות שנמחקו</span>
        <span className="ms-auto rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">
          {items.length}
        </span>
      </header>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-500 line-through">
                {item.title}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                  {item.clientName ?? "ללא שיוך ללקוח"}
                </span>
                <span>שלב {stageLabel(item.stage)}</span>
                {item.status === "DONE" && (
                  <span className="text-emerald-700">בוצעה לפני המחיקה</span>
                )}
                {item.details && (
                  <span className="truncate">{item.details}</span>
                )}
              </div>
            </div>
            <span className="text-[11px] font-semibold text-red-600">
              נמחקה ב־{formatDate(item.deletedAt)} ·{" "}
              {formatTime(item.deletedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
