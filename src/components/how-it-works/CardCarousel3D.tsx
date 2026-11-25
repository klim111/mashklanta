'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CarouselCardData {
  id: string;
  title: string;
  shortTitle?: string;
  subtitle?: string;
  description?: string;
  body?: string;
  advantages?: string[];
  risks?: string[];
  highlights?: string[];
  icon: LucideIcon;
  gradient: string;
  tag?: string;
}

interface CardCarouselProps {
  cards: CarouselCardData[];
  variant?: 'track' | 'simple';
  className?: string;
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
}

const SWIPE_THRESHOLD = 60;

/**
 * כרטיסיות ההסבר של מרכז הלמידה.
 *
 * כרטיס אחד על המסך, ותו לא: הקודם והבא אינם מציצים מהצדדים ואינם עולים על
 * הטקסט שמסביב. המעבר נחתך בתוך במה סגורה (`overflow-hidden`), והכרטיס היוצא
 * מסיים לצאת לפני שהנכנס מתחיל — כך המעבר נקי, ובכל רגע נתון ברור מה מוצג.
 *
 * הכיוון הוא כיוון הקריאה: «הבא» מביא את הכרטיס משמאל, כמו דף שמתהפך בעברית,
 * ואותה תנועה בדיוק מתקבלת גם בגרירה. מי שביקש פחות תנועה (`prefers-reduced-motion`)
 * מקבל החלפה בהעלמה בלבד.
 */
