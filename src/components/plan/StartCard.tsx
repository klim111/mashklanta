'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  HeartHandshake,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import type { LeadTopic } from '@/lib/advisor-leads';
import { AdvisorLeadDialog } from './advisor/AdvisorLeadDialog';
import type { PlanView } from './usePlan';

type FoundOption = {
  id: string;
  label: string;
  hint: string;
  action: 'start' | 'lead';
  topic?: LeadTopic;
  gradient: string;
};

const FOUND_OPTIONS: FoundOption[] = [
  {
    id: 'start',
    label: 'נתחיל תהליך לקיחת משכנתא מהתחלה',
    hint: 'בונים פרופיל, תמהיל ואישור עקרוני — צעד אחר צעד',
    action: 'start',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'have-approval',
    label: 'יש לי כבר אישור עקרוני מבנק אחד לפחות',
    hint: 'נמשיך מכאן להתמחרות ולבחירת התמהיל הטוב ביותר',
    action: 'start',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'rejected',
    label: 'הבנק סירב לתת לי אישור עקרוני',
    hint: 'יועץ יבין למה, ויעזור לתקן לפני שמגישים שוב',
    action: 'lead',
    topic: 'FOUND_PROPERTY_REJECTED',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'dont-know',
    label: 'אני לא יודע ממה להתחיל — עזרו לי',
    hint: 'יועץ ילווה אתכם מהצעד הראשון',
    action: 'lead',
    topic: 'FOUND_PROPERTY_DONT_KNOW',
    gradient: 'from-violet-500 to-purple-600',
  },
];

/** פתיחת תהליך חדש ומעבר אליו — משותף לסקירה ולאזור המשכנתאות */
export function useStartPlan(start: () => Promise<PlanView>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const startPlan = async () => {
    setBusy(true);
    try {
      const plan = await start();
      router.push(`/dashboard/plans/${plan.id}`);
    } catch {
      // השגיאה מוצגת דרך usePlans
    } finally {
      setBusy(false);
    }
  };

  return { startPlan, busy };
}

/**
 * "איפה אתם בתהליך" — נקודת הכניסה לתהליך.
 *
 * הלקוח אומר קודם איפה הוא עומד. "מצאתי נכס" פורש ארבע אפשרויות: שתיים
 * שפותחות תהליך, ושתיים שפותחות טופס פנייה ליועץ. האפשרויות נפתחות מתחת
 * לכפתור שפתח אותן ומעל שאר הכפתורים, כדי שהן יישארו צמודות לשאלה שהן עונות
 * עליה ולא יידחקו לתחתית הרשימה.
 *
 * `hero` הוא הכרטיס הכהה והגדול — במסך הראשון, כשעדיין אין תהליך, זו הפעולה
 * המרכזית. `sidebar` הוא אותו דבר בתפריט הצד, זמין מכל אזור בדאשבורד.
 */
