'use client';

import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { formatNumberInput, parseFormattedNumberInput } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

type FormattedNumberInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'onChange' | 'value'> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function FormattedNumberInput({ value, onValueChange, className, ...props }: FormattedNumberInputProps) {
  return (
    <Input
      {...props}
      dir="ltr"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={cn('text-right', className)}
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
export function FormattedNumberValueInput({
  value,
  onValueChange,
  className,
  max,
  ...props
}: FormattedNumberValueInputProps) {
  const numeric =
    value === undefined || value === null || value === ''
      ? null
      : typeof value === 'number'
        ? value
        : parseFormattedNumberInput(value);
  const numericMax = typeof max === 'number' ? max : undefined;

  return (
    <NumericInput
      {...props}
      integer
      max={numericMax}
      value={numeric}
      onChange={(next) => onValueChange(next ?? 0)}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    />
  );
}
