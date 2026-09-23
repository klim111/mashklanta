'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Compass,
  Eye,
  EyeOff,
  FileCheck2,
  Landmark,
  Layers,
  PiggyBank,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { ProfileReportPanel } from './ProfileReportPanel';
import { SAMPLE_PLAN_NAME, sampleProfileData } from './sampleProfile';

/** אחרי 40 שניות המסך עובר הלאה מעצמו — מי שקורא מהר לוחץ "המשך" */
const AUTO_ADVANCE_MS = 40_000;

const SLIDES = ['intro', 'output', 'all'] as const;
type Slide = (typeof SLIDES)[number];

const reveal = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.4 },
};

/** חמש העבודות של השלב — מה עושים בו, בסדר הזה */
const STAGE_ACTIONS: Array<{ icon: ReactNode; gradient: string; title: string; body: string }> = [
  {
    icon: <Users className="h-6 w-6 text-white" />,
    gradient: 'from-blue-600 to-indigo-600',
    title: 'בונים פרופיל עסקה ופרופיל פיננסי של הלקוח',
    body: 'מי הלווים, מה הם מרוויחים ומה הם מחזירים היום, כמה הון עצמי יש, ואיזו עסקה על השולחן — במספרים שהבנק בוחן.',
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-white" />,
    gradient: 'from-emerald-600 to-teal-600',
    title: 'מוודאים עמידה בדרישות הבנקים ובדרישות הרגולציה',
    body: 'שיעור המימון מול תקרת בנק ישראל לסוג העסקה, יחס ההחזר מול המגבלה, התקופה והגיל — לפני שהבנק בודק אותם.',
  },
  {
    icon: <FileCheck2 className="h-6 w-6 text-white" />,
    gradient: 'from-indigo-600 to-blue-600',
    title: 'מגדירים מה צריך לכלול תיק המסמכים להגשה לבנק',
    body: 'רשימה לפי אופן ההעסקה של כל לווה, ניהול החשבון וסוג העסקה — ומוודאים שכל מסמך שיוגש יהיה תקין ומלא.',
  },
  {
    icon: <CalendarClock className="h-6 w-6 text-white" />,
    gradient: 'from-amber-500 to-orange-600',
    title: 'בונים תהליך מותאם אישית ומתזמנים את השלבים בו',
    body: 'לאילו בנקים מגישים, מתי, מה מכינים לפני החוזה ומה אחרי — לפי הצפי להכנסות ולמועדי התשלום שלכם.',
  },
  {
    icon: <Compass className="h-6 w-6 text-white" />,
    gradient: 'from-violet-600 to-purple-600',
    title: 'מגדירים את העקרונות והקווים המנחים לתמהיל מותאם אישית',
    body: 'איזון בין עלות המימון, גמישות לשינויים ולפירעונות מוקדמים, סיכון ויציבות — לפי הפרופיל הפיננסי, כולל העברת הכספים ותזמונם.',
  },
];

/** מה הדוח נותן — התוצרים של השלב, והבלוקים שעולים מעל הדוח לדוגמה */
const REPORT_OUTPUTS: Array<{ icon: ReactNode; title: string; body: string; accent: string }> = [
  {
    icon: <BarChart3 className="h-4 w-4 text-white" />,
    title: 'יחס מימון, יחס החזר והבטוחה מול מגבלות הרגולציה',
    body: 'כל מגבלה בשורה אחת: מה בעסקה שלכם, מה המותר, ובאיזה צבע אתם.',
    accent: 'from-blue-600 to-cyan-500',
  },
  {
    icon: <FileCheck2 className="h-4 w-4 text-white" />,
    title: 'רשימת המסמכים הנדרשת להגשת הבקשה לבנקים',
    body: 'לפי הלווים ולפי העסקה, עם מה שאופציונלי בשלב הזה ומה חובה.',
    accent: 'from-indigo-600 to-blue-500',
  },
  {
    icon: <Compass className="h-4 w-4 text-white" />,
    title: 'תיאור התמהיל המותאם לפרופיל',
    body: 'איזון בין עלויות מימון, גמישות לשינויים ופירעונות מוקדמים, סיכון ויציבות — לפי הפרופיל הפיננסי שלכם.',
    accent: 'from-emerald-600 to-teal-500',
  },
  {
    icon: <Wallet className="h-4 w-4 text-white" />,
    title: 'הכסף הפנוי שיישאר אחרי תשלום המשכנתא',
    body: 'הערכת תמונת המצב החודשית שלכם ביום שאחרי החתימה.',
    accent: 'from-violet-600 to-fuchsia-500',
  },
  {
    icon: <PiggyBank className="h-4 w-4 text-white" />,
    title: 'סך הריביות שישולמו לאורך תקופת המשכנתא',
    body: 'המספר שהתמהיל בשלב הבא ינסה להוריד — כאן הוא נקודת הפתיחה.',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    icon: <Landmark className="h-4 w-4 text-white" />,
    title: 'הסבר על הסיכונים והמלצות לבניית התמהיל',
    body: 'כל המלצה שצפה תוך כדי מילוי הפרטים — תלושים, שמאות מוקדמת, גרייס, הבנק שלכם — נאספת לדוח.',
    accent: 'from-rose-600 to-pink-500',
  },
];