export function StartCard({
  onStart,
  busy,
  hasPlans,
  variant = 'hero',
}: {
  onStart: () => void;
  busy: boolean;
  hasPlans: boolean;
  variant?: 'hero' | 'sidebar';
}) {
  const [foundOpen, setFoundOpen] = useState(false);
  const [leadTopic, setLeadTopic] = useState<LeadTopic | null>(null);
  const hero = variant === 'hero';

  const dialog = (
    <AdvisorLeadDialog
      open={leadTopic !== null}
      onOpenChange={(next) => {
        if (!next) setLeadTopic(null);
      }}
      topic={leadTopic ?? 'OTHER'}
    />
  );

  const entryBase =
    'group flex w-full items-center justify-between gap-3 rounded-2xl border-2 text-right transition-all';
  const entryIdle = hero
    ? 'border-white/20 bg-white/10 text-white hover:border-white/45 hover:bg-white/15'
    : 'border-white/15 bg-white/10 text-white hover:border-white/35 hover:bg-white/15';
  const entryOpen = 'border-blue-400 bg-blue-500/20 text-white';
  const entrySize = hero ? 'px-5 py-4' : 'px-3.5 py-3';
  const titleSize = hero ? 'text-lg' : 'text-[15px]';

  const entry = (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => setFoundOpen((open) => !open)}
        aria-expanded={foundOpen}
        className={`${entryBase} ${entrySize} ${foundOpen ? entryOpen : entryIdle}`}
      >
        <span className="min-w-0">
          <span className={`flex items-center gap-2 font-black ${titleSize}`}>
            <MapPin className={hero ? 'h-5 w-5' : 'h-4 w-4'} />
            מצאתי נכס
          </span>
          {hero && <span className="mt-0.5 block text-sm text-white/65">יש נכס על השולחן — נתקדם איתו</span>}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-white/70 transition-transform ${foundOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ארבע האפשרויות — צמודות לכפתור שפתח אותן, מעל שאר הכפתורים */}
      <AnimatePresence initial={false}>
        {foundOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`grid gap-2.5 ${hero ? 'sm:grid-cols-2' : ''}`}>
              {FOUND_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (option.action === 'start') onStart();
                    else if (option.topic) setLeadTopic(option.topic);
                  }}
                  className="flex items-center gap-3 rounded-2xl border-2 border-white/15 bg-white/5 p-3.5 text-right transition-all hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/10 disabled:opacity-60"
                >
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${option.gradient}`}
                  >
                    {option.action === 'start' ? (
                      busy ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      ) : (
                        <ArrowLeft className="h-5 w-5 text-white" />
                      )
                    ) : (
                      <HeartHandshake className="h-5 w-5 text-white" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-black leading-snug text-white">{option.label}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-white/60">{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EntryLink
        href="/mortgage-planning?flow=affordability"
        className={`${entryBase} ${entrySize} ${entryIdle}`}
        icon={<Search className={hero ? 'h-5 w-5' : 'h-4 w-4'} />}
        title="מעוניין לבדוק היתכנות רכישת נכס"
        hint={hero ? 'נחשב לאיזה מחיר נכס אפשר לכוון' : undefined}
        titleSize={titleSize}
      />

      <EntryLink
        href="/mortgage-refinance"
        className={`${entryBase} ${entrySize} ${entryIdle}`}
        icon={<RefreshCw className={hero ? 'h-5 w-5' : 'h-4 w-4'} />}
        title="יש לי משכנתא — בדיקת מיחזור"
        hint={hero ? 'נבדוק אם אפשר לשפר את התנאים הקיימים' : undefined}
        titleSize={titleSize}
      />
    </div>
  );

  if (!hero) {
    return (
      <div className="rounded-2xl bg-white/5 p-3">
        <p className="mb-2.5 px-1 text-center text-[13px] font-black text-white/70">
          {hasPlans ? 'מתכננים משכנתא נוספת?' : 'איפה אתם בתהליך?'}
        </p>
        {entry}
        {dialog}
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-xl md:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-violet-600/25 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[13px] font-black text-white/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            משכלנתא מלווה אתכם מהצעד הראשון ועד החתימה
          </span>
          <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-4xl">
            {hasPlans
              ? 'מתכננים משכנתא נוספת? איפה אתם בתהליך?'
              : 'בואו נתחיל את הדרך למשכנתא הראשונה שלכם עם משכלנתא'}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-white/65">
            נתחיל מהמקום שבו אתם נמצאים. בחרו את המצב שמתאים לכם, ונתאים לכם את הצעד הבא.
          </p>
        </div>

        <div className="mt-6">{entry}</div>
      </div>

      {dialog}
    </section>
  );
}

function EntryLink({
  href,
  className,
  icon,
  title,
  hint,
  titleSize,
}: {
  href: string;
  className: string;
  icon: ReactNode;
  title: string;
  hint?: string;
  titleSize: string;
}) {
  return (
    <Link href={href} className={className}>
      <span className="min-w-0">
        <span className={`flex items-center gap-2 font-black ${titleSize}`}>
          {icon}
          {title}
        </span>
        {hint && <span className="mt-0.5 block text-sm text-white/65">{hint}</span>}
      </span>
      <ArrowLeft className="h-4 w-4 shrink-0 text-white/70 transition-transform group-hover:-translate-x-1" />
    </Link>
  );
}
