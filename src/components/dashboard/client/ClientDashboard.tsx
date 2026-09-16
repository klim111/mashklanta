'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { signOut } from 'next-auth/react';
import {
  ArrowLeft,
  CalendarDays,
  Calculator,
  Compass,
  Gavel,
  Home as HomeIcon,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react';
import { isDashboardSection } from '@/lib/client-agenda';
import type { DashboardSection } from '@/lib/client-agenda';
import { UnassignedMixesSection, isUnassociatedMix } from '@/components/plan/UnassignedMixes';
import { useStartPlan } from '@/components/plan/StartCard';
import { MortgageEntry, readEntryQuery } from '@/components/service-flow/MortgageEntry';
import { VaultButton } from '@/components/plan/documents/VaultButton';
import type { ServiceType } from '@/lib/service-flow';
import { BankRateRequests } from '@/components/dashboard/BankRateRequests';
import { ToolsHub } from '@/components/dashboard/ToolsHub';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { AdvisorCta } from './AdvisorCta';
import { AgendaSection } from './AgendaSection';
import { OverviewSection } from './OverviewSection';
import { useClientDashboard } from './useClientDashboard';

interface SectionMeta {
  id: DashboardSection;
  label: string;
  title: string;
  description: string;
  icon: typeof Compass;
}

const SECTIONS: SectionMeta[] = [
  {
    id: 'overview',
    label: 'סקירה',
    title: 'הסקירה שלי',
    description: 'איפה אתם עומדים, מה קרוב ביומן ומה הפעולה הבאה — הכול במסך אחד.',
    icon: LayoutDashboard,
  },
  {
    id: 'agenda',
    label: 'משימות ולוח שנה',
    title: 'משימות ולוח שנה',
    description: 'כל מה שממתין לכם, הפגישות עם היועץ והמועדים החשובים בתהליך.',
    icon: CalendarDays,
  },
  {
    id: 'rate-requests',
    label: 'תמהילים שמורים',
    title: 'תמהילים שמורים',
    description: 'מכתבי הבקשה ששלחתם, ההצעות שהתקבלו עליהם, ותמהילים שעדיין לא שויכו לנכס.',
    icon: Gavel,
  },
  {
    id: 'tools',
    label: 'כלים ומחשבונים',
    title: 'כלים ומחשבונים',
    description: 'הון עצמי, הלוואות, מיחזור, היתכנות ובניית תמהיל — כל כלי במסך משלו.',
    icon: Calculator,
  },
  {
    id: 'settings',
    label: 'הגדרות',
    title: 'הגדרות החשבון והפרופיל',
    description: 'פרטי הלווים וההון העצמי שנטענים כברירת מחדל לכל משכנתא חדשה.',
    icon: Settings,
  },
];

/** קישורים ישנים כמו `/dashboard#plans` ו-`#mortgages` מובילים לסקירה, שבה המשכנתאות */
const LEGACY_HASH: Record<string, DashboardSection> = { plans: 'overview', mortgages: 'overview' };

function sectionFromHash(): DashboardSection {
  const hash = window.location.hash.replace('#', '');
  if (isDashboardSection(hash)) return hash;
  return LEGACY_HASH[hash] ?? 'overview';
}

const DATE_FORMAT = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * האזור האישי של הלקוח — לוח בקרה ושליטה.
 *
 * תפריט קבוע מימין מחלק את האזור לשישה אזורים, והסקירה מרכזת מכל אחד מהם את
 * מה שחשוב עכשיו. הניווט נשמר בכתובת (`#agenda`), כדי שקישור מבחוץ — למשל
 * אחרי שמירת בקשת ריביות — יפתח ישר את האזור הנכון.
 */
export function ClientDashboard({ name, email }: { name: string | null; email: string | null }) {
  const [section, setSection] = useState<DashboardSection>('overview');
  /** יום שנבחר בלוח המוקטן — נפתח בלוח המלא */
  const [agendaDay, setAgendaDay] = useState<string | undefined>(undefined);
  /** התהליך שהתמהיל שלו מוצג בשורת הפירוט שבסקירה */
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
  const data = useClientDashboard();
  const { startPlan, busy: startBusy } = useStartPlan(data.plansState.start);
  /**
   * בחירה שהגיעה בכתובת — מעמוד הבית אחרי ההרשמה, או ממסך התשלום — ממשיכה
   * כאן אוטומטית: `?goal=NEW_MORTGAGE&service=SELF`.
   */
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryGoal, setEntryGoal] = useState<'NEW_MORTGAGE' | 'REFINANCE' | null>(null);
  const [entryService, setEntryService] = useState<ServiceType | null>(null);

  useEffect(() => {
    const fromHash = () => setSection(sectionFromHash());
    fromHash();
    window.addEventListener('hashchange', fromHash);
    const query = readEntryQuery();
    if (query.goal) {
      setEntryGoal(query.goal);
      setEntryService(query.service);
      // בלי סוג שירות — נפתח החלון במסך "איך תרצו לעשות את זה?"
      if (!query.service) setEntryOpen(true);
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  const navigate = useCallback((next: DashboardSection, day?: string) => {
    setAgendaDay(day);
    setSection(next);
    window.history.replaceState(null, '', next === 'overview' ? '#' : `#${next}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // המספרים בתפריט — כמה פריטים מחכים בכל אזור
  const activePlans = data.plansState.plans.filter((plan) => plan.status === 'IN_PROGRESS').length;
  const urgent = data.tasks.filter((task) => task.tone === 'urgent').length;
  const badges: Partial<Record<DashboardSection, { value: number; alert: boolean }>> = {
    overview: { value: activePlans, alert: false },
    agenda: { value: data.tasks.length, alert: urgent > 0 },
    'rate-requests': { value: data.requests.length, alert: false },
  };

  const meta = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0];
  /** תיק המסמכים של המשכנתא הפתוחה — נגיש מכל אזור בדאשבורד */
  const vaultPlan = data.plansState.plans.find((plan) => plan.status === 'IN_PROGRESS') ?? null;
  const displayName = name || email || 'אורח';
  const firstName = name?.split(' ')[0] || 'ברוכים הבאים';

  const navItems = (tone: 'sidebar' | 'bar') =>
    SECTIONS.map((item) => {
      const Icon = item.icon;
      const active = section === item.id;
      const badge = badges[item.id];
      const base =
        tone === 'sidebar'
          ? 'flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-base font-bold transition-colors'
          : 'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[15px] font-bold transition-colors';
      const state = active
        ? 'bg-white text-slate-900 shadow-lg'
        : 'text-white/70 hover:bg-white/10 hover:text-white';
      return (
        <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`${base} ${state}`}>
          <Icon className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-right">{item.label}</span>
          {badge && badge.value > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${
                badge.alert
                  ? 'bg-rose-500 text-white'
                  : active
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-white/15 text-white'
              }`}
            >
              {badge.value}
            </span>
          )}
        </button>
      );
    });

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      {/* תפריט הצד — במסך רחב */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:bg-slate-950 lg:px-4 lg:py-5">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg">
            <HomeIcon className="h-5 w-5 text-white" />
          </span>
          <span className="text-xl font-black text-white">משכלנתא</span>
        </Link>

        <p className="mt-6 px-3 text-xs font-bold tracking-wide text-white/40">האזור האישי</p>
        <nav className="mt-2 space-y-1">{navItems('sidebar')}</nav>

        <div className="mt-auto space-y-3 pt-6">
          {vaultPlan && <VaultButton planId={vaultPlan.id} data={vaultPlan.data} variant="sidebar" />}
          <MortgageEntry
            variant="sidebar"
            onStart={startPlan}
            busy={startBusy}
            hasPlans={data.plansState.plans.length > 0}
          />
          <AdvisorCta variant="sidebar" />
          <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
              <UserRound className="h-4 w-4 text-white" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/80">{displayName}</span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              title="יציאה"
              className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        {/* ראש העמוד במסך צר — מותג, משתמש וניווט אופקי */}
        <header className="sticky top-0 z-30 bg-slate-950 lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
                <HomeIcon className="h-4 w-4 text-white" />
              </span>
              <span className="text-lg font-black text-white">משכלנתא</span>
            </Link>
            <div className="flex items-center gap-1">
              <span className="max-w-[9rem] truncate text-sm font-semibold text-white/80">{displayName}</span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                title="יציאה"
                className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">{navItems('bar')}</nav>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 xl:px-8">
          <div className="mx-auto max-w-[1400px]">
            {/* במסך צר אין תפריט צד — שאלת הפתיחה יושבת מעל התוכן */}
            {vaultPlan && (
              <div className="mb-4 rounded-2xl bg-slate-950 p-3 lg:hidden">
                <VaultButton planId={vaultPlan.id} data={vaultPlan.data} variant="sidebar" />
              </div>
            )}

            {/* כותרת האזור — ממורכזת, עם השם והתאריך */}
            <div className="mb-5 text-center">
              {section === 'overview' ? (
                <>
                  <p className="text-sm font-bold text-slate-500">{DATE_FORMAT.format(new Date())}</p>
                  <h1 className="mt-1 text-3xl font-black text-slate-900 md:text-4xl">שלום, {firstName}</h1>
                  <p className="mx-auto mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
                    {meta.description}
                  </p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('overview')}
                    className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                    חזרה לסקירה
                  </button>
                  <h1 className="mt-1 text-3xl font-black text-slate-900 md:text-4xl">{meta.title}</h1>
                  <p className="mx-auto mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
                    {meta.description}
                  </p>
                </>
              )}
            </div>

            <motion.div
              key={section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {section === 'overview' && (
                <OverviewSection
                  data={data}
                  detailPlanId={detailPlanId}
                  onDetailPlan={setDetailPlanId}
                  onNavigate={navigate}
                />
              )}

              {section === 'agenda' && (
                <AgendaSection data={data} initialDay={agendaDay} onNavigate={navigate} />
              )}

              {section === 'rate-requests' && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                    <BankRateRequests />
                  </div>
                  <UnassignedMixesSection
                    mixes={data.mixesState.saved.filter(isUnassociatedMix)}
                    onDelete={data.mixesState.remove}
                  />
                </div>
              )}

              {section === 'tools' && <ToolsHub />}

              {section === 'settings' && <SettingsPanel />}
            </motion.div>
          </div>
        </main>

        {/*
          המשך הבחירה שהגיעה בכתובת. הרכיב נשאר מורכב גם אחרי שהחלון נסגר, כי
          החלונות שנפתחים ממנו (שאלת "איפה אתם בתהליך", בקשת הליווי) חיים בתוכו.
        */}
        {data.ready && (
          <MortgageEntry
            variant="dialog"
            open={entryOpen}
            onOpenChange={setEntryOpen}
            onStart={startPlan}
            busy={startBusy}
            hasPlans={data.plansState.plans.length > 0}
            initialGoal={entryGoal}
            autoService={entryService}
          />
        )}

        {/* חזרה לדאשבורד המלא — זמינה תמיד, גם אחרי גלילה, מכל אזור שנכנסים אליו */}
        {section !== 'overview' && (
          <button
            type="button"
            onClick={() => navigate('overview')}
            className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-[15px] font-black text-white shadow-xl shadow-slate-900/30 transition-transform hover:-translate-y-0.5"
          >
            <LayoutDashboard className="h-5 w-5" />
            חזרה לדאשבורד
          </button>
        )}
      </div>
    </div>
  );
}
