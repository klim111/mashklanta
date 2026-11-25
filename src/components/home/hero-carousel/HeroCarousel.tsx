'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BalanceSlide, BALANCE_MS, MixSlide, TransparencySlide } from './SvgSlides';
import { StagesSlide } from './StagesSlide';

type Slide = {
  id: string;
  ms: number;
  render: () => ReactNode;
};

// הסדר: מאזניים (הארוך מכולם), שקיפות, שלבים, תמהיל. מסכי החוטים והסופה (ThreadsSlide,
// StormSlide) עברו לסרטון ההדגמה
const SLIDES: Slide[] = [
  { id: 'balance', ms: BALANCE_MS, render: () => <BalanceSlide /> },
  { id: 'transparency', ms: 4000, render: () => <TransparencySlide /> },
  { id: 'stages', ms: 4000, render: () => <StagesSlide /> },
  { id: 'mix', ms: 4000, render: () => <MixSlide /> },
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
