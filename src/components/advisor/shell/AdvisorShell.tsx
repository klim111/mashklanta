'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  CalendarDays,
  Home,
  Inbox,
  Loader2,
  LogOut,
  MessagesSquare,
  MonitorSmartphone,
  PieChart,
  Search,
  ShieldCheck,
  Store,
  UserRound,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { enterClientView } from '@/lib/client-view';
import type { PlanStageId } from '@/lib/advisor-crm';
import { usePricing } from '@/components/pricing/PricingProvider';
import { AdvisorInboxDock } from '@/components/conversation/AdvisorInboxDock';
import { ADVISOR_TAB_EVENT } from '@/components/actions/AdvisorActionsMenu';
import { OfficeAvatar } from '@/components/office/OfficeAvatar';
import { officeStyle } from '@/components/office/officeTheme';
import { ClientsArea } from '../ClientsArea';
import { CalendarPanel } from '../CalendarPanel';
import { TasksPanel } from '../TasksPanel';
import { MeetingDialog } from '../MeetingDialog';
import { QuickActions } from '../QuickActions';
import { MixesPanel } from '../MixesPanel';
import { BankRateRequests } from '@/components/dashboard/BankRateRequests';
import { AdvisorSettingsPanel } from '../AdvisorSettingsPanel';
import { ServiceRequestsPanel, useAdvisorLeads, useAdvisorRequests } from '../ServiceRequestsPanel';
import { SiteAnalyticsPanel } from '../SiteAnalyticsPanel';
import { PricingEditorPanel } from '../PricingEditorPanel';
import { LandingContentEditorPanel } from '../LandingContentEditorPanel';
import { SiteContentEditorPanel } from '../SiteContentEditorPanel';
import { PaymentLinksPanel } from '../PaymentLinksPanel';
import { UnfinishedSignupsPanel } from '../UnfinishedSignupsPanel';
import { TestDataCleanupCard } from '../TestDataCleanupCard';
import { AdvisorsAdminPanel } from '../AdvisorsAdminPanel';
import { StageChip } from '../ui';
import { setAdvisoryEnded } from '../advisory-end';
import { useAdvisorClients } from '../useAdvisorClients';
import type { AdvisorClient } from '../useAdvisorClients';
import { useAdvisorOverview, useAdvisorTasks, useMeetings } from '../useAdvisorCrm';
import { useAdvisorOffice } from '../office/useAdvisorOffice';
import { OfficeProfilePanel } from '../office/OfficeProfilePanel';
import { OfficeToolsPanel } from '../office/OfficeToolsPanel';
import { AdvisorHome } from './AdvisorHome';
import { AdvisorToolsGrid } from './AdvisorToolsGrid';
import { BackHomeButtons } from './AdvisorBackBar';
import {
  SECTION_VIEWS,
  allowedLocation,
  locationFromName,
  locationFromParams,
  locationQuery,
  normalizeLocation,
  type AdvisorLocation,
  type AdvisorSection,
} from './sections';

const NAV: Array<{ section: AdvisorSection; label: string; icon: LucideIcon }> = [
  { section: 'home', label: 'היום שלי', icon: Home },
  { section: 'clients', label: 'לקוחות', icon: Users },
  { section: 'inbox', label: 'פניות ובקשות', icon: Inbox },
  { section: 'calendar', label: 'יומן ומשימות', icon: CalendarDays },
  { section: 'tools', label: 'כלים ותמהילים', icon: PieChart },
  { section: 'office', label: 'המשרד שלי', icon: Store },
];

const SECTION_TEXT: Record<AdvisorSection, { title: string; description: string }> = {
  home: { title: 'היום שלי', description: '' },
  clients: { title: 'לקוחות', description: 'כל הלקוחות לפי שלב בתהליך. לחיצה על לקוח פותחת את התיק שלו.' },
  inbox: {
    title: 'פניות ובקשות',
    description: 'פניות חדשות מהאתר ומדף המשרד, ובקשות ליווי של לקוחות. ההתכתבות עצמה בחלון ההודעות.',
  },
  calendar: { title: 'יומן ומשימות', description: 'הפגישות, המשימות והתזכורות שלכם.' },
  tools: { title: 'כלים ותמהילים', description: 'כלי החישוב, התמהילים השמורים ומה שהוגש לבנקים.' },
  office: {
    title: 'המשרד שלי',
    description: 'הדף שלכם, המיתוג, הכלים שהלקוחות רואים וקישורי התשלום.',
  },
  account: { title: 'חשבון ואבטחה', description: 'השם שלכם והסיסמה לכניסה.' },
  admin: {
    title: 'ניהול הפלטפורמה',
    description: 'נתונים והגדרות של האתר כולו, ולא של משרד אחד. מוצג רק למנהל הפלטפורמה.',
  },
};

