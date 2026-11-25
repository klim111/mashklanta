'use client';

import { useMemo, useState } from 'react';
import type React from 'react';
import Link from 'next/link';
import {
  AlarmClock,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Inbox,
  ListChecks,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';
import { PLAN_STAGES, dayKey, formatTime, relativeDayLabel, type PlanStageId } from '@/lib/advisor-crm';
import type { AdvisorLeadView } from '@/lib/advisor-leads';
import type { AdvisorOrderRequest } from '@/lib/advisor-order-store';
import { OFFICE_PATH_PREFIX } from '@/lib/office';
import { VideoCallButton } from '@/components/meeting-call/VideoCallButton';
import { StageIcon, stageGradient, stageLabel } from '../ui';
import type { AdvisorClient } from '../useAdvisorClients';
import type { AdvisorOverviewView } from '../useAdvisorCrm';
import type { AdvisorOfficeView } from '../office/useAdvisorOffice';
import type { AdvisorSection } from './sections';

interface AttentionItem {
  key: string;
  icon: typeof Inbox;
  tone: 'violet' | 'amber' | 'rose' | 'blue';
  title: string;
  detail: string;
  onClick: () => void;
}

const TONES: Record<AttentionItem['tone'], string> = {
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  blue: 'bg-blue-50 text-blue-600',
};

const DATE = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

function greeting(hour: number): string {
  if (hour < 5) return 'לילה טוב';
  if (hour < 12) return 'בוקר טוב';
  if (hour < 17) return 'צהריים טובים';
  if (hour < 21) return 'ערב טוב';
  return 'לילה טוב';
}

/**
 * "היום שלי" — המסך הראשון של היועץ. שלוש שאלות בלבד: מה מחכה לי, מה ביומן
 * היום, ואיפה הלקוחות שלי עומדים. כל השאר נמצא באזורים שבתפריט.
 */
export function AdvisorHome({
  firstName,
  overview,
  clients,
  requests,
  leads,
  office,
  publicUrl,
  onNavigate,
  onStage,
  toolbar,
}: {
  firstName: string;
  overview: AdvisorOverviewView;
  clients: AdvisorClient[];
  requests: AdvisorOrderRequest[];
  leads: AdvisorLeadView[];
  office: AdvisorOfficeView | null;
  publicUrl: string;
  onNavigate: (section: AdvisorSection, view?: string) => void;
  /** רשימת הלקוחות מסוננת לשלב (`none` — לקוחות בלי תהליך) */
  onStage: (stage: PlanStageId | 'none') => void;
  /** חיפוש לקוח ו"חדש" — מיד מתחת לברכה */
  toolbar?: React.ReactNode;
}) {
  const now = new Date();

  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    for (const lead of leads.filter((item) => item.status === 'OPEN')) {
      items.push({
        key: `lead-${lead.id}`,
        icon: Sparkles,
        tone: 'violet',
        title: `פנייה חדשה: ${lead.name}`,
        detail: [lead.requestKindLabel, lead.topicLabel].filter(Boolean).join(' · '),
        onClick: () => onNavigate('inbox'),
      });
    }
    for (const request of requests.filter((item) => !item.workStartedAt)) {
      items.push({
        key: `request-${request.id}`,
        icon: Inbox,
        tone: 'violet',
        title: `בקשת ליווי: ${request.clientName}`,
        detail: request.propertyAddress || request.planName,
        onClick: () => onNavigate('inbox'),
      });
    }
    if (overview.awaitingAdvisor > 0) {
      items.push({
        key: 'meetings-awaiting',
        icon: CalendarClock,
        tone: 'amber',
        title:
          overview.awaitingAdvisor === 1
            ? 'פגישה אחת ממתינה לאישורכם'
            : `${overview.awaitingAdvisor} פגישות ממתינות לאישורכם`,
        detail: 'הלקוח הציע מועד',
        onClick: () => onNavigate('calendar'),
      });
    }
    for (const task of overview.overdue.slice(0, 3)) {
      items.push({
        key: `task-${task.id}`,
        icon: AlarmClock,
        tone: 'rose',
        title: task.title,
        detail: `באיחור${task.clientName ? ` · ${task.clientName}` : ''}`,
        onClick: () => onNavigate('calendar', 'tasks'),
      });
    }
    if (overview.openDocuments > 0) {
      items.push({
        key: 'documents',
        icon: FileText,
        tone: 'blue',
        title: `${overview.openDocuments} מסמכים ממתינים`,
        detail: 'מסמכים שלקוחות עוד צריכים להעלות או שממתינים לבדיקה',
        onClick: () => onNavigate('clients'),
      });
    }
    return items;
  }, [leads, requests, overview, onNavigate]);

  const todayKey = dayKey(now);
  const todayMeetings = overview.upcomingMeetings.filter((meeting) => dayKey(meeting.startsAt) === todayKey);
  const nextMeeting = todayMeetings.length === 0 ? (overview.upcomingMeetings[0] ?? null) : null;

  const pipeline = useMemo(() => {
    const counts = new Map<PlanStageId | 'none', number>();
    for (const client of clients) {
      if (client.prospect) continue;
      const stage = client.planStage ?? 'none';
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
    return counts;
  }, [clients]);

  return (
    <div className="start-aligned space-y-5">
      <header>
        <p className="text-sm font-semibold text-slate-500">{DATE.format(now)}</p>
        <h1 className="mt-0.5 text-title font-black text-slate-900">
          {greeting(now.getHours())}, {firstName}
        </h1>
      </header>

      {toolbar}

      {office && !office.published && <OfficeSetupCard onOpen={() => onNavigate('office')} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* מה מחכה לי */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
              <ListChecks className="h-4 w-4 text-blue-600" aria-hidden />
              מה מחכה לכם
            </h2>
            {attention.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">
                {attention.length}
              </span>
            )}
          </header>
          {attention.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden />
              <p className="text-base font-black text-slate-900">הכול מטופל</p>
              <p className="text-sm text-slate-500">אין כרגע פנייה, פגישה או משימה שממתינה לכם.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {attention.slice(0, 7).map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="group flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-slate-50"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[item.tone]}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900">{item.title}</span>
                        {item.detail && <span className="block truncate text-xs text-slate-500">{item.detail}</span>}
                      </span>
                      <ArrowLeft className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-600" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* היום ביומן */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
              <CalendarDays className="h-4 w-4 text-blue-600" aria-hidden />
              היום ביומן
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              ליומן המלא
            </button>
          </header>
          <div className="space-y-2 p-4">
            {todayMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <span className="w-12 shrink-0 text-center text-sm font-black text-slate-900">
                  {formatTime(meeting.startsAt)}
                </span>
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/advisor-dashboard/client/${meeting.clientId}`}
                    className="block truncate text-sm font-bold text-slate-900 hover:text-blue-700"
                  >
                    {meeting.clientName}
                  </Link>
                  <span className="block truncate text-xs text-slate-500">{meeting.title}</span>
                </span>
                <VideoCallButton meeting={meeting} />
              </div>
            ))}
            {todayMeetings.length === 0 && (
              <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                אין פגישות היום.
                {nextMeeting && (
                  <>
                    {' '}
                    הקרובה: <b>{nextMeeting.clientName}</b>, {relativeDayLabel(nextMeeting.startsAt)} ב-
                    {formatTime(nextMeeting.startsAt)}.
                  </>
                )}
              </p>
            )}
            {overview.todayTasks.length > 0 && (
              <div className="pt-2">
                <p className="mb-1.5 text-xs font-bold text-slate-500">משימות להיום</p>
                <ul className="space-y-1">
                  {overview.todayTasks.slice(0, 5).map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate('calendar', 'tasks')}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-right text-sm hover:bg-slate-50"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden />
                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{task.title}</span>
                        {task.clientName && <span className="shrink-0 text-xs text-slate-500">{task.clientName}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* איפה הלקוחות עומדים */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
            <Users className="h-4 w-4 text-blue-600" aria-hidden />
            הלקוחות לפי שלב
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('clients')}
            className="text-xs font-bold text-blue-700 hover:underline"
          >
            כל הלקוחות ({overview.clients})
          </button>
        </header>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-6">
          {PLAN_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => onStage(stage)}
              className="group rounded-xl border border-slate-200 p-3 text-right transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${stageGradient(stage)} text-white`}
              >
                <StageIcon stage={stage} className="h-4 w-4" />
              </span>
              <span className="mt-2 block text-2xl font-black text-slate-900">{pipeline.get(stage) ?? 0}</span>
              <span className="block truncate text-xs font-semibold text-slate-500">{stageLabel(stage)}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onStage('none')}
            className="rounded-xl border border-dashed border-slate-300 p-3 text-right transition-colors hover:border-blue-300 hover:bg-blue-50/40"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Users className="h-4 w-4" aria-hidden />
            </span>
            <span className="mt-2 block text-2xl font-black text-slate-900">{pipeline.get('none') ?? 0}</span>
            <span className="block truncate text-xs font-semibold text-slate-500">עוד בלי תהליך</span>
          </button>
        </div>
      </section>

      {office?.published && (
        <OfficeLinkCard office={office} publicUrl={publicUrl} onOpen={() => onNavigate('office')} />
      )}
    </div>
  );
}

function OfficeSetupCard({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-gradient-to-l from-blue-50 to-white p-4 shadow-sm sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
        <Store className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-black text-slate-900">המשרד הדיגיטלי שלכם מחכה להפעלה</p>
        <p className="text-sm text-slate-600">
          שם, לוגו, צבע וקישור משלכם. לקוחות שנרשמים דרכו רואים את האזור האישי במיתוג שלכם.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"
      >
        להגדרת המשרד
        <ArrowLeft className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}

function OfficeLinkCard({
  office,
  publicUrl,
  onOpen,
}: {
  office: AdvisorOfficeView;
  publicUrl: string;
  onOpen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const link = publicUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}${office.path}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('העתיקו את הקישור:', link);
    }
  };
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <Store className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900">הקישור למשרד שלכם</p>
        <p dir="ltr" className="truncate text-left text-sm text-slate-500">
          {link}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-300"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? 'הועתק' : 'העתקה'}
        </button>
        <a
          href={`${OFFICE_PATH_PREFIX}${office.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-300"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          צפייה
        </a>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
        >
          עריכה
        </button>
      </div>
    </section>
  );
}
