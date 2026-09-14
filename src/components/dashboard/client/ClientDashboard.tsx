'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { signOut } from 'next-auth/react';
import {
  ArrowLeft,
  CalendarDays,
  Calculator,
  Compass,
  FileText,
  Gavel,
  Home as HomeIcon,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react';
import { isDashboardSection } from '@/lib/client-agenda';
import type { DashboardSection } from '@/lib/client-agenda';
import { PlansOverview } from '@/components/plan/PlansOverview';
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
    id: 'mortgages',
    label: 'המשכנתאות שלי',
    title: 'המשכנתאות שלי',
    description: 'התהליכים הפתוחים, המשכנתאות שלקחתם ותמהילים שעדיין לא שויכו לנכס.',
    icon: Compass,
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
    label: 'תמהילים שהוגשו לבנקים',
    title: 'תמהילים שהוגשו לבנקים',
    description: 'מכתבי הבקשה ששלחתם, ההצעות שהתקבלו עליהם, וההשוואה ביניהן.',
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

/** קישורים ישנים כמו `/dashboard#plans` ממשיכים לעבוד */
const LEGACY_HASH: Record<string, DashboardSection> = { plans: 'mortgages' };

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
  const data = useClientDashboard();

  useEffect(() => {
    const fromHash = () => setSection(sectionFromHash());
    fromHash();
    window.addEventListener('hashchange', fromHash);
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
    mortgages: { value: activePlans, alert: false },
    agenda: { value: data.tasks.length, alert: urgent > 0 },
    'rate-requests': { value: data.requests.length, alert: false },
  };

  const meta = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0];
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
              {section === 'overview' && <OverviewSection data={data} onNavigate={navigate} />}

              {section === 'mortgages' && (
                <div className="space-y-5">
                  <SectionRow
                    href="/principal-approval"
                    icon={<FileText className="h-5 w-5" />}
                    title="אישור עקרוני — פרטי הבקשה"
                    hint="פרטי הלווים והערבים, הכנסות, חשבונות בנק ומקורות מימון — עם דוח מסכם להורדה"
                  />
                  <PlansOverview plansState={data.plansState} mixesState={data.mixesState} />
                </div>
              )}

              {section === 'agenda' && (
                <AgendaSection data={data} initialDay={agendaDay} onNavigate={navigate} />
              )}

              {section === 'rate-requests' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                  <BankRateRequests />
                </div>
              )}

              {section === 'tools' && <ToolsHub />}

              {section === 'settings' && <SettingsPanel />}
            </motion.div>
          </div>
        </main>

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

function SectionRow({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-l from-indigo-50/80 to-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
    >
      <span className="flex items-center gap-3.5">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200">
          {icon}
        </span>
        <span>
          <span className="block text-base font-black text-slate-900">{title}</span>
          <span className="block text-sm text-slate-500">{hint}</span>
        </span>
      </span>
      <span className="text-sm font-black text-indigo-600 transition-transform group-hover:-translate-x-1">
        להזנת הפרטים ←
      </span>
    </Link>
  );
}