/**
 * מסך «על השלב» — הפתיח של שלב הפרופיל הפיננסי.
 *
 * לפני שמזינים נתון ראשון כדאי לדעת למה מזינים אותו, ולכן ההסבר בא ברצף:
 * מה השלב ולמה הוא קריטי, מה עושים בו ומה יוצא ממנו — ואז התוצר, דוח לדוגמה
 * שהבלוקים המסבירים אותו עולים מעליו אחד אחרי השני.
 *
 * מה שבא בסוף ההסבר נקבע לפי מה שהלקוח בחר בתחילת הדרך, ולא נשאל כאן שוב:
 * מי שבחר לבצע לבד מקבל את כפתור ההתחלה (והיועץ זמין לו מהכפתור הצף), ומי
 * שבחר ליווי יועץ רואה מיד אחרי ההסבר את מסך «היועץ מטפל בשלב זה».
 */
export function StageOverview({
  onStart,
  advisorSummary,
}: {
  onStart: () => void;
  /** יועץ מטפל בשלב — המסך שלו מוצג בסוף ההסבר במקום כפתור ההתחלה */
  advisorSummary?: ReactNode;
}) {
  const [slide, setSlide] = useState<Slide>('intro');

  const next = () => {
    const index = SLIDES.indexOf(slide);
    if (index < SLIDES.length - 1) setSlide(SLIDES[index + 1]);
  };

  useEffect(() => {
    // מסך הדוח לדוגמה אינו מתקדם מעצמו — הבלוקים שלו עולים בקצב שלהם
    if (slide !== 'intro') return;
    const timer = setTimeout(next, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {slide === 'intro' && (
        <motion.section key="intro" {...reveal}>
          <IntroSlide />
          <SlideFooter slide={slide} onNext={next} />
        </motion.section>
      )}

      {slide === 'output' && (
        <motion.section key="output" {...reveal}>
          <OutputSlide />
          <SlideFooter slide={slide} onNext={next} autoAdvance={false} />
        </motion.section>
      )}

      {slide === 'all' && (
        <motion.section key="all" {...reveal} className="space-y-4">
          <IntroSlide compact />
          <OutputSlide compact />

          {/* מה שבא אחרי ההסבר — נכנס אחרון, ונע פעם אחת כדי למשוך אליו את העין */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, x: [0, -16, 0] }}
            transition={{
              opacity: { duration: 0.45, delay: 0.25 },
              y: { duration: 0.45, delay: 0.25 },
              x: { delay: 1.1, duration: 0.85, times: [0, 0.5, 1], ease: 'easeInOut' },
            }}
          >
            {advisorSummary ?? <StartStageCard onStart={onStart} />}
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** כפתור ההתחלה — למי שבחר לבצע את השלב לבד; היועץ זמין מהכפתור הצף */
function StartStageCard({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-blue-200 bg-gradient-to-l from-blue-50 via-white to-cyan-50 p-6 text-center shadow-sm md:p-8">
      <h3 className="text-subtitle font-black text-slate-900">מוכנים? מתחילים בנכס ובעסקה</h3>
      <p className="max-w-lg text-info leading-relaxed text-slate-600">
        משם ממשיכים ללווים, להכנסות העתידיות, לתיק המסמכים ולדוח. הכול נשמר תוך כדי, ואפשר
        לחזור לכל מסך.
      </p>
      <motion.button
        type="button"
        onClick={onStart}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className="mt-1 inline-flex items-center gap-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 px-8 py-4 text-cta font-black text-white shadow-[0_14px_36px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_18px_44px_rgba(37,99,235,0.45)]"
      >
        <Play className="h-5 w-5" />
        התחל שלב
        <ArrowLeft className="h-5 w-5" />
      </motion.button>
      <p className="text-xs text-slate-500">
        בכל רגע אפשר לפנות ליועץ לעזרה בשלב זה — הכפתור הצף מלווה את כל המסכים.
      </p>
    </section>
  );
}

/** ניווט בין מסכי ההסבר: נקודות התקדמות וכפתור "המשך" */
function SlideFooter({
  slide,
  onNext,
  autoAdvance = true,
}: {
  slide: Slide;
  onNext: () => void;
  autoAdvance?: boolean;
}) {
  return (
    <div className="mt-5 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {SLIDES.slice(0, 2).map((item) => (
          <span
            key={item}
            className={`h-2.5 rounded-full transition-all ${
              item === slide ? 'w-8 bg-blue-600' : 'w-2.5 bg-slate-300'
            }`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-3.5 text-cta font-black text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
      >
        המשך
        <ArrowLeft className="h-4 w-4" />
      </button>
      {autoAdvance && <p className="text-sm text-slate-400">המסך יתקדם מעצמו בעוד רגע</p>}
    </div>
  );
}

/** מעטפת אחידה לכל אחד ממסכי ההסבר */
function SlideCard({
  badge,
  title,
  lead,
  tone,
  children,
}: {
  badge: ReactNode;
  title: string;
  lead?: ReactNode;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-3xl border-2 bg-white p-6 shadow-sm md:p-8 ${tone}`}>
      <header className="mb-6 text-center">
        {badge}
        <h3 className="mt-3 text-subtitle font-black text-slate-900">{title}</h3>
        {lead}
      </header>
      {children}
    </section>
  );
}

function Badge({ icon, text, tone }: { icon: ReactNode; text: string; tone: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-black text-white ${tone}`}>
      {icon}
      {text}
    </span>
  );
}

/** כותרת של חלק בתוך מסך ההסבר — "מה עושים בשלב הזה", "התוצרים של השלב" */
function SectionTitle({ icon, children, hint }: { icon: ReactNode; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 text-center">
      <h4 className="inline-flex items-center gap-2 text-lg font-black text-slate-900 md:text-xl">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">{icon}</span>
        {children}
      </h4>
      {hint && <p className="mx-auto mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">{hint}</p>}
    </div>
  );
}

/** חמש העבודות — אותו כרטיס בכל מקום שבו הן מופיעות */
function ActionsList({ compact = false }: { compact?: boolean }) {
  return (
    <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {STAGE_ACTIONS.map((step, index) => (
        <motion.li
          key={step.title}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: index * 0.08, duration: 0.35 }}
          className="flex gap-3 rounded-3xl border-2 border-slate-200 bg-slate-50 p-4"
        >
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} shadow-lg`}>
            {step.icon}
          </span>
          <div>
            <span className="rounded-full bg-white px-2 py-0.5 text-2xs font-black text-slate-500 ring-1 ring-slate-200">
              {index + 1}
            </span>
            <h4 className="mt-1 text-info font-black leading-snug text-slate-900">{step.title}</h4>
            {!compact && (
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">{step.body}</p>
            )}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

/** התוצרים — הרשימה הקצרה, כפי שהיא מופיעה גם במסך המסכם */
function OutputsList() {
  return (
    <ul className="mx-auto grid max-w-4xl gap-3 md:grid-cols-2 xl:grid-cols-3">
      {REPORT_OUTPUTS.map((item) => (
        <li key={item.title} className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3.5">
          <p className="flex items-center gap-2 text-sm font-black text-slate-900">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent}`}>
              {item.icon}
            </span>
            {item.title}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * מסך 1 — מה השלב הזה ולמה הוא קריטי, מה עושים בו (חמש העבודות, בסדר הזה)
 * ומה יוצא ממנו. במסך המסכם (`compact`) נשארות רק העבודות — התוצרים מוצגים
 * שם בכרטיס התוצר.
 */
function IntroSlide({ compact = false }: { compact?: boolean }) {
  return (
    <SlideCard
      tone="border-blue-200"
      badge={<Badge icon={<Sparkles className="h-4 w-4" />} text="על השלב · שלב 1 מתוך 5" tone="bg-blue-600" />}
      title="הפרופיל הפיננסי שלכם"
      lead={
        <p className="mx-auto mt-3 max-w-3xl rounded-2xl bg-blue-50 px-5 py-4 text-lg font-black leading-relaxed text-slate-800 md:text-xl">
          שלב קריטי שבו בונים את פרופיל העסקה והפרופיל הפיננסי, בודקים עמידה בדרישות הבנקים
          והרגולציה, ומכינים את תיק המסמכים ואת הקווים המנחים לתמהיל — הבסיס שכל שאר השלבים
          נשענים עליו.
        </p>
      }
    >
      <SectionTitle
        icon={<Layers className="h-4 w-4" />}
        hint={compact ? undefined : 'כל עבודה נשענת על זו שלפניה, וכולן יחד מרכיבות את הדוח שיוצא בסוף השלב.'}
      >
        מה עושים בשלב הזה
      </SectionTitle>
      <ActionsList compact={compact} />

      {!compact && (
        <div className="mt-8">
          <SectionTitle
            icon={<BadgeCheck className="h-4 w-4" />}
            hint="דוח פרופיל פיננסי אחד, שאוסף את כל מה שנבנה בשלב — ומלווה אתכם לכל השלבים הבאים."
          >
            התוצרים של השלב
          </SectionTitle>
          <OutputsList />
        </div>
      )}
    </SlideCard>
  );
}

/**
 * מסך 2 — התוצר. ברקע דוח לדוגמה, ומעליו הבלוקים שמסבירים מה כל חלק בו נותן,
 * עולים אחד אחרי השני על רקע כהה כדי שלא ייבלעו בדוח. אפשר גם לפתוח את
 * הדוח לדוגמה במלואו.
 */
function OutputSlide({ compact = false }: { compact?: boolean }) {
  const sample = useMemo(() => sampleProfileData(), []);
  const [showFullSample, setShowFullSample] = useState(false);

  if (compact) {
    return (
      <SlideCard
        tone="border-emerald-300"
        badge={<Badge icon={<BadgeCheck className="h-4 w-4" />} text="התוצר של השלב" tone="bg-emerald-600" />}
        title="דוח פרופיל פיננסי"
      >
        <OutputsList />
        <CriticalNote />
      </SlideCard>
    );
  }

  return (
    <SlideCard
      tone="border-emerald-300"
      badge={<Badge icon={<BadgeCheck className="h-4 w-4" />} text="התוצר של השלב" tone="bg-emerald-600" />}
      title="דוח פרופיל פיננסי"
      lead={
        <p className="mx-auto mt-3 max-w-3xl text-info font-medium leading-relaxed text-slate-600">
          לוח בקרה אחד שאוסף את כל מה שנבנה בשלב: נתוני העסקה, פרופיל הלקוח, המדים מול מגבלות
          הרגולציה, התזרים, לוח הזמנים של התהליך, הרכב המסלולים, הסיכונים וההמלצות. ברקע דוח
          לדוגמה, ומעליו מה שכל חלק בו נותן לכם.
        </p>
      }
    >
      <div className="mb-3 flex justify-center">
        <button
          type="button"
          onClick={() => setShowFullSample((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-slate-900"
        >
          {showFullSample ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showFullSample ? 'חזרה להסבר על הדוח' : 'צפייה בדוח לדוגמה במלואו'}
        </button>
      </div>

      <div className={`relative overflow-hidden rounded-3xl ${showFullSample ? '' : 'max-h-[780px]'}`}>
        <div
          aria-hidden={!showFullSample}
          className={
            showFullSample
              ? ''
              : 'pointer-events-none select-none scale-[0.985] opacity-70 blur-[1.5px] transition-all'
          }
        >
          <ProfileReportPanel data={sample} planName={SAMPLE_PLAN_NAME} sample />
        </div>

        {!showFullSample && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
              <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {REPORT_OUTPUTS.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 28, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.4, duration: 0.45, ease: 'easeOut' }}
                    className="rounded-2xl border border-white/10 bg-slate-900 p-4 text-right text-white shadow-[0_18px_40px_rgba(15,23,42,0.45)] ring-1 ring-white/10"
                  >
                    <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} shadow-md`}>
                      {item.icon}
                    </span>
                    <h4 className="text-sm font-black leading-snug text-white">{item.title}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">{item.body}</p>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + REPORT_OUTPUTS.length * 0.4, duration: 0.45 }}
                  className="flex items-center gap-3 rounded-2xl bg-gradient-to-l from-blue-700 to-cyan-600 p-4 text-right text-white shadow-xl ring-1 ring-white/20 sm:col-span-2 lg:col-span-3"
                >
                  <BadgeCheck className="h-5 w-5 shrink-0 text-cyan-100" />
                  <p className="text-sm leading-relaxed">
                    <span className="font-black">הדוח נשמר בתהליך ומלווה אתכם לשלבים הבאים</span> — עם
                    ההמלצות שצפו במהלך המילוי: אם יחס ההחזר קרוב לגבול, אם המימון קרוב לתקרה,
                    ואיזה בנק לכלול בהגשה.
                  </p>
                </motion.div>
              </div>
            </div>
          </>
        )}
      </div>

      <CriticalNote />
    </SlideCard>
  );
}

function CriticalNote() {
  return (
    <p className="mx-auto mt-5 flex max-w-3xl items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-info font-bold leading-relaxed text-slate-800">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      השלב הזה קריטי למזעור הסיכוי לסירוב או לעיכוב בתהליך, ולוודא שכל המסמכים שיוגשו יהיו
      תקינים ומלאים — ולהבנה מלאה של איך ייראה המצב הכלכלי של משק הבית שלכם אחרי לקיחת
      המשכנתא.
    </p>
  );
}
