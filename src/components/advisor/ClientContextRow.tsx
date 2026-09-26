'use client';

import React from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  FileText,
  ListChecks,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { meetingIsLive, relativeDayLabel, formatTime, taskIsClosed, taskIsOverdue } from '@/lib/advisor-crm';
import type { AdvisorMeetingView, AdvisorTaskStatus, AdvisorTaskView } from '@/lib/advisor-crm';
import type { ClientDocumentView } from './clientDetail';
import { EmptyState, SectionCard } from './ui';
import { MeetingRow } from './MeetingRow';
import { TaskRow } from './TaskRow';

interface ClientContextRowProps {
  clientId: string;
  clientName: string;
  documents: ClientDocumentView[];
  meetings: AdvisorMeetingView[];
  tasks: AdvisorTaskView[];
  onScheduleMeeting: () => void;
  onAddTask: () => void;
  onCancelMeeting: (meetingId: string) => void;
  onTaskStatus: (taskId: string, status: AdvisorTaskStatus) => void;
  onTaskReschedule: (taskId: string, dueDate: string | null) => void;
  onTaskDelete: (taskId: string) => void;
}

/**
 * השורה שמתחת למסך הראשי, ונשארת כשהוא מתחלף בין השלבים.
 *
 * שלושת הדברים שרלוונטיים ללקוח בכל שלב: תיק המסמכים שלו, הפגישות הקרובות איתו
 * — עם מעבר ללוח השנה ורשימת הפגישות שנקבעו מתחתיו — והמשימות שמשויכות אליו.
 */
export function ClientContextRow({
  clientId,
  clientName,
  documents,
  meetings,
  tasks,
  onScheduleMeeting,
  onAddTask,
  onCancelMeeting,
  onTaskStatus,
  onTaskReschedule,
  onTaskDelete,
}: ClientContextRowProps) {
  const submitted = documents.filter((doc) => doc.status !== 'PENDING').length;
  const remaining = documents.filter((doc) => doc.status === 'PENDING').length;

  const now = Date.now();
  const upcoming = meetings
    .filter((meeting) => meetingIsLive(meeting.status) && new Date(meeting.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const nextMeeting = upcoming[0] ?? null;

  const openTasks = tasks.filter((task) => !taskIsClosed(task.status));
  const overdue = openTasks.filter((task) => taskIsOverdue(task)).length;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* תיק המסמכים */}
      <SectionCard
        title="תיק המסמכים"
        icon={<FileText className="h-4 w-4 text-blue-600" />}
        action={
          <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
            <Link href={`/advisor-dashboard/client/${clientId}/documents`}>
              לתיק
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        <Link
          href={`/advisor-dashboard/client/${clientId}/documents`}
          className="block rounded-xl border border-slate-200 p-3 transition-colors hover:border-blue-300"
        >
          <p className="text-2xl font-black text-slate-900">
            {submitted}
            <span className="text-sm font-bold text-slate-400"> / {documents.length}</span>
          </p>
          <p className="text-xs text-slate-500">
            {remaining > 0 ? `${remaining} מסמכים עדיין חסרים` : 'כל המסמכים הוגשו'}
          </p>
        </Link>
      </SectionCard>

      {/* הפגישות */}
      <SectionCard
        title="פגישות קרובות"
        icon={<CalendarDays className="h-4 w-4 text-blue-600" />}
        action={
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onScheduleMeeting}>
              <CalendarPlus className="ml-1 h-3.5 w-3.5" />
              קבע
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
              <Link href={`/advisor-dashboard?tab=calendar&client=${clientId}`}>
                ללוח השנה
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <Link
            href={`/advisor-dashboard?tab=calendar&client=${clientId}`}
            className="block rounded-xl border border-slate-200 p-3 transition-colors hover:border-blue-300"
          >
            {nextMeeting ? (
              <>
                <p className="text-sm font-black text-slate-900">
                  {relativeDayLabel(nextMeeting.startsAt)} · {formatTime(nextMeeting.startsAt)}
                </p>
                <p className="truncate text-xs text-slate-500">{nextMeeting.title}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-black text-slate-500">אין פגישה קרובה</p>
                <p className="text-xs text-slate-500">קבעו מועד עם {clientName}</p>
              </>
            )}
          </Link>

          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="עדיין לא נקבעה פגישה"
              hint="פגישה שתקבעו תופיע כאן ובלוח השנה, ואצל הלקוח כפגישה שממתינה לאישור."
            />
          ) : (
            upcoming.map((meeting) => (
              <MeetingRow
                key={meeting.id}
                meeting={meeting}
                viewer="advisor"
                linkToClient={false}
                onCancel={() => onCancelMeeting(meeting.id)}
              />
            ))
          )}
        </div>
      </SectionCard>

      {/* המשימות של הלקוח */}
      <SectionCard
        title="משימות הלקוח"
        icon={<ListChecks className="h-4 w-4 text-blue-600" />}
        action={
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onAddTask}>
            <Plus className="ml-1 h-3.5 w-3.5" />
            משימה
          </Button>
        }
      >
        <div className="space-y-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-2xl font-black text-slate-900">{openTasks.length}</p>
            <p className="text-xs text-slate-500">
              {overdue > 0 ? `${overdue} מהן באיחור` : 'משימות פתוחות ללקוח הזה'}
            </p>
          </div>

          {openTasks.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="h-6 w-6" />}
              title="אין משימות פתוחות"
              hint="משימה עם תאריך מופיעה גם בלוח השנה שלכם."
            />
          ) : (
            openTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={(status) => onTaskStatus(task.id, status)}
                onReschedule={(dueDate) => onTaskReschedule(task.id, dueDate)}
                onDelete={() => onTaskDelete(task.id)}
              />
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
