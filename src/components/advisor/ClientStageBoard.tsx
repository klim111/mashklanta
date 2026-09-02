'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarPlus,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NOTE_VISIBILITY_LABELS, formatDate, formatTime } from '@/lib/advisor-crm';
import type { NoteVisibility, PlanStageId } from '@/lib/advisor-crm';
import { StageIcon, stageGradient, stageLabel } from './ui';
import { MeetingDialog } from './MeetingDialog';
import { MeetingRow } from './MeetingRow';
import { TaskComposer } from './TaskComposer';
import { TaskRow } from './TaskRow';
import {
  useAdvisorNotes,
  useAdvisorTasks,
  useClientProcess,
  useMeetings,
} from './useAdvisorCrm';

/**
 * חמשת השלבים של הלקוח בעיני היועץ.
 *
 * ההתקדמות נקראת מתהליך התכנון של הלקוח — אותם חמישה שלבים שהוא רואה אצלו —
 * ולכן שלב שהלקוח סגר לבד מופיע כאן כ"בוצע על ידי הלקוח". על גבי ההתקדמות
 * הזו היועץ מנהל את המשימות, ההערות והפגישות שלו לכל שלב.
 */
export function ClientStageBoard({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [openStage, setOpenStage] = useState<PlanStageId | null>(null);
  const [meetingStage, setMeetingStage] = useState<PlanStageId | null>(null);
  const [meetingOpen, setMeetingOpen] = useState(false);

  const { process, ready, error, refresh } = useClientProcess(clientId, planId);
  const tasks = useAdvisorTasks({ clientId, includeClosed: true });
  const notes = useAdvisorNotes({ clientId });
  const meetings = useMeetings({ clientId });

  // השלב הנוכחי נפתח מעצמו, כי שם נמצאת העבודה ברגע זה
  useEffect(() => {
    if (process && openStage === null) setOpenStage(process.currentStage);
  }, [process, openStage]);

  const refreshAll = async () => {
    await Promise.all([refresh(), tasks.refresh(), notes.refresh(), meetings.refresh()]);
  };

  if (!ready) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || !process) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        {error ?? 'לא הצלחנו לטעון את שלבי התהליך'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-slate-900">חמשת שלבי התהליך</p>
          {process.planId ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
              {process.progress}% הושלמו
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
              הלקוח עדיין לא פתח תהליך
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {process.plans.length > 1 && (
            <select
              value={process.planId ?? ''}
              onChange={(event) => setPlanId(event.target.value || undefined)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
              aria-label="בחירת נכס"
            >
              {process.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.propertyAddress || plan.name}
                </option>
              ))}
            </select>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              setMeetingStage(null);
              setMeetingOpen(true);
            }}
          >
            <CalendarPlus className="ml-1 h-3.5 w-3.5" />
            קבע פגישה
          </Button>
        </div>
      </div>

      {process.stages.map((stageView, index) => {
        const stage = stageView.stage;
        const isOpen = openStage === stage;
        const isCurrent = process.planId !== null && process.currentStage === stage;
        const stageTasks = tasks.tasks.filter((task) => task.stage === stage);
        const stageNotes = notes.notes.filter((note) => note.stage === stage);
        const stageMeetings = meetings.meetings.filter((meeting) => meeting.stage === stage);
        const openTasks = stageTasks.filter(
          (task) => task.status === 'OPEN' || task.status === 'IN_PROGRESS'
        ).length;

        return (
          <section
            key={stage}
            className={`overflow-hidden rounded-2xl border bg-white ${
              isCurrent ? 'border-blue-400 shadow-md' : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenStage(isOpen ? null : stage)}
              className="flex w-full flex-wrap items-center gap-2.5 p-3 text-right"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                  stageView.completedByClient
                    ? 'bg-emerald-500'
                    : `bg-gradient-to-br ${stageGradient(stage)}`
                }`}
              >
                {stageView.completedByClient ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <StageIcon stage={stage} className="h-4 w-4" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-slate-900">
                  שלב {index + 1} · {stageLabel(stage)}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {stageView.completedByClient ? (
                    <span className="font-bold text-emerald-600">
                      בוצע על ידי הלקוח
                      {stageView.completedAt && ` · ${formatDate(stageView.completedAt)}`}
                    </span>
                  ) : isCurrent ? (
                    <span className="font-bold text-blue-600">השלב הנוכחי של הלקוח</span>
                  ) : stageView.status === 'IN_PROGRESS' ? (
                    'בעבודה'
                  ) : (
                    'טרם התחיל'
                  )}
                </span>
              </span>

              <span className="flex flex-wrap items-center gap-1.5">
                {openTasks > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    {openTasks} משימות
                  </span>
                )}
                {stageNotes.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {stageNotes.length} הערות
                  </span>
                )}
                {stageMeetings.length > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {stageMeetings.length} פגישות
                  </span>
                )}
              </span>

              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isOpen && (
              <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-3">
                {/* משימות השלב */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-700">המשימות שלי בשלב</p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[11px]"
                        onClick={() => {
                          setMeetingStage(stage);
                          setMeetingOpen(true);
                        }}
                      >
                        <CalendarPlus className="ml-1 h-3.5 w-3.5" />
                        קבע פגישה בשלב
                      </Button>
                      <TaskComposer
                        clientId={clientId}
                        stage={stage}
                        onCreate={async (input) => {
                          const failure = await tasks.create(input);
                          if (!failure) await refresh();
                          return failure;
                        }}
                      />
                    </div>
                  </div>

                  {stageTasks.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-center text-[11px] text-slate-400">
                      אין עדיין משימות בשלב הזה. הוסיפו משימה וקבעו לה תאריך — היא תופיע בלוח השנה.
                    </p>
                  ) : (
                    stageTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        showStage={false}
                        onToggle={(status) => void tasks.update(task.id, { status })}
                        onReschedule={(dueDate) => void tasks.update(task.id, { dueDate })}
                        onDelete={() => void tasks.remove(task.id)}
                      />
                    ))
                  )}
                </div>

                {/* הערות השלב */}
                <StageNotes
                  notes={stageNotes}
                  onCreate={(body, visibility) => notes.create({ stage, body, visibility })}
                  onVisibility={(noteId, visibility) => void notes.setVisibility(noteId, visibility)}
                  onDelete={(noteId) => void notes.remove(noteId)}
                />

                {/* פגישות השלב */}
                {stageMeetings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-black text-slate-700">פגישות בשלב</p>
                    {stageMeetings.map((meeting) => (
                      <MeetingRow
                        key={meeting.id}
                        meeting={meeting}
                        viewer="advisor"
                        linkToClient={false}
                        onCancel={() => void meetings.cancel(meeting.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}

      <MeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        clientId={clientId}
        clientName={clientName}
        stage={meetingStage}
        onSubmit={async (input) => {
          const failure = await meetings.propose(input);
          if (!failure) await refreshAll();
          return failure;
        }}
      />
    </div>
  );
}

/**
 * ההערות של היועץ בשלב.
 *
 * לכל הערה יש בחירה אחת מהותית: להישאר אישית אצל היועץ, או להישלח ללקוח —
 * ואז היא מופיעה אצלו באותו שלב, בשם היועץ. הבחירה ניתנת לשינוי גם אחר כך.
 */
function StageNotes({
  notes,
  onCreate,
  onVisibility,
  onDelete,
}: {
  notes: Array<{
    id: string;
    body: string;
    visibility: NoteVisibility;
    advisorName: string;
    createdAt: string;
  }>;
  onCreate: (body: string, visibility: NoteVisibility) => Promise<string | null>;
  onVisibility: (noteId: string, visibility: NoteVisibility) => void;
  onDelete: (noteId: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (visibility: NoteVisibility) => {
    if (!draft.trim()) return;
    setBusy(true);
    const failure = await onCreate(draft.trim(), visibility);
    setBusy(false);
    if (!failure) setDraft('');
  };

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-black text-slate-700">
        <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
        הערות בשלב
      </p>

      {notes.map((note) => (
        <div
          key={note.id}
          className={`rounded-xl border p-2.5 ${
            note.visibility === 'SHARED'
              ? 'border-emerald-200 bg-emerald-50/60'
              : 'border-slate-200 bg-white'
          }`}
        >
          <p className="whitespace-pre-wrap text-sm text-slate-800">{note.body}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
            <span
              className={`flex items-center gap-1 font-bold ${
                note.visibility === 'SHARED' ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {note.visibility === 'SHARED' ? (
                <Eye className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {NOTE_VISIBILITY_LABELS[note.visibility]}
            </span>
            <span>
              {formatDate(note.createdAt)} · {formatTime(note.createdAt)}
            </span>

            <button
              type="button"
              onClick={() =>
                onVisibility(note.id, note.visibility === 'SHARED' ? 'PRIVATE' : 'SHARED')
              }
              className="ms-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 font-bold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700"
            >
              {note.visibility === 'SHARED' ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  החזר להערה אישית
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  שלח ללקוח
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onDelete(note.id)}
              aria-label="מחיקת הערה"
              className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="הערה לשלב הזה"
          className="h-9 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px]"
            disabled={busy || !draft.trim()}
            onClick={() => void submit('PRIVATE')}
          >
            <Lock className="ml-1 h-3.5 w-3.5" />
            שמור כהערה אישית
          </Button>
          <Button
            size="sm"
            className="h-8 text-[11px]"
            disabled={busy || !draft.trim()}
            onClick={() => void submit('SHARED')}
          >
            <Send className="ml-1 h-3.5 w-3.5" />
            שלח ללקוח
          </Button>
        </div>
      </div>
    </div>
  );
}
