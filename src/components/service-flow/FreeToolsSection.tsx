'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Calculator, CreditCard, PiggyBank, RefreshCw, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const FREE_TOOLS: Array<{
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  hover: string;
}> = [
  {
    href: '/mortgage-planning?flow=affordability',
    title: 'מה אני יכול להרשות לעצמי',
    description: 'שווי הנכס המקסימלי לפי ההכנסות, ההון העצמי וההתחייבויות — עם מגבלות בנק ישראל',
    icon: Calculator,
    gradient: 'from-blue-500 to-cyan-500',
    hover: 'hover:border-blue-300',
  },
  {
    href: '/mortgage-refinance',
    title: 'בדיקת מיחזור',
    description: 'מזינים את המשכנתא הקיימת ובודקים אם אפשר לשפר החזר, ריבית או תקופה',
    icon: RefreshCw,
    gradient: 'from-violet-500 to-purple-600',
    hover: 'hover:border-violet-300',
  },
  {
    href: '/equity-planning',
    title: 'כלי תכנון הון עצמי',
    description: 'מקדמה, מס רכישה, עו״ד ושיפוץ — כל הכסף שצריך להביא עד המפתח, על ציר זמן',
    icon: PiggyBank,
    gradient: 'from-emerald-500 to-teal-600',
    hover: 'hover:border-emerald-300',
  },
  {
    href: '/consumer-loans',
    title: 'כלי ניתוח הלוואות צרכניות',
    description: 'ממפים את ההלוואות הקיימות ורואים איך הן משפיעות על יחס ההחזר ועל המשכנתא שיאשרו',
    icon: CreditCard,
    gradient: 'from-amber-500 to-orange-600',
    hover: 'hover:border-amber-300',
  },
];

/**
 * הכלים החינמיים לתכנון ולניתוח מקדים — האזור שמעל "מה תרצו לעשות?" בעמוד
 * הבית. אותה שפה עיצובית: כרטיסים על רקע לבן, אייקון בגרדיאנט, וחץ.
 */
export function FreeToolsSection() {
  return (
    <div dir="rtl">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[13px] font-black text-emerald-800">
          <Sparkles className="h-3.5 w-3.5" />
          חינם · בלי הרשמה
        </span>
        <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">כלים לתכנון ולניתוח מקדים</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
          כלים שיעזרו לכם לבצע בחינם, באמצעות הכלים של משכלנתא, את התכנון והניתוח המקדים — לפני
          שמחליטים איך להתקדם.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FREE_TOOLS.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.href}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
            >
              <Link
                href={tool.href}
                className={`group flex h-full flex-col items-center rounded-3xl border-2 border-slate-200 bg-white p-6 text-center shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${tool.hover}`}
              >
                <span
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.gradient} shadow-lg transition-transform group-hover:scale-110`}
                >
                  <Icon className="h-7 w-7 text-white" />
                </span>
                <span className="text-lg font-black leading-snug text-slate-900">{tool.title}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{tool.description}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-600">
                  לכלי
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* מרכז הלמידה לבדו, במרכז — בניית התמהיל אינה חלק מהתכנון המקדים */}
      <div className="mt-4 flex justify-center">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
        >
          <BookOpen className="h-4 w-4" />
          מרכז הלמידה
        </Link>
      </div>
    </div>
  );
}
