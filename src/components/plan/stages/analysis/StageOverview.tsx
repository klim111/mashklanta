'use client';

import React from 'react';
import { ArrowLeft, BadgeCheck, Calculator, FileCheck2, Loader2, ShieldCheck, Sparkles, Wallet, Wrench } from 'lucide-react';

/**
 * מסך הפתיחה של שלב הפרופיל הפיננסי.
 *
 * לפני שמזינים נתון ראשון כדאי לדעת למה מזינים אותו. השלב הזה נראה כמו טופס,
 * אבל הוא בעצם בדיקה: האם העסקה עומדת בכל מה שהרגולציה דורשת, מול ההכנסות
 * וההון שיש בפועל. מי שמגיש לבנק בלי הבדיקה הזו מגלה את התשובה אחרי שנרשם
 * סירוב בתיק — וסירוב נשאר שם.
 */
export function StageOverview({
  onStart,
  onAdvisor,
  advisorBusy = false,
}: {
  onStart: () => void;
  /** בקשת ליווי חינמית ליועץ — התשלום בהמשך */
  onAdvisor?: () => void;
  advisorBusy?: boolean;
}) {
  const steps = [
    {
      icon: <Calculator className="h-6 w-6 text-white" />,
      gradient: 'from-blue-600 to-indigo-600',
      title: 'מחשבים את התמונה הפיננסית',
      body: 'הכנסה פנויה, יחס החזר ויחס מימון — שלושת המספרים שהבנק בוחן קודם כול, מחושבים מהנתונים שתזינו.',
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-white" />,
      gradient: 'from-emerald-600 to-teal-600',
      title: 'מוודאים עמידה בדרישות',
      body: 'כל מגבלה רגולטורית נבדקת מול העסקה שלכם, לפי גובהה וסוגה — וכך יורד הסיכוי לסירוב או לתקלה באישור העקרוני.',
    },
    {
      icon: <FileCheck2 className="h-6 w-6 text-white" />,
      gradient: 'from-violet-600 to-purple-600',
      title: 'מכינים את תיק המסמכים',
      body: 'הדוח שבסוף השלב מפרט בדיוק אילו מסמכים הבנק ידרוש כדי לאמת את מה שהוצהר — שלושה חודשים אחורה.',
    },
    {
      icon: <Wallet className="h-6 w-6 text-white" />,
      gradient: 'from-amber-500 to-orange-600',
      title: 'יודעים על מה אתם עומדים',
      body: 'לאיזה מחיר נכס אפשר לכוון, מה יהיה ההחזר החודשי, וכמה הון עצמי נדרש — לפני שמתחייבים למשהו.',
    },
  ];

  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <header className="mb-7 text-center">
        <p className="mb-2 text-xs font-black tracking-wide text-blue-600">שלב 1 מתוך 5</p>
        <h3 className="text-2xl font-black text-slate-900 md:text-4xl">הפרופיל הפיננסי שלכם</h3>
        <p className="mx-auto mt-3 max-w-3xl text-base font-medium leading-relaxed text-slate-600">
          בשלב הזה מכינים את כל מה שנדרש לקבלת אישור עקרוני: מחשבים הכנסה פנויה, יחס מימון ויחס
          החזר, מוודאים שהעסקה אפשרית, ובונים תמונה פיננסית ברורה — זו שלפיה ייבנה התמהיל בשלב
          הבא, כך שיתאים לפרופיל שלכם ולא למישהו אחר.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.title}
            className="flex flex-col items-center gap-3 rounded-3xl border-2 border-slate-200 bg-slate-50/60 p-5 text-center"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} shadow-lg`}
            >
              {step.icon}
            </span>
            <h4 className="text-lg font-black text-slate-900">{step.title}</h4>
            <p className="text-sm font-medium leading-relaxed text-slate-600">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border-2 border-emerald-300 bg-emerald-50/60 p-5 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-black text-white">
          <BadgeCheck className="h-4 w-4" />
          התוצר של השלב
        </span>
        <p className="mx-auto mt-3 max-w-3xl text-base font-semibold leading-relaxed text-slate-700">
          דוח פרופיל פיננסי שאומר בדיוק איפה אתם עומדים מול כל דרישה רגולטורית, כמה מרווח נשאר
          לכם עד כל מגבלה, ואילו מסמכים תצטרכו להציג כדי שהבנק יאמת את הנתונים. אפשר להוריד
          אותו, והוא זה שמקטין את הסיכוי לסירוב.
        </p>
      </div>

      {/* שתי הדרכים לעבור את השלב — זהה לשאר השלבים */}
      <div className="mt-7 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={onStart}
          className="flex flex-col items-center gap-2 rounded-3xl border-2 border-blue-200 bg-blue-50/40 p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg">
            <Wrench className="h-6 w-6 text-white" />
          </span>
          <span className="text-base font-black text-slate-900">נתחו את הנתונים לבד באמצעות משכלנתא</span>
          <span className="text-sm font-medium leading-snug text-slate-600">
            בונים את הפרופיל בעצמכם, צעד אחר צעד
          </span>
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-blue-700">
            בואו נתחיל
            <ArrowLeft className="h-4 w-4" />
          </span>
        </button>

        {onAdvisor && (
          <button
            type="button"
            onClick={onAdvisor}
            disabled={advisorBusy}
            className="flex flex-col items-center gap-2 rounded-3xl border-2 border-violet-300 bg-violet-50/50 p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg">
              {advisorBusy ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <Sparkles className="h-6 w-6 text-white" />
              )}
            </span>
            <span className="text-base font-black text-slate-900">
              תנו ליועץ משכלנתא לעשות לכם את העבודה
            </span>
            <span className="text-sm font-medium leading-snug text-slate-600">
              יועץ יטפל בשלב עבורכם ויחזור אליכם לתיאום — בקשה חינמית, התשלום בהמשך
            </span>
            <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-violet-700">
              שלחו בקשה ליועץ
              <ArrowLeft className="h-4 w-4" />
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
