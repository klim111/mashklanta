'use client';

/**
 * מסך ההצצה: האורח פותח את כלי המיחזור המלא עם המסלולים שהזין בבדיקה המהירה,
 * ויכול לבצע בו 3 שינויים (נספרים לכל דפדפן). מעל הכלי — כמה שינויים נותרו,
 * והדגמות חיות של האזור האישי ושל שלבי התהליך, כדי לראות איך ייראה הדאשבורד.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Eye, LayoutDashboard, ListChecks, PlayCircle } from 'lucide-react';
import {
  GUEST_CHANGE_ALLOWANCE,
  GUEST_TRIES_EVENT,
  readGuestTries,
} from '@/components/mortgage-refinance/guestGate';
import { demoStore } from '@/demo/store';
import { cn } from '@/lib/utils';

const REGISTER_HREF = `/auth/register?callbackUrl=${encodeURIComponent('/dashboard?goal=REFINANCE&service=SELF')}`;

function useTriesLeft(): number {
  const [used, setUsed] = useState(0);
  useEffect(() => {
    const sync = () => setUsed(readGuestTries().length);
    sync();
    window.addEventListener(GUEST_TRIES_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(GUEST_TRIES_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return Math.max(0, GUEST_CHANGE_ALLOWANCE - used);
}

export function RefinancePreviewBar() {
  const left = useTriesLeft();
  const returnTo = '/mortgage-refinance?view=preview';

  return (
    <section dir="rtl" className="rounded-3xl bg-brand-dark p-5 text-white shadow-xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-cyan-100">
            <Eye className="h-4 w-4" />
            מסך הצצה
          </span>
          <h1 className="mt-2 text-subtitle font-black text-white">כלי המיחזור המלא של משכלנתא</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-200">
            המסלולים שהזנתם כבר כאן. בחרו בנק, פתחו את הניתוח ושנו ריבית, תקופה או סוג מסלול בפאנל השליטה — ותראו
            מיד את ההשפעה.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2" aria-live="polite">
          {Array.from({ length: GUEST_CHANGE_ALLOWANCE }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-3 w-8 rounded-full transition-colors',
                i < left ? 'bg-emerald-400' : 'bg-white/20'
              )}
            />
          ))}
          <span className="text-sm font-bold">
            {left > 0 ? `נותרו ${left} מתוך ${GUEST_CHANGE_ALLOWANCE} שינויים` : 'השינויים בהצצה נוצלו'}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-white/15 pt-4 md:grid-cols-[1fr_1fr_auto]">
        <DemoButton
          icon={LayoutDashboard}
          title="כך ייראה האזור האישי"
          text="הדאשבורד של לקוח רשום: תהליכים, משימות, מסמכים וחיסכון"
          onClick={() => demoStore.start('client-dashboard', { returnTo })}
        />
        <DemoButton
          icon={ListChecks}
          title="כך נראים שלבי התהליך"
          text="חמשת שלבי תכנון המשכנתא, שלב אחר שלב"
          onClick={() => demoStore.start('plan-stages', { returnTo })}
        />
        <div className="flex flex-col gap-2">
          <Link
            href={REGISTER_HREF}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-3 text-button font-black text-white shadow-md transition-colors hover:bg-blue-700"
          >
            הרשמה לפלטפורמה
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/mortgage-refinance"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-white/10"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לתוצאת הבדיקה
          </Link>
        </div>
      </div>
    </section>
  );
}

function DemoButton({
  icon: Icon,
  title,
  text,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-3 text-right transition-colors hover:bg-white/10"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-button font-black">{title}</span>
        <span className="block text-2xs text-slate-300">{text}</span>
      </span>
      <PlayCircle className="h-5 w-5 shrink-0 text-cyan-200 transition-transform group-hover:scale-110" />
    </button>
  );
}
