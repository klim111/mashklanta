'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BalanceSlide, BALANCE_MS, MixSlide, TransparencySlide } from './SvgSlides';
import { ThreadsSlide, THREADS_MS } from './ThreadsSlide';
import { StormSlide, STORM_MS } from './StormSlide';

type Slide = {
  id: string;
  ms: number;
  render: () => ReactNode;
};

/** כותרת ושורת הסבר מתחת לבמה של מסכי החוטים והסופה, באותו סגנון כמו מסכי ה-SVG */
function StageSlide({ stage, title, text, titleClass }: { stage: ReactNode; title: string; text: string; titleClass: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center px-4" dir="rtl">
      <div className="flex min-h-0 w-full flex-1 justify-center">{stage}</div>
      <p className={`mt-3 text-center text-2xl font-black md:text-3xl ${titleClass}`}>{title}</p>
      <p className="mt-1 text-center text-base text-slate-600 md:text-lg">{text}</p>
    </div>
  );
}

// הסדר: מאזניים (הארוך מכולם), חוטים, סופה, שקיפות, תמהיל
const SLIDES: Slide[] = [
  { id: 'balance', ms: BALANCE_MS, render: () => <BalanceSlide /> },
  {
    id: 'threads',
    ms: THREADS_MS + 500,
    render: () => (
      <StageSlide
        stage={<ThreadsSlide />}
        title="ניווט לאורך כל השלבים"
        text="משכלנתא פורמת את הסבך לחמישה שלבים ברורים, ואתם תמיד יודעים מה הצעד הבא."
        titleClass="text-emerald-600"
      />
    ),
  },
  {
    id: 'storm',
    ms: STORM_MS + 500,
    render: () => (
      <StageSlide
        stage={<StormSlide />}
        title="כל המשכנתא במקום אחד"
        text="חוזה, שמאות, בנקים, ביטוחים ולוחות סילוקין. משכלנתא מסדרת את הכול בשבילכם."
        titleClass="text-blue-600"
      />
    ),
  },
  { id: 'transparency', ms: 6000, render: () => <TransparencySlide /> },
  { id: 'mix', ms: 6000, render: () => <MixSlide /> },
];

/**
 * קרוסלת הראש של דף הבית. כל מסך מורכב מחדש כשהוא מוצג, כך שהאנימציה שלו מתחילה
 * מההתחלה, ולכל מסך משך משלו. כשהלשונית מוסתרת הקרוסלה ממתינה במקום.
 */
export function HeroCarousel({ className = '' }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === 'visible');
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDES[index].ms);
    return () => window.clearTimeout(timer);
  }, [index, visible]);

  const slide = SLIDES[index];

  return (
    <div aria-hidden="true" className={`hero-carousel ${className}`}>
      <AnimatePresence>
        <motion.div
          key={slide.id}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
        >
          {slide.render()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
