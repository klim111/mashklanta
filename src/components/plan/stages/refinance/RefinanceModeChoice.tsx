'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Clock3, FileText, Loader2, Landmark, TrendingDown } from 'lucide-react';
import type { RefinanceMixData, RefinanceMode } from '@/lib/mortgage-plan';
import { refinanceReducesPayment } from '@/lib/mortgage-plan';
import { formatShekel } from '@/components/plan/ui';

/**
 * הבחירה בין מיחזור פנימי למיחזור חיצוני.
 *
 * נפתחת אחרי שהתמהיל למיחזור נבחר כסופי, לפני שהתהליך מקבל את שלביו: מיחזור
 * פנימי — בבנק שבו המשכנתא מנוהלת — הוא שלושה שלבים קצרים, כי רוב הנתונים
 * כבר בידי הבנק; מיחזור חיצוני הוא תהליך מלא כמו לקיחת משכנתא חדשה, כי הבנק
 * החדש בוחן את הלקוח ואת הנכס מחדש.
 */
export function RefinanceModeChoice({
  refinance,
  onChoose,
  busy = null,
}: {
  refinance: RefinanceMixData;
  onChoose: (mode: RefinanceMode) => void;
  /** סוג המיחזור שנשמר כרגע */
  busy?: RefinanceMode | null;
}) {
  const saving = refinance.current.monthlyPayment - refinance.refinanced.monthlyPayment;
  const reduces = refinanceReducesPayment(refinance);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <header className="mb-6 text-center">
        {reduces && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
            <TrendingDown className="h-3.5 w-3.5" />
            התמהיל שבחרתם מקטין את ההחזר החודשי ב-{formatShekel(saving)}
          </span>
        )}
        <h3 className="mt-2 text-subtitle font-black text-slate-900">איך תרצו לבצע את המיחזור?</h3>
        <p className="mx-auto mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 md:text-base">
          התמהיל למיחזור נשמר. עכשיו צריך להחליט מול מי מבצעים אותו: הבנק שבו המשכנתא מנוהלת היום
          ({refinance.bank}), או בנק אחר. ההבדל הוא במסמכים, בזמן ובבדיקות שהבנק יעשה — ולכן גם
          בשלבים שהתהליך יקבל.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <ModeCard
          icon={Building2}
          gradient="from-emerald-500 to-teal-600"
          badge={`בבנק ${refinance.bank}`}
          title="מיחזור פנימי"
          points={[
            { icon: FileText, text: 'פחות מסמכים: רוב הנתונים הנדרשים כבר קיימים בידי הבנק' },
            { icon: Clock3, text: 'זמן ביצוע קצר — הבקשה מוגשת ישירות במערכת הבנק' },
            { icon: Landmark, text: 'הבנק מתמחר את התמהיל שבניתם, ואתם מאמתים את ההצעה מול המשכנתא המקורית' },
          ]}
          summary="שלושה שלבים: התמהיל שאושר, הגשת הבקשה לבנק, ואימות ההצעה של הבנק."
          cta="בצע מיחזור פנימי"
          onClick={() => onChoose('INTERNAL')}
          busy={busy === 'INTERNAL'}
          disabled={busy !== null}
        />

        <ModeCard
          icon={Landmark}
          gradient="from-violet-500 to-purple-600"
          badge="בבנק אחר"
          title="מיחזור חיצוני"
          points={[
            { icon: FileText, text: 'תהליך הדומה ללקיחת משכנתא חדשה: הבנק החדש יבחן את הפרופיל הפיננסי שלכם ואת העסקה' },
            { icon: Clock3, text: 'זמן ביצוע ארוך יותר — פרופיל, אישור עקרוני, מכרז ריביות וחתימה' },
            { icon: Building2, text: 'ייתכן שהבנק ידרוש שמאות מחודשת לנכס כדי לאשר ולתמחר את התמהיל המבוקש' },
          ]}
          summary="חמישה שלבים: התמהיל למיחזור, הפרופיל הפיננסי, בקשת אישור עקרוני למיחזור, מכרז ריביות וחתימה."
          cta="בצע מיחזור חיצוני"
          onClick={() => onChoose('EXTERNAL')}
          busy={busy === 'EXTERNAL'}
          disabled={busy !== null}
        />
      </div>
    </motion.section>
  );
}

function ModeCard({
  icon: Icon,
  gradient,
  badge,
  title,
  points,
  summary,
  cta,
  onClick,
  busy,
  disabled,
}: {
  icon: React.ElementType;
  gradient: string;
  badge: string;
  title: string;
  points: Array<{ icon: React.ElementType; text: string }>;
  summary: string;
  cta: string;
  onClick: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col rounded-3xl border-2 border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </span>
        <div>
          <p className="text-xs font-black text-slate-500">{badge}</p>
          <h4 className="text-xl font-black text-slate-900">{title}</h4>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {points.map((point) => {
          const PointIcon = point.icon;
          return (
            <li key={point.text} className="flex items-start gap-2 text-sm font-medium leading-snug text-slate-700">
              <PointIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              {point.text}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-relaxed text-slate-600">
        {summary}
      </p>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-700 disabled:opacity-60`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
        {cta}
      </button>
    </div>
  );
}
