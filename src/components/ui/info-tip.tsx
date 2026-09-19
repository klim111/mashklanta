'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';

/**
 * סימן מידע קטן שמציג הסבר צף קצר — במעבר עכבר, במיקוד מקלדת או בלחיצה
 * (במסך מגע אין ריחוף). ההסבר נסגר בלחיצה מחוץ לו או ב-Escape.
 *
 * הרכיב מכוון להיות מוטמע בתוך תוויות צפופות, ולכן הוא span ולא div —
 * מותר לו לשבת בתוך פסקה או כותרת.
 */
export function InfoTip({
  text,
  label = 'הסבר',
  className = '',
  align = 'center',
}: {
  text: React.ReactNode;
  /** תיאור נגיש לכפתור */
  label?: string;
  className?: string;
  /** לאן הבועה נפתחת יחסית לאייקון */
  align?: 'center' | 'start' | 'end';
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setPinned(false);
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinned(false);
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  const position =
    align === 'start'
      ? 'right-0'
      : align === 'end'
        ? 'left-0'
        : 'left-1/2 -translate-x-1/2';

  return (
    <span
      ref={rootRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          const next = !pinned;
          setPinned(next);
          setOpen(next);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!pinned) setOpen(false);
        }}
        className="inline-flex items-center rounded-full text-slate-400 transition-colors hover:text-blue-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
      >
        <Info className="h-3 w-3" aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          dir="rtl"
          onClick={(event) => event.stopPropagation()}
          className={`absolute top-full z-40 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 text-right text-[11px] font-normal leading-relaxed text-slate-700 shadow-lg ${position}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}

/** הסברים לשני מדדי הריבית — משותפים לשורת התמהיל ולשורת המסלול */
export const RATE_EXPLANATIONS = {
  mixAverage:
    'הריבית הנקובה של התמהיל: ממוצע הריביות של המסלולים, משוקלל לפי הסכום בכל מסלול. לא מביאה בחשבון הצמדה למדד, עיתוי התשלומים או פרעונות.',
  mixIrr:
    'העלות האפקטיבית האמיתית של הכסף: הריבית השנתית שבה כל התשלומים הצפויים — כולל הצמדה למדד, פרעונות מוקדמים ותשלומי בלון — שווים בדיוק לקרן שקיבלתם. זו הריבית שמאפשרת להשוות תמהילים שונים על בסיס אחד.',
  trackAverage:
    'ממוצע הריבית לאורך חיי המסלול, משוקלל לפי היתרה בכל חודש. במסלול קבוע זו הריבית הנקובה; במסלול פריים או משתנה היא משקפת את תחזית הריבית לאורך התקופה.',
  trackIrr:
    'הריבית המתואמת של המסלול: הריבית השנתית האפקטיבית שבה כל תשלומי המסלול — כולל הצמדה ופרעונות — שווים לסכום שנלקח בו. גבוהה מהנקובה בגלל ריבית דריבית חודשית והצמדה.',
} as const;
