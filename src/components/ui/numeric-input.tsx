'use client';

import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { formatNumberInput, parseDecimalInput, sanitizeDecimalInput } from '@/lib/currency';

type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | null;
  onChange: (value: number | null) => void;
  /** בלי נקודה עשרונית — סכומים בשקלים */
  integer?: boolean;
  max?: number;
};

/**
 * שדה מספר שעובד בעמוד RTL: הכיוון LTR כדי שהספרות לא יתהפכו, ובזמן מיקוד
 * מוצג מה שהמשתמש מקליד (כולל "4.") במקום הערך המפורמט שבלע את הנקודה.
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
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const display = focused
    ? draft
    : value === null
      ? ''
      : integer
        ? formatNumberInput(String(Math.round(value)))
        : String(value);

  return (
    <input
      {...props}
      dir="ltr"
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      className={cn('text-right', className)}
      value={display}
      onFocus={(event) => {
        setDraft(value === null ? '' : integer ? String(Math.round(value)) : String(value));
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onChange={(event) => {
        const next = integer
          ? event.target.value.replace(/[^\d]/g, '')
          : sanitizeDecimalInput(event.target.value);
        setDraft(next);
        const parsed = integer ? (next === '' ? null : Number(next)) : parseDecimalInput(next);
        if (parsed === null || !Number.isFinite(parsed)) {
          onChange(null);
          return;
        }
        onChange(max !== undefined ? Math.min(parsed, max) : parsed);
      }}
    />
  );
}
