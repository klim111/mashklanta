'use client';

import { Input } from '@/components/ui/input';
import { formatNumberInput, parseFormattedNumberInput } from '@/lib/currency';
import type { ComponentProps } from 'react';

type FormattedNumberInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'onChange' | 'value'> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function FormattedNumberInput({ value, onValueChange, ...props }: FormattedNumberInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onValueChange(formatNumberInput(e.target.value))}
    />
  );
}

type FormattedNumberValueInputProps = Omit<FormattedNumberInputProps, 'value' | 'onValueChange'> & {
  value: number | string | undefined | null;
  onValueChange: (value: number) => void;
};

/** קלט מעוצב כשה-state נשמר כמספר */
export function FormattedNumberValueInput({ value, onValueChange, ...props }: FormattedNumberValueInputProps) {
  const displayValue =
    value === undefined || value === null || value === ''
      ? ''
      : formatNumberInput(String(value));

  return (
    <FormattedNumberInput
      {...props}
      value={displayValue}
      onValueChange={(v) => onValueChange(parseFormattedNumberInput(v))}
    />
  );
}