const VIEW_LABELS: Record<string, string> = {
  calendar: 'יומן',
  tasks: 'משימות',
  tools: 'כלי עבודה',
  mixes: 'תמהילים שמורים',
  'rate-requests': 'הוגשו לבנקים',
  profile: 'דף המשרד ומיתוג',
  'client-tools': 'הכלים ללקוחות',
  'payment-links': 'קישורי תשלום',
  professional: 'הגדרות מקצועיות',
  advisors: 'יועצים ומשרדים',
  visits: 'ביקורים באתר',
  signups: 'הרשמות שלא הושלמו',
  pricing: 'תמחור ומסלולים',
  'site-content': 'תוכן האתר',
  'landing-pages': 'דפי נחיתה',
  maintenance: 'תחזוקה',
};

interface ClientsIntent {
  stage: PlanStageId | 'none' | '';
  adding: boolean;
  /** מתחלף בכל בקשה, כדי שהרשימה תיפתח מחדש עם הסינון */
  nonce: number;
}

/**
 * אזור היועץ: תפריט צד קבוע עם שישה אזורים, ובראש כל מסך חיפוש לקוח וכפתור
 * "חדש" אחד לכל הפעולות. המסך הראשון — "היום שלי" — מציג רק מה שמחכה ליועץ,
 * מה ביומן היום ואיפה הלקוחות עומדים. ניהול האתר כולו (ביקורים, תמחור, תוכן)
 * נמצא ב"ניהול הפלטפורמה", שמוצג רק למנהל הפלטפורמה (src/lib/platform-admin.ts).
 */
