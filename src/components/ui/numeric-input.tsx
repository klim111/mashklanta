'use client';

import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { formatNumberInput, parseDecimalInput, sanitizeDecimalInput } from '@/lib/currency';

type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'max'> & {
  value: number | null;
  onChange: (value: number | null) => void;
  /** בלי נקודה עשרונית — סכומים בשקלים */
  integer?: boolean;
  max?: number;
};

/** כמה ספרות יש עד מיקום הסמן — כדי להחזיר אותו למקומו אחרי הוספת פסיקים */
function digitsBefore(text: string, caret: number): number {
  return text.slice(0, caret).replace(/\D/g, '').length;
}

function caretAfterDigits(text: string, digits: number): number {
  if (digits <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (/\d/.test(text[i])) seen += 1;
    if (seen === digits) return i + 1;
  }
  return text.length;
}

/**
 * שדה מספר שעובד בעמוד RTL: הכיוון LTR כדי שהספרות לא יתהפכו, ובזמן מיקוד
 * מוצג מה שהמשתמש מקליד (כולל "4.") במקום הערך המפורמט שבלע את הנקודה.
 *
 * בסכומים שלמים (integer) הפסיקים מופיעים כבר תוך כדי ההקלדה, והסמן נשמר
 * במקומו. במצב עשרוני אין קיבוץ אלפים בכוונה: שם הפסיק הוא המפריד העשרוני
 * (ראה sanitizeDecimalInput), ולכן "1,234" היה נקרא כ-1.234.
 */
export function NumericInput({
  value,
  onChange,
  integer = false,
  max,
  className,
  onFocus,
  onBlur,
  ...props
}: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const display = focused
    ? draft
    : value === null
      ? ''
      : integer
        ? formatNumberInput(String(Math.round(value)))
        : String(value);

  // הסמן מוחזר אחרי הרינדור, כי הפסיקים מזיזים את התווים שאחריו
  useEffect(() => {
    if (pendingCaret.current === null || !inputRef.current) return;
    const pos = pendingCaret.current;
    pendingCaret.current = null;
    try {
      inputRef.current.setSelectionRange(pos, pos);
    } catch {
      /* דפדפנים שאינם תומכים בבחירה בשדה הזה */
    }
  });

  return (
    <input
      {...props}
      ref={inputRef}
      dir="ltr"
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      className={cn('text-right', className)}
      value={display}
      onFocus={(event) => {
        setDraft(
          value === null ? '' : integer ? formatNumberInput(String(Math.round(value))) : String(value)
        );
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onChange={(event) => {
        const raw = event.target.value;

        if (integer) {
          const caret = event.target.selectionStart ?? raw.length;
          const typedDigits = digitsBefore(raw, caret);
          const digits = raw.replace(/\D/g, '');
          const formatted = formatNumberInput(digits);

          setDraft(formatted);
          pendingCaret.current = caretAfterDigits(formatted, typedDigits);

          const parsed = digits === '' ? null : Number(digits);
          if (parsed === null || !Number.isFinite(parsed)) {
            onChange(null);
            return;
          }
          onChange(max !== undefined ? Math.min(parsed, max) : parsed);
          return;
        }

        const next = sanitizeDecimalInput(raw);
        setDraft(next);
        const parsed = parseDecimalInput(next);
        if (parsed === null || !Number.isFinite(parsed)) {
          onChange(null);
          return;
        }
        onChange(max !== undefined ? Math.min(parsed, max) : parsed);
      }}
    />
  );
}
