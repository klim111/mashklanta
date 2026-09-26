'use client';

import { useState } from 'react';
import { HeartHandshake, Sparkles } from 'lucide-react';
import { AdvisorLeadDialog } from '@/components/plan/advisor/AdvisorLeadDialog';

/**
 * "פנו ליועץ משכלנתא למסלול בליווי" — נגיש מהדאשבורד עצמו, בלי להיכנס לשלב.
 *
 * הפנייה נשלחת כטופס ליווי רגיל בנושא "ליווי מלא", ומופיעה אצל היועצים באזור
 * הפניות. שתי הצורות מציגות את אותה פעולה: כרטיס בתפריט הצד, ובאנר בסקירה.
 */
export function AdvisorCta({ variant }: { variant: 'sidebar' | 'banner' | 'row' }) {
  const [open, setOpen] = useState(false);

  const dialog = (
    <AdvisorLeadDialog open={open} onOpenChange={setOpen} topic="FULL_SERVICE" />
  );

  if (variant === 'sidebar') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group w-full rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 text-center shadow-lg shadow-violet-900/40 transition-transform hover:-translate-y-0.5"
        >
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <HeartHandshake className="h-5 w-5 text-white" />
          </span>
          <span className="mt-2 block text-info font-black leading-snug text-white">
            פנו ליועץ משכלנתא למסלול בליווי
          </span>
          <span className="mt-1 block text-xs leading-snug text-white/75">
            יועץ עושה בשבילכם את כל חמשת השלבים
          </span>
        </button>
        {dialog}
      </>
    );
  }

  if (variant === 'row') {
    return (
      <>
        <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-l from-violet-50 via-indigo-50 to-violet-50 p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg">
            <HeartHandshake className="h-7 w-7" />
          </span>
          <h2 className="mt-3 text-title font-black text-slate-900">
            רוצים שיועץ יעשה את העבודה?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-lg leading-relaxed text-slate-600">
            יועץ משכנתאות של משכלנתא מלווה אתכם משלב אחד ועד כל שלבי התכנון. המחיר נקבע לפי השלבים
            ומורכבות התיק, ומה ששילמתם על הפלטפורמה מקוזז. השאירו פרטים ויועץ יחזור אליכם.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mx-auto mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-10 py-4 text-cta font-black text-white shadow-lg shadow-violet-600/25 transition-transform hover:-translate-y-0.5 hover:bg-violet-700"
          >
            <Sparkles className="h-5 w-5" />
            פנו ליועץ משכלנתא למסלול בליווי
          </button>
        </section>
        {dialog}
      </>
    );
  }

  return (
    <>
      <section className="flex h-full flex-col justify-between rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 text-center">
        <div>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
            <HeartHandshake className="h-6 w-6" />
          </span>
          <h3 className="mt-3 text-subtitle font-black text-slate-900">רוצים שיועץ יעשה את העבודה?</h3>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-600">
            יועץ משכלנתא מלווה אתכם משלב אחד ועד כל שלבי התכנון, והמחיר נקבע לפי השלבים ומורכבות
            התיק. השאירו פרטים ויועץ יחזור אליכם.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-button font-black text-white shadow-md transition-colors hover:bg-violet-700"
        >
          <Sparkles className="h-4 w-4" />
          פנו ליועץ למסלול בליווי
        </button>
      </section>
      {dialog}
    </>
  );
}