export function AdvisorShell() {
  const { data: session } = useSession();
  const router = useRouter();
  const { platformPrice } = usePricing();
  const [requested, setRequested] = useState<AdvisorLocation>({ section: 'home', view: '' });
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [meetingFor, setMeetingFor] = useState<AdvisorClient | null>(null);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [inboxSignal, setInboxSignal] = useState(0);
  const [clientsIntent, setClientsIntent] = useState<ClientsIntent>({ stage: '', adding: false, nonce: 0 });
  /** לקוח שהגיעו ממנו (`?client=`) — היומן והמשימות נפתחים מסוננים אליו */
  const [focusClientId, setFocusClientId] = useState<string | undefined>(undefined);

  const officeState = useAdvisorOffice();
  const location = allowedLocation(requested, officeState.platformAdmin);
  const waitingForRole = requested.section === 'admin' && !officeState.ready;

  /** כמה מעברים בין אזורים נעשו בלשונית — "חזרה" חוזרת אחורה רק כשיש לאן */
  const depth = useRef(0);

  // המיקום מהכתובת, וגם בחזרה אחורה בדפדפן
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setRequested(locationFromParams(params));
      const client = params.get('client');
      if (client) setFocusClientId(client);
    };
    const onPop = () => {
      depth.current = Math.max(0, depth.current - 1);
      read();
    };
    read();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((section: AdvisorSection, view?: string) => {
    const next = normalizeLocation(section, view);
    setRequested(next);
    setSearchOpen(false);
    depth.current += 1;
    window.history.pushState(null, '', `${window.location.pathname}${locationQuery(next)}`);
    window.scrollTo({ top: 0 });
  }, []);

  // הפעולות המהירות (ADVISOR_TAB_EVENT) מעבירות אזור גם כשהלוח כבר פתוח
  useEffect(() => {
    const onTab = (event: Event) => {
      const next = locationFromName((event as CustomEvent<string>).detail);
      if (next) go(next.section, next.view);
    };
    window.addEventListener(ADVISOR_TAB_EVENT, onTab);
    return () => window.removeEventListener(ADVISOR_TAB_EVENT, onTab);
  }, [go]);

  const { requests, ready: requestsReady, refresh: refreshRequests } = useAdvisorRequests();
  const { leads, ready: leadsReady, refresh: refreshLeads } = useAdvisorLeads();
  const { clients, ready, error, addClient, refresh: refreshClients } = useAdvisorClients(true);
  const { overview, refresh: refreshOverview } = useAdvisorOverview(true);
  const { propose } = useMeetings();
  // רק לפתיחת משימה מ"חדש" — הרשימה עצמה נטענת במסך המשימות
  const { create: createTask } = useAdvisorTasks({}, false);

  const firstName = session?.user?.name?.split(' ')[0] || 'יועץ יקר';
  const displayName = session?.user?.name || session?.user?.email || 'יועץ';
  const inboxCount = requests.length + leads.filter((lead) => lead.status === 'OPEN').length;

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return clients
      .filter((client) =>
        [client.name, client.email, client.phone ?? ''].some((field) => field.toLowerCase().includes(term)),
      )
      .slice(0, 6);
  }, [clients, query]);

  const refreshAll = async () => {
    await Promise.all([refreshClients(), refreshOverview(), refreshRequests(), refreshLeads()]);
  };

  /** "חזרה" — למסך הקודם באזור היועץ; כשנכנסו ישר לאזור הזה — למסך הבית */
  const goBack = () => {
    if (depth.current > 0) window.history.back();
    else go('home');
  };

  const openClients = (intent: Omit<ClientsIntent, 'nonce'>) => {
    setClientsIntent((current) => ({ ...intent, nonce: current.nonce + 1 }));
    go('clients');
  };

  const openClientView = () => {
    // הפלטפורמה כמו שלקוח רשום רואה אותה, עם כל הכלים פתוחים (src/lib/client-view.ts)
    enterClientView();
    router.push('/dashboard');
  };

  const navButton = (item: { section: AdvisorSection; label: string; icon: LucideIcon }, tone: 'side' | 'chip') => {
    const Icon = item.icon;
    const active = location.section === item.section;
    const badge = item.section === 'inbox' && inboxCount > 0 ? inboxCount : null;
    return (
      <button
        key={item.section}
        type="button"
        onClick={() => go(item.section)}
        aria-current={active ? 'page' : undefined}
        className={
          tone === 'side'
            ? `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold transition-colors ${
                active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            : `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
                active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`
        }
      >
        <Icon className={tone === 'side' ? 'h-[18px] w-[18px] shrink-0' : 'h-4 w-4 shrink-0'} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-right">{item.label}</span>
        {badge !== null && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-2xs font-black ${
              active ? 'bg-white text-slate-900' : 'bg-violet-600 text-white'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  const office = officeState.office;
  const quickActions = (
    <QuickActions
      variant="menu"
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      onNewClient={() => openClients({ stage: '', adding: true })}
      onCreateTask={async (input) => {
        const failure = await createTask(input);
        if (!failure) await refreshAll();
        return failure;
      }}
      onProposeMeeting={async (input) => {
        const failure = await propose(input);
        if (!failure) await refreshAll();
        return failure;
      }}
    />
  );

  const search = (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => setSearchOpen(true)}
        onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
        placeholder="חיפוש לקוח לפי שם, מייל או טלפון"
        aria-label="חיפוש לקוח"
        className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 text-base text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500"
      />
      {searchOpen && query.trim() && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {matches.length === 0 && <p className="px-3 py-2.5 text-sm text-slate-500">לא נמצא לקוח</p>}
          {matches.map((client) => (
            <Link
              key={client.id}
              href={`/advisor-dashboard/client/${client.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-blue-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-2xs font-bold text-blue-700">
                {client.name.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{client.name}</span>
              {client.planStage && <StageChip stage={client.planStage} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  /** חיפוש לקוח ו"חדש" — בראש אזור העבודה, ברוחב המסגרת */
  const toolbar = (
    <div className="flex items-center gap-2">
      {search}
      {quickActions}
    </div>
  );

  const text = SECTION_TEXT[location.section];
  const views = SECTION_VIEWS[location.section];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* תפריט הצד — במסך רחב */}
      <aside className="start-aligned hidden border-l border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:px-3 lg:py-4">
        <button type="button" className="flex items-center gap-2.5 px-2 text-right" onClick={() => go('home')}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white shadow">
            מ
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-black text-slate-900">משכלנתא</span>
            <span className="block text-2xs font-bold text-slate-400">לוח היועץ</span>
          </span>
        </button>

        {office && (
          <button
            type="button"
            onClick={() => go('office')}
            style={officeStyle(office.profile.color)}
            className="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-200 p-2 text-right transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <OfficeAvatar
              name={office.profile.advisorName || office.name}
              photoUrl={office.profile.photoUrl}
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-slate-900">{office.name}</span>
              <span className="flex items-center gap-1 text-2xs font-bold text-slate-500">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${office.published ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  aria-hidden
                />
                {office.published ? 'המשרד פעיל' : 'המשרד בטיוטה'}
              </span>
            </span>
          </button>
        )}

        <nav className="mt-4 space-y-1" aria-label="אזור היועץ">
          {NAV.map((item) => navButton(item, 'side'))}
        </nav>

        <div className="mt-auto space-y-1 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={openClientView}
            title="פותח את הפלטפורמה כמו שלקוח רשום רואה אותה, עם כל הכלים פתוחים. לא נספר כביקור"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <MonitorSmartphone className="h-4 w-4 shrink-0" aria-hidden />
            תצוגה כלקוח
          </button>
          <button
            type="button"
            onClick={() => setInboxSignal((value) => value + 1)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <MessagesSquare className="h-4 w-4 shrink-0" aria-hidden />
            הודעות ללקוחות
          </button>
          {navButton({ section: 'account', label: 'חשבון ואבטחה', icon: UserRound }, 'side')}
          {officeState.platformAdmin &&
            navButton({ section: 'admin', label: 'ניהול הפלטפורמה', icon: ShieldCheck }, 'side')}
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 p-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
              <UserRound className="h-4 w-4 text-slate-600" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{displayName}</span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              title="יציאה"
              aria-label="יציאה"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-800"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        {/* במסך צר: הלוגו, היציאה והאזורים כשורת כפתורים. במסך רחב — תפריט הצד */}
        <header className="start-aligned sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <button type="button" onClick={() => go('home')} aria-label="היום שלי" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white">
                מ
              </span>
              <span className="text-lg font-black text-slate-900">משכלנתא</span>
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              aria-label="יציאה"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {/* במסך צר — האזורים כשורת כפתורים */}
          <nav
            className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none] lg:hidden"
            aria-label="אזור היועץ"
          >
            {NAV.map((item) => navButton(item, 'chip'))}
            {navButton({ section: 'account', label: 'חשבון', icon: UserRound }, 'chip')}
            {officeState.platformAdmin && navButton({ section: 'admin', label: 'ניהול', icon: ShieldCheck }, 'chip')}
            <button
              type="button"
              onClick={openClientView}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-700"
            >
              <MonitorSmartphone className="h-4 w-4" aria-hidden />
              כלקוח
            </button>
          </nav>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 lg:px-6">
          <div className="mx-auto max-w-6xl">
            {location.section !== 'home' && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <BackHomeButtons onBack={goBack} onHome={() => go('home')} />
                <div className="min-w-[16rem] flex-1">{toolbar}</div>
              </div>
            )}
            {location.section !== 'home' && !waitingForRole && (
              <div className="start-aligned mb-5">
                <h1 className="text-title font-black text-slate-900">{text.title}</h1>
                {text.description && <p className="mt-1 text-sm text-slate-500">{text.description}</p>}
                {views.length > 1 && (
                  <div
                    className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]"
                    role="tablist"
                  >
                    {views.map((view) => {
                      const active = location.view === view;
                      return (
                        <button
                          key={view}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => go(location.section, view)}
                          className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-bold transition-colors ${
                            active
                              ? 'border-blue-600 text-blue-700'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {VIEW_LABELS[view] ?? view}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {waitingForRole ? (
              <Loading />
            ) : (
              <>
                {location.section === 'home' && (
                  <AdvisorHome
                    firstName={firstName}
                    overview={overview}
                    clients={clients}
                    requests={requests}
                    leads={leads}
                    office={office}
                    publicUrl={officeState.publicUrl}
                    onNavigate={go}
                    onStage={(stage) => openClients({ stage, adding: false })}
                    toolbar={toolbar}
                  />
                )}

                {location.section === 'clients' && (
                  <ClientsArea
                    key={clientsIntent.nonce}
                    clients={clients}
                    ready={ready}
                    error={error}
                    initialStage={clientsIntent.stage}
                    startAdding={clientsIntent.adding}
                    onAddClient={async (input) => {
                      const failure = await addClient(input);
                      if (!failure) await refreshOverview();
                      return failure;
                    }}
                    onScheduleMeeting={(client) => {
                      setMeetingFor(client);
                      setMeetingOpen(true);
                    }}
                  />
                )}

                {location.section === 'inbox' && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setInboxSignal((value) => value + 1)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition-colors hover:border-blue-300"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <MessagesSquare className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-slate-900">הודעות ומיילים עם לקוחות</span>
                        <span className="block text-xs text-slate-500">כל השיחות במקום אחד, לפי לקוח</span>
                      </span>
                    </button>
                    <ServiceRequestsPanel
                      requests={requests}
                      ready={requestsReady}
                      leads={leads}
                      leadsReady={leadsReady}
                      onMarkWork={async (orderId, inWork) => {
                        await fetch('/api/advisor/service-orders', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ orderId, inWork }),
                        });
                        await refreshRequests();
                      }}
                      onEndAdvisory={async (planId, ended) => {
                        try {
                          if (await setAdvisoryEnded(planId, ended, platformPrice)) await refreshRequests();
                        } catch {
                          window.alert('הפעולה לא נשמרה. נסו שוב.');
                        }
                      }}
                      onOpenClient={(clientId) => router.push(`/advisor-dashboard/client/${clientId}`)}
                    />
                  </div>
                )}

                {location.section === 'calendar' && location.view === 'calendar' && (
                  <CalendarPanel clients={clients} onChanged={refreshAll} initialClientId={focusClientId} />
                )}
                {location.section === 'calendar' && location.view === 'tasks' && (
                  <TasksPanel clients={clients} onChanged={refreshAll} initialClientId={focusClientId} />
                )}

                {location.section === 'tools' && location.view === 'tools' && <AdvisorToolsGrid />}
                {location.section === 'tools' && location.view === 'mixes' && <MixesPanel />}
                {location.section === 'tools' && location.view === 'rate-requests' && <BankRateRequests />}

                {location.section === 'office' &&
                  (location.view === 'profile' || location.view === 'client-tools') &&
                  (!office ? (
                    officeState.error ? (
                      <LoadError message={officeState.error} onRetry={() => void officeState.refresh()} />
                    ) : (
                      <Loading />
                    )
                  ) : location.view === 'profile' ? (
                    <OfficeProfilePanel office={office} publicUrl={officeState.publicUrl} save={officeState.save} />
                  ) : (
                    <OfficeToolsPanel tools={office.tools} save={officeState.save} />
                  ))}
                {location.section === 'office' && location.view === 'payment-links' && (
                  <PaymentLinksPanel clients={clients} />
                )}
                {location.section === 'office' && location.view === 'professional' && (
                  <AdvisorSettingsPanel
                    name={session?.user?.name ?? ''}
                    email={session?.user?.email ?? ''}
                    cards={['form-details', 'rates', 'categories']}
                  />
                )}

                {location.section === 'account' && (
                  <AdvisorSettingsPanel
                    name={session?.user?.name ?? ''}
                    email={session?.user?.email ?? ''}
                    cards={['profile', 'password']}
                  />
                )}

                {location.section === 'admin' && (
                  <>
                    {location.view === 'advisors' && <AdvisorsAdminPanel />}
                    {location.view === 'visits' && <SiteAnalyticsPanel />}
                    {location.view === 'signups' && <UnfinishedSignupsPanel />}
                    {location.view === 'pricing' && <PricingEditorPanel />}
                    {location.view === 'site-content' && <SiteContentEditorPanel />}
                    {location.view === 'landing-pages' && <LandingContentEditorPanel />}
                    {location.view === 'maintenance' && <TestDataCleanupCard />}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>

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

      <AdvisorInboxDock openSignal={inboxSignal} />
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-blue-500" aria-hidden />
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}.{' '}
      <button type="button" onClick={onRetry} className="font-bold underline">
        נסו שוב
      </button>
    </div>
  );
}
