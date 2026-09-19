'use client';

import { useState } from 'react';
import { HeartHandshake, Sparkles } from 'lucide-react';
import { AdvisorLeadDialog } from '@/components/plan/advisor/AdvisorLeadDialog';

/**
 * "פנו ליועץ כלכלת המשפחה" — נקודת הפנייה של כלי תכנון ההוצאות.
 *
 * אותו טופס פנייה שמשמש בשאר הכלים, עם נושא משלו כדי שהיועץ יראה מיד שמדובר
 * בתכנון ההון העצמי וההוצאות הנלוות. שלוש הצורות מציגות את אותה פעולה: כפתור
 * בכותרת הכלי, שורה מלאה בין החלקים, וכרטיס במסך הסיכום.
 */
export function FamilyEconomyCta({
  variant = 'row',
  className = '',
}: {
  variant?: 'header' | 'row' | 'card';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialog = (
    <AdvisorLeadDialog open={open} onOpenChange={setOpen} topic="FAMILY_ECONOMY" />
  );

  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-black text-white ring-1 ring-inset ring-white/20 backdrop-blur transition-colors hover:bg-white/20 ${className}`}
        >
          <HeartHandshake className="h-4 w-4" />
          פנו ליועץ כלכלת המשפחה
        </button>
        {dialog}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        <section
          className={`flex flex-col justify-between self-start rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 text-center ${className}`}
        >
          <div>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <HeartHandshake className="h-6 w-6" />
            </span>
            <h3 className="mt-3 text-lg font-black text-slate-900">רוצים לעבור על זה עם מומחה?</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-600">
              יועץ כלכלת המשפחה של משכלנתא יעבור איתכם על ההון העצמי, ההוצאות הנלוות והתזרים עד
              קבלת המפתח.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-[15px] font-black text-white shadow-md transition-colors hover:bg-violet-700"
          >
            <Sparkles className="h-4 w-4" />
            פנו ליועץ כלכלת המשפחה
          </button>
        </section>
        {dialog}
      </>
    );
  }

  return (
    <>
      <section
        className={`rounded-2xl border-2 border-violet-200 bg-gradient-to-l from-violet-50 via-indigo-50 to-violet-50 p-5 text-center sm:p-6 ${className}`}
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg">
          <HeartHandshake className="h-6 w-6" />
        </span>
        <h2 className="mt-3 text-xl font-black text-slate-900 md:text-2xl">
          לא בטוחים איזה סכום להזין בכל שורה?
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
          יועץ כלכלת המשפחה של משכלנתא יעבור איתכם על הטבלה, יתאים את ההוצאות לעסקה שלכם ויבנה
          תזרים שמחזיק עד קבלת המפתח. השאירו פרטים ונחזור אליכם.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mx-auto mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-8 py-3.5 text-[16px] font-black text-white shadow-lg shadow-violet-600/25 transition-transform hover:-translate-y-0.5 hover:bg-violet-700"
        >
          <Sparkles className="h-5 w-5" />
          פנו ליועץ כלכלת המשפחה
        </button>
      </section>
      {dialog}
    </>
  );
}
