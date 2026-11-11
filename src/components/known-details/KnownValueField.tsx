'use client';

import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { NumericInput } from '@/components/ui/numeric-input';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-info text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

function formatAmount(value: number, unit: string): string {
  const number = Math.round(value).toLocaleString('he-IL');
  return unit === '₪' ? `₪${number}` : `${number} ${unit}`;
}

/**
 * שדה מספר לפרט שאולי כבר ידוע. כשיש ערך הוא מוצג כעובדה, עם שורת המקור
 * וכפתור «שינוי» — לא כשאלה. רק כשאין ערך, או כשהלקוח בחר לשנות, מופיע שדה הקלדה.
 */
export function KnownValueField({
  label,
  value,
  onChange,
  source,
  unit = '₪',
  placeholder,
  className,
  integer = true,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** מאיפה הערך הגיע, למשל «מהפרופיל הפיננסי בתהליך»; בלי — «הוזן קודם» */
  source?: string | null;
  unit?: string;
  placeholder?: string;
  className?: string;
  integer?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const known = value !== null && value > 0;

  if (known && !editing) {
    return (
      <div className={cn('block', className)}>
        <span dir="rtl" className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
        <div
          dir="rtl"
          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <span dir="rtl" className="text-info font-black text-slate-900">{formatAmount(value, unit)}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`שינוי ${label}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-blue-700 transition-colors hover:bg-blue-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            שינוי
          </button>
        </div>
        <span dir="rtl" className="mt-1 block text-right text-2xs font-bold text-slate-400">{source || 'הוזן קודם בפלטפורמה'}</span>
      </div>
    );
  }

  return (
    <label className={cn('block', className)}>
      <span dir="rtl" className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <div dir="rtl" className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <NumericInput
            integer={integer}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoFocus={editing}
            className={`${inputClass} pl-9 font-black`}
          />
          <span dir="rtl" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{unit}</span>
        </div>
        {editing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="סיום העריכה"
            className="rounded-lg p-2 text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </label>
  );
}
