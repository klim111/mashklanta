'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import {
  AlarmClock,
  BarChart3,
  BookmarkCheck,
  CalendarDays,
  CalendarPlus,
  FileText,
  Home as HomeIcon,
  Layers,
  ListChecks,
  LogOut,
  PieChart,
  Search,
  Settings,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatTime, relativeDayLabel } from '@/lib/advisor-crm';
import { ClientList } from './ClientList';
import { CalendarPanel } from './CalendarPanel';
import { MeetingDialog } from './MeetingDialog';
import { MixesPanel } from './MixesPanel';
import { AdvisorSettingsPanel } from './AdvisorSettingsPanel';
import { TasksPanel } from './TasksPanel';
import { StageChip } from './ui';
import { useAdvisorClients } from './useAdvisorClients';
import { useAdvisorOverview, useMeetings } from './useAdvisorCrm';
import type { AdvisorClient } from './useAdvisorClients';

type TabId = 'clients' | 'tasks' | 'calendar' | 'mixes' | 'settings';

const TABS: Array<{ id: TabId; label: string; icon: typeof Users }> = [
  { id: 'clients', label: 'לקוחות', icon: Users },
  { id: 'tasks', label: 'משימות', icon: ListChecks },
  { id: 'calendar', label: 'לוח שנה', icon: CalendarDays },
  { id: 'mixes', label: 'תמהילים שמורים', icon: Layers },
  { id: 'settings', label: 'הגדרות', icon: Settings },
];

/**
 * לוח הבקרה של היועץ.
 *
 * הפעולות והמידע הדחוף — סדר היום, הפגישות הקרובות ומה שדורש תשומת לב — יושבים
 * בראש העמוד ונראים בלי גלילה. המונים והרשימות באים מתחתם, כי הם תמונת מצב ולא
 * דבר שצריך לפעול לפיו מיד.
 */