export default function CardCarousel3D({
  cards,
  variant = 'simple',
  className,
  activeIndex: controlledIndex,
  onActiveChange,
}: CardCarouselProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = controlledIndex ?? internalIndex;
  const prevIndexRef = useRef(activeIndex);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (prevIndexRef.current === activeIndex) return;
    setDirection(activeIndex > prevIndexRef.current ? 1 : -1);
    prevIndexRef.current = activeIndex;
  }, [activeIndex]);

  const goTo = useCallback(
    (index: number, dir: number) => {
      const next = ((index % cards.length) + cards.length) % cards.length;
      if (next === activeIndex) return;
      setDirection(dir);
      if (controlledIndex === undefined) setInternalIndex(next);
      onActiveChange?.(next);
    },
    [activeIndex, cards.length, controlledIndex, onActiveChange]
  );

  const next = useCallback(() => goTo(activeIndex + 1, 1), [activeIndex, goTo]);
  const prev = useCallback(() => goTo(activeIndex - 1, -1), [activeIndex, goTo]);

  /* גרירה ימינה מביאה את הכרטיס הבא — אותה תנועה כמו האנימציה עצמה */
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) next();
    else if (info.offset.x < -SWIPE_THRESHOLD) prev();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        !containerRef.current?.contains(document.activeElement) &&
        document.activeElement?.tagName !== 'BODY'
      )
        return;
      if (event.key === 'ArrowLeft') next();
      if (event.key === 'ArrowRight') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const card = cards[activeIndex];
  const previousCard = cards[(activeIndex - 1 + cards.length) % cards.length];
  const nextCard = cards[(activeIndex + 1) % cards.length];

  /* בעברית הכרטיס הבא נכנס משמאל והיוצא עוזב ימינה */
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  };
  const fade = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)} tabIndex={0}>
      {/* מונה והתקדמות — מה מוצג עכשיו מתוך כמה */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-sm font-black text-slate-500">
          {activeIndex + 1} מתוך {cards.length}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className={cn('h-full rounded-full bg-gradient-to-l', card.gradient)}
            initial={false}
            animate={{ width: `${((activeIndex + 1) / cards.length) * 100}%` }}
            transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/*
        הבמה חתוכה: כרטיס באמצע מעבר אינו יכול להיראות מחוצה לה, ולכן שום דבר
        אינו מציץ מהצדדים ואינו עולה על הכיתובים שסביב.

        הגובה נקבע לפי הכרטיס הארוך ביותר במקטע — עותקים נסתרים של כולם יושבים
        באותו תא — כך אין קפיצה במעבר בין כרטיסים, וגם אין חלל ריק במקטע שכל
        כרטיסיו קצרים.
      */}
      <div className="relative">
        <div aria-hidden className="invisible grid">
          {cards.map((item) => (
            <div key={item.id} className="col-start-1 row-start-1">
              <CardFace card={item} variant={variant} />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 overflow-hidden rounded-[28px]">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.article
            key={card.id}
            custom={direction}
            variants={reduceMotion ? fade : variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: reduceMotion ? 0.18 : 0.32, ease: 'easeInOut' }}
            drag={reduceMotion ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <CardFace card={card} variant={variant} />
          </motion.article>
        </AnimatePresence>
        </div>
      </div>

      {/*
        הניווט: מה הקודם ומה הבא — בשם ולא בהצצה חזותית. כך ברור לאן ממשיכים
        בלי שכרטיס חלקי ישב מעל הטקסט.
      */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <NavButton
          side="prev"
          label={previousCard.shortTitle ?? previousCard.title}
          onClick={prev}
          disabled={cards.length < 2}
        />

        <div className="flex items-center gap-2">
          {cards.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(index, index > activeIndex ? 1 : -1)}
              aria-label={`מעבר ל${item.shortTitle ?? item.title}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              className={cn(
                'h-2.5 rounded-full transition-all duration-300',
                index === activeIndex ? 'w-8 bg-slate-900' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              )}
            />
          ))}
        </div>

        <NavButton
          side="next"
          label={nextCard.shortTitle ?? nextCard.title}
          onClick={next}
          disabled={cards.length < 2}
        />
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        אפשר לגרור את הכרטיסייה, ללחוץ על החצים או להשתמש במקשי החיצים
      </p>
    </div>
  );
}

/** חץ ניווט אחד, עם שם הכרטיסייה שאליה הוא מוביל */
function NavButton({
  side,
  label,
  onClick,
  disabled,
}: {
  side: 'prev' | 'next';
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = side === 'prev' ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'prev' ? 'כרטיסייה קודמת' : 'כרטיסייה הבאה'}
      className={cn(
        'group flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-right shadow-sm transition-all',
        'hover:border-slate-900 hover:shadow-md disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:shadow-sm',
        side === 'prev' ? 'flex-row' : 'flex-row-reverse'
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-slate-700" />
      <span className="hidden min-w-0 sm:block">
        <span className="block text-2xs font-bold text-slate-400">
          {side === 'prev' ? 'הקודם' : 'הבא'}
        </span>
        <span className="block max-w-[9rem] truncate text-sm font-black text-slate-800">{label}</span>
      </span>
    </button>
  );
}


/**
 * פני הכרטיס.
 *
 * אותו רכיב משמש גם את הכרטיס המונפש וגם את העותקים הנסתרים שקובעים את גובה
 * הבמה, כדי ששניהם יהיו זהים לחלוטין.
 */
function CardFace({ card, variant }: { card: CarouselCardData; variant: 'track' | 'simple' }) {
  const Icon = card.icon;
  const text = card.description ?? card.body ?? '';

  return (
    <div
      className={cn(
        'h-full rounded-[28px] bg-gradient-to-br p-[3px] shadow-[0_28px_70px_rgba(15,23,42,0.22)]',
        card.gradient
      )}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[25px] bg-white">
                <header
                  className={cn(
                    'relative shrink-0 overflow-hidden bg-gradient-to-l px-5 py-5 text-white sm:px-8 sm:py-6',
                    card.gradient
                  )}
                >
                  <div className="absolute inset-0 bg-slate-950/30" />
                  <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -right-6 h-36 w-36 rounded-full bg-white/5" />
                  <div className="relative flex items-start gap-4">
                    <span className="shrink-0 rounded-2xl bg-white/20 p-3.5 backdrop-blur">
                      <Icon className="h-8 w-8 text-white drop-shadow" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {card.tag && (
                        <span className="mb-1.5 inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-semibold text-white">
                          {card.tag}
                        </span>
                      )}
                      <h3 className="text-subtitle font-black leading-tight text-white drop-shadow-sm">
                        {card.title}
                      </h3>
                      {card.subtitle && (
                        <p className="mt-1 text-base font-medium text-white/95">{card.subtitle}</p>
                      )}
                    </div>
                  </div>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-5 text-right sm:space-y-5 sm:px-8 sm:py-6">
                  <p className="text-base font-medium leading-relaxed text-slate-800 md:text-lg">{text}</p>

                  {variant === 'track' && card.advantages && card.advantages.length > 0 && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="mb-2 flex items-center gap-2 font-bold text-emerald-800">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>יתרונות</span>
                      </div>
                      <ul className="space-y-2">
                        {card.advantages.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-base text-slate-700">
                            <span className="mt-1.5 shrink-0 text-emerald-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {variant === 'track' && card.risks && card.risks.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="mb-2 flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>סיכונים</span>
                      </div>
                      <ul className="space-y-2">
                        {card.risks.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-base text-slate-700">
                            <span className="mt-1.5 shrink-0 text-amber-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {variant === 'simple' && card.highlights && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {card.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className="rounded-full bg-slate-200 px-3.5 py-1.5 text-sm font-semibold text-slate-800"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
  );
}
