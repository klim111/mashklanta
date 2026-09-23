'use client';

import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  FileSignature,
  FileStack,
  FolderCheck,
  Gavel,
  Layers,
  Loader2,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Video,
  Wrench,
} from 'lucide-react';

/** אחרי 40 שניות המסך עובר הלאה מעצמו — מי שקורא מהר לוחץ "המשך" */
const AUTO_ADVANCE_MS = 40_000;

const SLIDES = ['intro', 'process', 'output', 'all'] as const;
type Slide = (typeof SLIDES)[number];

const reveal = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.4 },
};

/**
 * מסך הפתיחה של שלב החתימה, באותו מבנה שבו נפתח הפרופיל הפיננסי.
 *
 * ההסבר בא ברצף של שלושה מסכים מלאים — מה השלב, איך הוא עובד ומה יוצא ממנו —
 * שכל אחד מהם עובר הלאה בלחיצה על "המשך" או מעצמו אחרי 40 שניות, ובסוף
 * שלושתם נאספים למסך אחד עם שתי הדרכים לעבור את השלב: לבד, או בליווי יועץ
 * שמחירו כולל פגישה מקוונת אחת עם הבנקאי.
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
  const [slide, setSlide] = useState<Slide>('intro');
  /** מסך ההסבר על הליווי, שנפתח מהכפתור "תנו ליועץ" */
  const [advisorIntent, setAdvisorIntent] = useState(false);

  const next = () => {
    const index = SLIDES.indexOf(slide);
    if (index < SLIDES.length - 1) setSlide(SLIDES[index + 1]);
  };

  useEffect(() => {
    if (slide === 'all' || advisorIntent) return;
    const timer = setTimeout(next, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, advisorIntent]);

  if (advisorIntent && onAdvisor) {
    return (
      <AdvisorIntro
        busy={advisorBusy}
        onConfirm={onAdvisor}
        onBack={() => setAdvisorIntent(false)}
      />
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {slide === 'intro' && (
        <motion.section key="intro" {...reveal}>
          <IntroSlide />
          <SlideFooter slide={slide} onNext={next} />
        </motion.section>
      )}

      {slide === 'process' && (
        <motion.section key="process" {...reveal}>
          <ProcessSlide />
          <SlideFooter slide={slide} onNext={next} />
        </motion.section>
      )}

      {slide === 'output' && (
        <motion.section key="output" {...reveal}>
          <OutputSlide />
          <SlideFooter slide={slide} onNext={next} />
        </motion.section>
      )}

      {slide === 'all' && (
        <motion.section key="all" {...reveal} className="space-y-4">
          <IntroSlide compact />
          <ProcessSlide compact />
          <OutputSlide compact />

          {/* שורת הבחירה — נכנסת אחרונה, ונעה פעם אחת כדי למשוך אליה את העין */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, x: [0, -16, 0] }}
            transition={{
              opacity: { duration: 0.45, delay: 0.25 },
              y: { duration: 0.45, delay: 0.25 },
              x: { delay: 1.1, duration: 0.85, times: [0, 0.5, 1], ease: 'easeInOut' },
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            <button
              type="button"
              onClick={onStart}
              className="flex flex-col items-center gap-2 rounded-3xl border-2 border-blue-300 bg-blue-50 p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg">
                <Wrench className="h-7 w-7 text-white" />
              </span>
              <span className="text-lg font-black text-slate-900">
                בצעו את השלב לבד באמצעות משכלנתא
              </span>
              <span className="text-info font-medium leading-snug text-slate-600">
                בוחרים את תרחיש הרכישה, מקבלים את רשימת המסמכים של הבנק ומאמתים מולה את ההצעה
                הסופית
              </span>
              <span className="mt-1 inline-flex items-center gap-1.5 text-info font-black text-blue-700">
                בואו נתחיל
                <ArrowLeft className="h-4 w-4" />
              </span>
            </button>

            {onAdvisor && (
              <button
                type="button"
                onClick={() => setAdvisorIntent(true)}
                className="flex flex-col items-center gap-2 rounded-3xl border-2 border-violet-300 bg-violet-50 p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg">
                  <Sparkles className="h-7 w-7 text-white" />
                </span>
                <span className="text-lg font-black text-slate-900">
                  תנו ליועץ משכלנתא לעשות לכם את העבודה
                </span>
                <span className="text-info font-medium leading-snug text-slate-600">
                  ליווי עד החתימה והעברת הכסף, כולל פגישה מקוונת אחת עם הבנקאי — בקשה חינמית,
                  התשלום בהמשך
                </span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-info font-black text-violet-700">
                  איך זה עובד?
                  <ArrowLeft className="h-4 w-4" />
                </span>
              </button>
            )}
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** ניווט בין מסכי ההסבר: נקודות התקדמות וכפתור "המשך" */
function SlideFooter({ slide, onNext }: { slide: Slide; onNext: () => void }) {
  return (
    <div className="mt-5 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {SLIDES.slice(0, 3).map((item) => (
          <span
            key={item}
            className={`h-2.5 rounded-full transition-all ${
              item === slide ? 'w-8 bg-rose-600' : 'w-2.5 bg-slate-300'
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
      <p className="text-sm text-slate-400">המסך יתקדם מעצמו בעוד רגע</p>
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

/** מסך 1 — מה השלב הזה, ולמה הוא קריטי */
function IntroSlide({ compact = false }: { compact?: boolean }) {
  const points = [
    {
      icon: <FolderCheck className="h-5 w-5" />,
      text: 'מתכוננים נכון: כל המסמכים שהבנק ידרוש במסגרת החתימה על תיק המשכנתא, לפי העסקה שלכם',
    },
    {
      icon: <ScanSearch className="h-5 w-5" />,
      text: 'מוודאים שהתמהיל ותנאיו שמופיעים באישור הסופי של הבנק תואמים לתמהיל שנבנה ותומחר',
    },
    {
      icon: <AlertTriangle className="h-5 w-5" />,
      text: 'מסמך חסר דוחה את מועד החתימה ואת העברת הכסף — ולכן הרשימה נבנית מראש, לא ביום החתימה',
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      text: 'אחרי החתימה אין דרך חזרה: כל פער בין מה שסוכם למה שנחתם מתגלה כאן, בעוד אפשר לתקן',
    },
  ];

  return (
    <SlideCard
      tone="border-rose-200"
      badge={<Badge icon={<FileSignature className="h-4 w-4" />} text="שלב 5 מתוך 5" tone="bg-rose-600" />}
      title="חתימה על תיק המשכנתא בבנק"
      lead={
        <p className="mx-auto mt-3 max-w-3xl rounded-2xl bg-rose-50 px-5 py-4 text-lg font-black leading-relaxed text-slate-800 md:text-xl">
          מהות השלב היא להתכונן נכון עם כל המסמכים שהבנק ידרוש במסגרת החתימה על תיק המשכנתא,
          ולוודא שהתמהיל ותנאיו שמופיעים באישור הסופי של המשכנתא תואמים לזה שנבנה ותומחר.
        </p>
      }
    >
      <ul className={`mx-auto grid max-w-3xl gap-3 ${compact ? 'md:grid-cols-2' : ''}`}>
        {points.map((point) => (
          <li
            key={point.text}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
              {point.icon}
            </span>
            <span className="text-info font-semibold leading-relaxed text-slate-700">{point.text}</span>
          </li>
        ))}
      </ul>
    </SlideCard>
  );
}

/** מסך 2 — שלושת החלקים של השלב */
function ProcessSlide({ compact = false }: { compact?: boolean }) {
  const steps = [
    {
      icon: <FileStack className="h-7 w-7 text-white" />,
      gradient: 'from-rose-600 to-pink-600',
      title: 'בוחרים את תרחיש הרכישה',
      body: 'דירה יד 1 מקבלן, דירה יד 2, מגרש לבנייה, בנייה עצמית או הלוואה לכל מטרה — ובתוכו את אופן רישום הזכויות בנכס. זה מה שקובע מה הבנק ידרוש.',
    },
    {
      icon: <FolderCheck className="h-7 w-7 text-white" />,
      gradient: 'from-amber-600 to-orange-600',
      title: 'אוספים את המסמכים של אותו תרחיש',
      body: 'רשימה מדויקת עם הדגשים לכל מסמך — מה צריך להופיע בו ומאיפה מוציאים אותו — ומעקב אחרי מה שכבר נאסף ומה עוד חסר.',
    },
    {
      icon: <ScanSearch className="h-7 w-7 text-white" />,
      gradient: 'from-violet-600 to-purple-600',
      title: 'מאמתים את ההצעה הסופית של הבנק',
      body: 'התמהיל המתומחר מהמכרז מוצג מסלול מול מסלול, ומולו בודקים את אישור המשכנתא הסופי: סכום, ריבית, תקופה, הצמדה ולוח סילוקין.',
    },
  ];

  return (
    <SlideCard
      tone="border-slate-200"
      badge={<Badge icon={<Layers className="h-4 w-4" />} text="איך השלב עובד" tone="bg-slate-900" />}
      title="שלושה חלקים, בסדר הזה"
      lead={
        !compact ? (
          <p className="mx-auto mt-3 max-w-2xl text-info font-medium leading-relaxed text-slate-600">
            הראשון קובע מה נדרש, השני אוסף אותו, והשלישי מוודא שמה שנחתם הוא מה שסוכם.
          </p>
        ) : undefined
      }
    >
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col items-center gap-3 rounded-3xl border-2 border-slate-200 bg-slate-50 p-5 text-center"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} shadow-lg`}
            >
              {step.icon}
            </span>
            <span className="rounded-full bg-white px-3 py-0.5 text-sm font-black text-slate-500 ring-1 ring-slate-200">
              חלק {index + 1}
            </span>
            <h4 className="text-lg font-black leading-snug text-slate-900">{step.title}</h4>
            <p className="text-info font-medium leading-relaxed text-slate-600">{step.body}</p>
          </li>
        ))}
      </ol>
    </SlideCard>
  );
}

/** מסך 3 — מה יוצא מהשלב */
function OutputSlide({ compact = false }: { compact?: boolean }) {
  const items = [
    {
      icon: <FolderCheck className="h-5 w-5" />,
      title: 'רשימת המסמכים של הבנק, לפי התרחיש שלכם',
      body: 'כל מסמך ודרישה שהבנק יבקש בעסקה הזו בדיוק, עם הדגשים ומעקב אחרי מה שכבר נאסף.',
    },
    {
      icon: <Gavel className="h-5 w-5" />,
      title: 'התמהיל המתואם עם התמחור הסופי',
      body: 'התמהיל כפי שתומחר במכרז הריביות — סכום, ריבית ותקופה בכל מסלול, ומולו משווים את הצעת הבנק.',
    },
    {
      icon: <Banknote className="h-5 w-5" />,
      title: 'השוואת התנאים שנחתמו בפועל',
      body: 'ההחזר החודשי והריבית שבחוזה מול מה שסוכם במכרז, עם התרעה על כל פער שאינו עיגול.',
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: 'צ׳ק־ליסט החתימה',
      body: 'מה לבדוק מול המסמך עצמו לפני שחותמים — ריביות, מסלולים, לוח סילוקין, עמלות וביטוחים.',
    },
  ];

  return (
    <SlideCard
      tone="border-emerald-300"
      badge={<Badge icon={<BadgeCheck className="h-4 w-4" />} text="התוצר של השלב" tone="bg-emerald-600" />}
      title="תיק חתימה מוכן, בלי הפתעות"
      lead={
        !compact ? (
          <p className="mx-auto mt-3 max-w-2xl text-info font-medium leading-relaxed text-slate-600">
            מגיעים לבנק עם כל מה שנדרש ביד, ועם המספרים שמולם בודקים כל שורה בהצעה הסופית.
          </p>
        ) : undefined
      }
    >
      <ul className="mx-auto grid max-w-4xl gap-3 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.title} className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-info font-black text-slate-900">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                {item.icon}
              </span>
              {item.title}
            </p>
            <p className="mt-2 text-info font-medium leading-relaxed text-slate-600">{item.body}</p>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-5 flex max-w-3xl items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-info font-bold leading-relaxed text-slate-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        בין ההצעה שזכתה במכרז לבין המסמך שאתם חותמים עליו יכולים להשתנות פרטים. כאן מוודאים
        שהתנאים שסוכמו הם בדיוק התנאים שנחתמו — לפני החתימה, לא אחריה.
      </p>
    </SlideCard>
  );
}

/**
 * מה קורה כשיועץ מבצע את השלב.
 *
 * הלקוח מבקש ליווי לפני שהוא יודע מה הוא מקבל, ולכן ההסבר בא לפני הבקשה:
 * היועץ מוודא את כל הפרטים ומלווה עד החתימה והעברת הכסף, והמחיר כולל פגישה
 * מקוונת אחת עם הבנקאי.
 */
function AdvisorIntro({
  busy,
  onConfirm,
  onBack,
}: {
  busy: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const points = [
    {
      icon: <FolderCheck className="h-5 w-5" />,
      title: 'בדיקת התיק מול הבנק',
      body: 'היועץ יוודא שכל המסמכים והדרישות של התרחיש שלכם נמצאים בתיק, לפני שנקבע מועד החתימה.',
    },
    {
      icon: <Video className="h-5 w-5" />,
      title: 'פגישה מקוונת עם הבנקאי',
      body: 'מחיר השלב כולל פגישה מקוונת אחת עם הבנקאי, שבה היועץ נוכח איתכם ומברר כל סעיף שנשאר פתוח.',
    },
    {
      icon: <ScanSearch className="h-5 w-5" />,
      title: 'אימות התנאים שנחתמים',
      body: 'היועץ יעבור על הצעת המשכנתא הסופית מסלול מול מסלול, מול מה שסוכם במכרז הריביות.',
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: 'ליווי עד העברת הכסף',
      body: 'בכל סוגיה ושאלה שתעלה — עד לחתימה הסופית על המשכנתא ועד שהכסף עובר בפועל.',
    },
  ];

  return (
    <motion.section {...reveal} className="rounded-3xl border-2 border-violet-300 bg-white p-6 shadow-sm md:p-8">
      <header className="mb-6 text-center">
        <Badge icon={<Sparkles className="h-4 w-4" />} text="ליווי יועץ משכלנתא" tone="bg-violet-600" />
        <h3 className="mt-3 text-subtitle font-black text-slate-900">
          איך היועץ מטפל בשלב הזה
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-info font-medium leading-relaxed text-slate-600">
          זו בקשה חינמית. היועץ יחזור אליכם לתיאום, והתשלום מסודר מולו בהמשך — רק אם תחליטו
          להמשיך.
        </p>
      </header>

      <ul className="mx-auto grid max-w-4xl gap-3 md:grid-cols-2">
        {points.map((point) => (
          <li key={point.title} className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-4">
            <p className="flex items-center gap-2 text-info font-black text-slate-900">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                {point.icon}
              </span>
              {point.title}
            </p>
            <p className="mt-2 text-info font-medium leading-relaxed text-slate-600">{point.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-8 py-3.5 text-cta font-black text-white shadow-lg shadow-violet-600/25 transition-transform hover:-translate-y-0.5 hover:bg-violet-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          העבירו פנייה ליועץ
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3.5 text-cta font-black text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה
        </button>
      </div>
    </motion.section>
  );
}