export function AdvisorConsole() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<TabId>('clients');
  const [query, setQuery] = useState('');
  const [meetingFor, setMeetingFor] = useState<AdvisorClient | null>(null);
  const [meetingOpen, setMeetingOpen] = useState(false);

  const { clients, ready, error, addClient, refresh: refreshClients } = useAdvisorClients(true);
  const { overview, refresh: refreshOverview } = useAdvisorOverview(true);
  const { propose } = useMeetings();

  const displayName = session?.user?.name || session?.user?.email || 'יועץ';
  const firstName = session?.user?.name?.split(' ')[0] || 'יועץ יקר';

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return clients
      .filter((client) =>
        [client.name, client.email, client.phone ?? ''].some((field) =>
          field.toLowerCase().includes(term)
        )
      )
      .slice(0, 5);
  }, [clients, query]);

  const refreshAll = async () => {
    await Promise.all([refreshClients(), refreshOverview()]);
  };

  const openMeeting = (client: AdvisorClient | null) => {
    setMeetingFor(client);
    setMeetingOpen(true);
  };

  const nextMeeting = overview.upcomingMeetings[0] ?? null;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      {/* ראש העמוד: כל מה שצריך פעולה מיידית, בלי גלילה */}
      <header className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg">
                <HomeIcon className="h-5 w-5 text-white" />
              </div>
              <span className="truncate text-lg font-black text-white sm:text-xl">
                משכלתנא · יועצים
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/mortgage-advisor"
                className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white md:flex"
              >
                <PieChart className="h-4 w-4" />
                כלי התכנון
              </Link>
              <Link
                href="/saved-mixes"
                className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:flex"
              >
                <BookmarkCheck className="h-4 w-4" />
                תמהילים
              </Link>
              <div className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-3 pr-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                  <UserRound className="h-4 w-4 text-white" />
                </div>
                <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-white/80 sm:block">
                  {displayName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">יציאה</span>
              </button>
            </div>
          </div>

          <div className="pb-5 pt-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-bold tracking-wide text-white/40">לוח הבקרה שלי</p>
              <h1 className="mt-0.5 text-2xl font-black text-white md:text-3xl">
                שלום, {firstName}
              </h1>
            </motion.div>

            {/* חיפוש ופעולות — הדברים שהיועץ עושה איתם את רוב היום */}
            <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setTab('clients')}
                  placeholder="חיפוש לקוח לפי שם, אימייל או טלפון"
                  className="h-11 border-white/15 bg-white/10 pr-9 text-sm text-white placeholder:text-white/40 focus-visible:ring-blue-400"
                />

                {matches.length > 0 && (
                  <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {matches.map((client) => (
                      <Link
                        key={client.id}
                        href={`/advisor-dashboard/client/${client.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-blue-50"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                          {client.name.slice(0, 2)}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">
                          {client.name}
                        </span>
                        {client.planStage && <StageChip stage={client.planStage} />}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab('clients')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  <UserPlus className="h-4 w-4" />
                  לקוח חדש
                </button>
                <button
                  type="button"
                  onClick={() => openMeeting(null)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
                >
                  <CalendarPlus className="h-4 w-4" />
                  קבע פגישה
                </button>
                <button
                  type="button"
                  onClick={() => setTab('tasks')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
                >
                  <ListChecks className="h-4 w-4" />
                  משימה חדשה
                </button>
                <Link
                  href="/mortgage-advisor"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
                >
                  <PieChart className="h-4 w-4" />
                  בנה תמהיל
                </Link>
              </div>
            </div>

            {/* סדר היום — שלוש התשובות שהיועץ שואל בבוקר */}
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <AgendaCard
                icon={<CalendarDays className="h-4 w-4" />}
                label="הפגישה הקרובה"
                value={
                  nextMeeting
                    ? `${relativeDayLabel(nextMeeting.startsAt)} ${formatTime(nextMeeting.startsAt)}`
                    : 'אין פגישה קרובה'
                }
                hint={nextMeeting ? nextMeeting.clientName : 'קבעו פגישה עם לקוח'}
                onClick={() => setTab('calendar')}
              />
              <AgendaCard
                icon={<ListChecks className="h-4 w-4" />}
                label="משימות להיום"
                value={`${overview.todayTasks.length}`}
                hint={
                  overview.todayTasks[0]
                    ? overview.todayTasks[0].title
                    : `${overview.openTasks} משימות פתוחות בסך הכול`
                }
                onClick={() => setTab('tasks')}
              />
              <AgendaCard
                icon={<AlarmClock className="h-4 w-4" />}
                label="דורש תשומת לב"
                value={`${overview.overdueTasks + overview.awaitingConfirmation}`}
                hint={
                  overview.overdueTasks > 0
                    ? `${overview.overdueTasks} משימות באיחור`
                    : overview.awaitingConfirmation > 0
                      ? `${overview.awaitingConfirmation} פגישות ממתינות לאישור הלקוח`
                      : 'הכול מעודכן'
                }
                tone={overview.overdueTasks > 0 ? 'alert' : 'default'}
                onClick={() => setTab('tasks')}
              />
            </div>

            {/* ניווט בין אזורי הלוח — נשאר גלוי בלי גלילה */}
            <nav className="mt-4 flex flex-wrap gap-2">
              {TABS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all sm:px-4 sm:text-sm ${
                      active
                        ? 'bg-white text-slate-900 shadow-lg'
                        : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* הסיכומים — תמונת מצב, מתחת לאזור הפעולה */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile
            icon={<Users className="h-5 w-5" />}
            label='סה"כ לקוחות'
            value={overview.clients}
            tone="blue"
          />
          <StatTile
            icon={<BarChart3 className="h-5 w-5" />}
            label="בתהליך"
            value={overview.activeClients}
            tone="violet"
          />
          <StatTile
            icon={<Layers className="h-5 w-5" />}
            label="תמהילים שמורים"
            value={overview.mixes}
            tone="indigo"
          />
          <StatTile
            icon={<FileText className="h-5 w-5" />}
            label="מסמכים שממתינים"
            value={overview.openDocuments}
            tone="amber"
          />
          <StatTile
            icon={<ListChecks className="h-5 w-5" />}
            label="משימות פתוחות"
            value={overview.openTasks}
            tone="emerald"
          />
        </div>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {tab === 'clients' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <ClientList
                clients={clients}
                ready={ready}
                error={error}
                onAddClient={async (input) => {
                  const failure = await addClient(input);
                  if (!failure) await refreshOverview();
                  return failure;
                }}
                onScheduleMeeting={(client) => openMeeting(client)}
                query={query}
                onQueryChange={setQuery}
              />
            </div>
          )}

          {tab === 'tasks' && <TasksPanel clients={clients} onChanged={refreshAll} />}

          {tab === 'calendar' && <CalendarPanel clients={clients} onChanged={refreshAll} />}

          {tab === 'mixes' && <MixesPanel />}

          {tab === 'settings' && (
            <AdvisorSettingsPanel
              name={session?.user?.name ?? ''}
              email={session?.user?.email ?? ''}
            />
          )}
        </motion.div>
      </main>

      <MeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        clientId={meetingFor?.id}
        clientName={meetingFor?.name}
        clients={clients.map((client) => ({ id: client.id, name: client.name }))}
        onSubmit={async (input) => {
          const failure = await propose(input);
          if (!failure) await refreshAll();
          return failure;
        }}
      />
    </div>
  );
}

function AgendaCard({
  icon,
  label,
  value,
  hint,
  tone = 'default',
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'alert';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-right transition-colors ${
        tone === 'alert'
          ? 'border-rose-400/40 bg-rose-500/15 hover:bg-rose-500/25'
          : 'border-white/15 bg-white/10 hover:bg-white/15'
      }`}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-bold text-white/50">
        {icon}
        {label}
      </span>
      <p className="mt-1 truncate text-lg font-black text-white">{value}</p>
      <p className="truncate text-[11px] text-white/50">{hint}</p>
    </button>
  );
}

const TONES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
};

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: keyof typeof TONES | string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          TONES[tone] ?? TONES.blue
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
