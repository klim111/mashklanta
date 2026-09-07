'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatNumberWithCommas, parseNumber, stripGrouping } from '@/lib/principal-approval/format';
import { inputClass } from './FieldShell';

interface NumericInputProps {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  suffix?: string;
  readOnly?: boolean;
  error?: string;
  /** money/number keep decimals, integer does not */
  integer?: boolean;
  maxDecimals?: number;
}

/** Digits (and a decimal point) before the caret — used to restore it after reformatting. */
function significantBefore(text: string, caret: number): number {
  return stripGrouping(text.slice(0, caret)).length;
}

function caretForSignificant(text: string, significant: number): number {
  if (significant <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== ',') seen += 1;
    if (seen === significant) return i + 1;
  }
  return text.length;
}

/**
 * A number field that inserts thousands separators while the user types and
 * keeps the caret where they left it.
 */
export function NumericInput({
  id,
  value,
  onChange,
  placeholder,
  suffix,
  readOnly,
  error,
  integer,
  maxDecimals,
}: NumericInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState(() =>
    value === null || value === undefined ? '' : formatNumberWithCommas(String(value)),
  );
  const pendingCaret = useRef<number | null>(null);
  const displayRef = useRef(display);
  displayRef.current = display;

  // Keep the box in sync with values changed elsewhere (pre-fill, conflict resolution).
  useEffect(() => {
    if (focused) return;
    setDisplay(value === null || value === undefined ? '' : formatNumberWithCommas(String(value)));
  }, [value, focused]);

  useEffect(() => {
    if (pendingCaret.current !== null && ref.current) {
      const pos = pendingCaret.current;
      pendingCaret.current = null;
      requestAnimationFrame(() => {
        try {
          ref.current?.setSelectionRange(pos, pos);
        } catch {
          /* input types without selection support */
        }
      });
    }
  });

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      const caret = event.target.selectionStart ?? raw.length;
      const significant = significantBefore(raw, caret);

      const decimals = integer ? 0 : (maxDecimals ?? 2);
      const cleaned = integer ? raw.replace(/\./g, '') : raw;

      // Reject a keystroke that would make the field non-numeric instead of
      // showing garbage: the previous display simply stays put.
      if (cleaned !== '' && !/^-?\d*\.?\d*$/.test(stripGrouping(cleaned))) {
        // Restore the DOM value directly: React will not re-render for an
        // unchanged state value, so the rejected character would otherwise stay.
        if (ref.current) {
          ref.current.value = displayRef.current;
          const restored = Math.max(caret - 1, 0);
          ref.current.setSelectionRange(restored, restored);
        }
        return;
      }

      const formatted = formatNumberWithCommas(cleaned, decimals);

      setDisplay(formatted);
      pendingCaret.current = caretForSignificant(formatted, significant);
      onChange(parseNumber(formatted));
    },
    [integer, maxDecimals, onChange],
  );

  return (
    <div className="relative">
      <input
        id={id}
        ref={ref}
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        dir="ltr"
        className={`${inputClass({ error, readOnly })} text-right ${suffix ? 'pl-10' : ''}`}
        value={display}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setDisplay(value === null || value === undefined ? '' : formatNumberWithCommas(String(value)));
        }}
        onChange={handleChange}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-medium text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
}
