'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  CreditCard,
  PiggyBank,
  Search,
  Sparkles,
} from 'lucide-react';

const tools = [
  {
    id: 'equity',
    href: '/equity-planning',
    title: 'כלי תכנון הון עצמי',
    tag: 'מקדמה והוצאות נלוות',
    icon: PiggyBank,
    gradient: 'from-emerald-500 to-teal-600',
    description:
      'בונים לוח זמנים של כל הכסף שצריך להביא עד קבלת המפתח: מקדמה, מס רכישה, עו״ד, תיווך ושיפוץ.',
    benefits: [
      'רואים מראש כמה הון עצמי באמת נדרש — לא רק המקדמה',
      'אפשר לפרוס מקורות מימון על ציר זמן ולא להתפלא בחודש הסגירה',
      'מתחבר לתהליך המשכנתא כדי שלא תזינו את אותם סכומים פעמיים',
    ],
  },
  {
    id: 'consumer-loans',
    href: '/consumer-loans',
    title: 'כלי תכנון הלוואות צרכניות',
    tag: 'יחס החזר והתחייבויות',
    icon: CreditCard,
    gradient: 'from-orange-500 to-amber-600',
    description:
      'ממפים את כל ההלוואות הקיימות, בודקים איחוד או סגירה מוקדמת, ורואים איך זה משפיע על המשכנתא שיאשרו לכם.',
    benefits: [
      'כל החזר חודשי נכנס לחישוב החיתום של הבנק',
      'אפשר לבדוק אם כדאי לסגור הלוואה לפני הגשת הבקשה',
      'הנתונים זורמים לפרופיל הפיננסי ולתמהיל',
    ],
  },
  {
    id: 'feasibility',
    href: '/mortgage-planning?flow=affordability',
    title: 'כלי בדיקת היתכנות',
    tag: 'מה אני יכול להרשות לעצמי',
    icon: Search,
    gradient: 'from-blue-500 to-indigo-600',
    description:
      'אותם שלבים שמופיעים בעמוד הראשי למשתמשים לא רשומים: מחשבים את שווי הנכס המקסימלי לפי הכנסות, הון עצמי והתחייבויות.',
    benefits: [
      'יודעים לאיזה מחיר נכס לכוון לפני שיוצאים לסיורים',
      'מתחשב ביחס החזר ובתקרת המימון של בנק ישראל',
      'אפשר לחזור לתהליך התכנון עם המספרים שכבר חישבתם',
    ],
  },
  {
    id: 'learn',
    href: '/learn',
    title: 'מרכז הלמידה',
    tag: 'ידע שמקצר משא ומתן',
    icon: BookOpen,
    gradient: 'from-violet-500 to-purple-600',
    description:
      'הסברים קצרים על מסלולים, סלים אחידים, יחס החזר ועמלות — כדי להגיע לבנק עם שפה משותפת ולא עם שאלות פתוחות.',
    benefits: [
      'מבינים מה הבנק באמת משווה בין הצעות',
      'פחות הפתעות בחוזה ובלוח הסילוקין',
      'אפשר לחזור לכאן מכל שלב בתהליך',
    ],
  },
  {
    id: 'mix-planner',
    href: '/dashboard/mix-planner',
    title: 'כלי תכנון משכנתאות',
    tag: 'תמהילים ללא שיוך לנכס',
    icon: Calculator,
    gradient: 'from-cyan-500 to-blue-600',
    description:
      'בונים ומשווים תמהילים שנשמרים בחשבון כתמהילים כלליים. ברגע שמשייכים נכס — הם הופכים למשכנתא בתהליך בדאשבורד.',
    benefits: [
      'אפשר לנסות תמהילים לפני שיש דירה על השולחן',
      'השמירה היא לחשבון שלכם בבסיס הנתונים',
      'שיוך לנכס אחר כך לא דורש לבנות מחדש',
    ],
  },
];

export function ToolsHub() {
  return (
    <div dir="rtl" className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-xl md:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" />
        </div>
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            כלים ומחשבונים
          </span>
          <h2 className="mt-3 text-2xl font-black text-white md:text-3xl">מרכז הכלים שלכם</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
            כל כלי פותח מסך ייעודי. לצד כל כפתור תמצאו מה אפשר לעשות איתו ולמה זה חוסך זמן וכסף
            בתהליך.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <motion.article
              key={tool.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg md:p-6"
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l ${tool.gradient}`} />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Link
                  href={tool.href}
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l ${tool.gradient} px-5 py-4 text-sm font-black text-white shadow-md transition-transform group-hover:scale-[1.02] sm:min-w-[11.5rem]`}
                >
                  <Icon className="h-5 w-5" />
                  {tool.title}
                  <ArrowLeft className="h-4 w-4 opacity-80" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black tracking-wide text-slate-400">{tool.tag}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{tool.description}</p>
                  <ul className="mt-3 space-y-1.5">
                    {tool.benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-2 text-xs leading-relaxed text-slate-500">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
