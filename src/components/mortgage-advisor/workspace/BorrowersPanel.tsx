'use client';

import React, { useState } from 'react';
import { ChevronDown, Plus, Trash2, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { MixBorrower } from '../engine';
import { formatPayment, formatShekel } from './primitives';

const MAX_BORROWERS = 4;

function numberOrUndefined(raw: string): number | undefined {
  const value = Number(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * פרטי הלווים בכלי של היועץ. כשהיועץ בונה תמהיל בלי תיק לקוח, הוא מזין כאן את
 * הלווים — שם, גיל והכנסה נטו — והם נשמרים עם התמהיל ומופיעים בדוח. מההכנסות
 * מחושב יחס ההחזר של התמהיל שבעבודה.
 */
export function BorrowersPanel({
  borrowers,
  locked,
  monthlyPayment,
  onChange,
}: {
  borrowers: MixBorrower[];
  locked: boolean;
  monthlyPayment: number;
  onChange: (next: MixBorrower[]) => void;
}) {
  // פתוח מההתחלה: ההכנסה נדרשת לפני שיוך ללקוח, וממנה מחושב ההחזר המקסימלי
  const [open, setOpen] = useState(true);
  const rows = borrowers.length > 0 ? borrowers : [{ name: '' }];
  const income = borrowers.reduce((sum, item) => sum + (item.monthlyIncome ?? 0), 0);
  const ratio = income > 0 ? (monthlyPayment / income) * 100 : null;
  const named = borrowers.filter((item) => item.name.trim()).map((item) => item.name.trim());

  const update = (index: number, patch: Partial<MixBorrower>) => {
    const next = rows.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-right"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Users className="h-4 w-4" />
        </span>
        <span className="text-sm font-black text-slate-900">פרטי הלווים</span>
        <span className="text-xs text-slate-500">
          {named.length > 0 ? named.join(' ו') : 'לא הוזנו — ההכנסה נדרשת לשיוך ללקוח, וממנה מחושב ההחזר המקסימלי'}
        </span>
        {ratio !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
              ratio > 40 ? 'bg-red-100 text-red-800' : ratio > 33 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            יחס החזר {ratio.toFixed(1)}%
          </span>
        )}
        <ChevronDown className={`mr-auto h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-2 border-t border-slate-100 px-4 py-3">
          {rows.map((borrower, index) => (
            <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
              <label className="block">
                <span className="mb-1 block text-2xs font-bold text-slate-600">לווה {index + 1} · שם מלא</span>
                <Input
                  value={borrower.name}
                  disabled={locked}
                  maxLength={80}
                  onChange={(event) => update(index, { name: event.target.value })}
                  className="h-9 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs font-bold text-slate-600">גיל</span>
                <Input
                  inputMode="numeric"
                  value={borrower.age ?? ''}
                  disabled={locked}
                  onChange={(event) => update(index, { age: numberOrUndefined(event.target.value) })}
                  className="h-9 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs font-bold text-slate-600">הכנסה חודשית נטו</span>
                <Input
                  inputMode="numeric"
                  value={borrower.monthlyIncome ? borrower.monthlyIncome.toLocaleString('he-IL') : ''}
                  disabled={locked}
                  onChange={(event) => update(index, { monthlyIncome: numberOrUndefined(event.target.value) })}
                  className="h-9 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={locked || rows.length === 1}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                title="הסרת הלווה"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={locked || rows.length >= MAX_BORROWERS}
              onClick={() => onChange([...rows, { name: '' }])}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              הוסף לווה
            </button>
            {income > 0 && (
              <span className="text-2xs text-slate-500">
                סך ההכנסות {formatShekel(income)} · החזר חודשי ראשון {formatPayment(monthlyPayment)}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
