'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, Play, Sparkles } from 'lucide-react';
import { FREE_TOOLS } from '@/components/service-flow/FreeToolsSection';

/** הכלים החינמיים, כקישורים קטנים — בלי בונה התמהילים, שנפתח רק עם החבילה */
function FreeToolLinks({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`grid gap-2 sm:grid-cols-2 ${wide ? 'xl:grid-cols-4' : ''}`}>
      {FREE_TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link
            key={tool.id}
            href={tool.href}
            className={`group flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-3.5 py-3 text-right transition-colors ${tool.hover}`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} text-white`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 text-info font-black leading-snug text-slate-900">{tool.title}</span>
            <ArrowLeft className="h-4 w-4 shrink-0 text-blue-600 transition-transform group-hover:-translate-x-1" />
          </Link>
        );
      })}
    </div>
  );
}

/**
 * "מה תרצו לעשות?" אחרי שהלקוח פנה ליועץ: הפנייה התקבלה ובטיפול, ובינתיים —
 * הכלים החינמיים, או גישה מלאה לכל הכלים בהרשמה בתשלום. לקוח שכבר רכש חבילה
 * מקבל במקום זה את הכפתור לפתיחת תהליך.
 */
export function ContactReceivedPanel({
  paidClient,
  onStartSelf,
}: {
  paidClient: boolean;
  onStartSelf: () => void;
}) {
  return (
    <section className="rounded-3xl border-2 border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5 md:p-8" role="status">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </span>
        <h2 className="mt-3 text-title font-black text-slate-900">הפנייה שלכם ליועץ התקבלה ונמצאת בטיפול</h2>
        <p className="mx-auto mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
          יועץ משכלנתא יחזור אליכם בהקדם. בינתיים אתם מוזמנים ליהנות מהכלים החינמיים של משכלנתא
          {paidClient ? '.' : ', או לקבל גישה מלאה לכל הכלים.'}
        </p>
      </div>

      <p className="mb-2.5 mt-6 flex items-center gap-1.5 text-sm font-black text-slate-700">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        הכלים החינמיים של משכלנתא
      </p>
      <FreeToolLinks />

      <div className="mt-5 flex flex-col items-center gap-2 border-t border-violet-100 pt-5 sm:flex-row sm:justify-center">
        {paidClient ? (
          <button
            type="button"
            onClick={onStartSelf}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white shadow-md transition-colors hover:bg-blue-700 sm:w-auto"
          >
            <Play className="h-4 w-4" />
            פתיחת תהליך משכנתא
          </button>
        ) : (
          <Link
            href="/dashboard/checkout"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white shadow-md transition-colors hover:bg-blue-700 sm:w-auto"
          >
            לגישה מלאה לכל הכלים — הרשמה בתשלום
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <Link
          href="/learn"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 text-button font-bold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 sm:w-auto"
        >
          <BookOpen className="h-4 w-4" />
          מרכז הלמידה
        </Link>
      </div>
    </section>
  );
}

/** תחתית האזור האישי ללקוח שכבר פנה ליועץ — במקום הפנייה ליועץ, הכלים החינמיים */
export function FreeToolsRow() {
  return (
    <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-l from-emerald-50 via-white to-emerald-50 p-5 md:p-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">
          <Sparkles className="h-3.5 w-3.5" />
          חינם
        </span>
        <h2 className="mt-2 text-subtitle font-black text-slate-900">הכלים החינמיים של משכלנתא</h2>
        <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
          הפנייה שלכם כבר אצל היועץ. בינתיים אפשר לתכנן ולבדוק בעצמכם.
        </p>
      </div>
      <div className="mt-4">
        <FreeToolLinks wide />
      </div>
    </section>
  );
}
