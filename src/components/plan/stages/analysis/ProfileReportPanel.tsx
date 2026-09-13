'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Download, HelpCircle, Lightbulb, XCircle } from 'lucide-react';
import type { PlanData } from '@/lib/mortgage-plan';
import { buildProfileReport, overallHeadline, DOCUMENT_CONSISTENCY_WARNING } from '@/lib/profile-report';
import type { CheckStatus } from '@/lib/profile-report';
import { printProfileReport } from './reportDocument';

const STATUS_STYLE: Record<CheckStatus, { box: string; text: string; label: string; icon: React.ReactNode }> = {
  pass: {
    box: 'border-emerald-300 bg-emerald-50/70',
    text: 'text-emerald-700',
    label: 'עומד בדרישה',
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  near: {
    box: 'border-amber-300 bg-amber-50/70',
    text: 'text-amber-700',
    label: 'קרוב למגבלה',
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  fail: {
    box: 'border-rose-300 bg-rose-50/70',
    text: 'text-rose-700',
    label: 'אינו עומד בדרישה',
    icon: <XCircle className="h-5 w-5" />,
  },
  unknown: {
    box: 'border-slate-300 bg-slate-50',
    text: 'text-slate-600',
    label: 'חסרים נתונים',
    icon: <HelpCircle className="h-5 w-5" />,
  },
};

/**
 * התוצר של השלב הראשון, על המסך.
 *
 * אותו תוכן בדיוק שיוצא לקובץ: מה נבדק, מה עבר, כמה מרווח נשאר, אילו מסמכים
 * יידרשו, ומה חשוב לוודא לפני ההגשה. ההורדה עוברת דרך תיבת ההדפסה של הדפדפן,
 * כמו מכתב בקשת הריביות לבנקים.
 */
export function ProfileReportPanel({
  data,
  planName,
}: {
  data: PlanData;
  planName?: string;
}) {
  const report = useMemo(() => buildProfileReport(data), [data]);
  const verdict = STATUS_STYLE[report.overall];

  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <header className="mb-5 text-center">
        <p className="text-xs font-black tracking-wide text-blue-600">התוצר של השלב</p>
        <h3 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">דוח הפרופיל הפיננסי</h3>
        <p className="mx-auto mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 md:text-base">
          {report.headline}
        </p>
      </header>

      <div className={`rounded-3xl border-2 p-5 text-center ${verdict.box}`}>
        <span className={`inline-flex items-center justify-center gap-2 ${verdict.text}`}>
          {verdict.icon}
          <span className="text-xl font-black">{overallHeadline(report.overall)}</span>
        </span>
      </div>

      <h4 className="mt-7 text-center text-lg font-black text-slate-900">
        עמידה בדרישות הרגולטוריות
      </h4>
      <div className="mt-3 space-y-2.5">
        {report.checks.map((check) => {
          const style = STATUS_STYLE[check.status];
          return (
            <div key={check.key} className={`rounded-2xl border-2 p-4 ${style.box}`}>
              <div className="flex flex-wrap items-center justify-center gap-3 text-center">
                <span className={`inline-flex items-center gap-1.5 font-black ${style.text}`}>
                  {style.icon}
                  {style.label}
                </span>
                <span className="text-base font-black text-slate-900">{check.label}</span>
                <span className="text-lg font-black tabular-nums text-slate-900">{check.value}</span>
                <span className="text-sm font-bold text-slate-600">מגבלה: {check.limit}</span>
              </div>
              <p className="mt-2 text-center text-sm font-medium leading-relaxed text-slate-700">
                {check.note}
              </p>
            </div>
          );
        })}
      </div>

      <h4 className="mt-7 text-center text-lg font-black text-slate-900">התמונה הפיננסית</h4>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {report.figures.map((figure) => (
          <div
            key={figure.label}
            className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-3 text-center"
          >
            <span className="block text-xs font-bold text-slate-600">{figure.label}</span>
            <span className="mt-0.5 block text-lg font-black tabular-nums text-slate-900">
              {figure.value}
            </span>
          </div>
        ))}
      </div>

      <h4 className="mt-7 text-center text-lg font-black text-slate-900">
        המסמכים שיידרשו לאימות הנתונים
      </h4>
      <p className="mx-auto mt-1 max-w-3xl text-center text-sm font-medium leading-relaxed text-slate-600">
        הבנק אינו מסתמך על מה שהוצהר אלא מאמת אותו מול מסמכים. אלה המסמכים שיידרשו לפי הרכב
        הלווים ואופן ההעסקה שהוזנו — שלושה חודשים אחורה בכל מסמך שוטף.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {report.documents.map((group) => (
          <div key={group.title} className="rounded-2xl border-2 border-slate-200 bg-white p-4">
            <h5 className="text-center text-base font-black text-slate-900">{group.title}</h5>
            <ul className="mt-2 space-y-1">
              {group.documents.map((name) => (
                <li
                  key={name}
                  className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-slate-700"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-3xl border-2 border-amber-300 bg-amber-50/70 p-5">
        <h4 className="flex items-center justify-center gap-2 text-center text-lg font-black text-amber-900">
          <AlertTriangle className="h-5 w-5" />
          לפני ההגשה — הצליבו את הסכומים
        </h4>
        <p className="mt-2 text-center text-sm font-semibold leading-relaxed text-amber-900">
          {DOCUMENT_CONSISTENCY_WARNING}
        </p>
      </div>

      {report.recommendations.length > 0 && (
        <>
          <h4 className="mt-7 text-center text-lg font-black text-slate-900">
            המלצות לתכנון התמהיל
          </h4>
          <div className="mt-3 space-y-2.5">
            {report.recommendations.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-4 text-center"
              >
                <h5 className="flex items-center justify-center gap-2 text-base font-black text-blue-900">
                  <Lightbulb className="h-4 w-4" />
                  {item.title}
                </h5>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-700">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-7 flex justify-center">
        <button
          type="button"
          onClick={() => printProfileReport(report, planName)}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-7 py-3.5 text-base font-black text-white shadow-lg transition-colors hover:bg-slate-700"
        >
          <Download className="h-5 w-5" />
          הורדת הדוח
        </button>
      </div>

      <p className="mt-3 text-center text-xs font-medium leading-relaxed text-slate-500">
        הדוח אינו אישור עקרוני ואינו מחייב בנק כלשהו. ההחלטה על אישור המשכנתא, גובהה והריביות
        נתונה לחיתום הבנק בלבד.
      </p>
    </section>
  );
}
