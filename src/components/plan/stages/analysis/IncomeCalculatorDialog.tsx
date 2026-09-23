'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, Info, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NumericInput } from '@/components/ui/numeric-input';

/**
 * עזרה בחישוב ההכנסה החודשית המוכרת.
 *
 * הבנק אינו לוקח את המשכורת האחרונה אלא ממוצע של שלושה חודשים — כך חודש עם
 * שעות נוספות או עם בונוס אינו מנפח את התמונה, וחודש חלש אינו מוריד אותה.
 * הכלי מבקש בדיוק את זה, מוסיף הכנסות קבועות אחרות, ומחזיר את הממוצע לשדה.
 */
const MONTH_LABELS = ['החודש האחרון', 'החודש שלפניו', 'שלושה חודשים אחורה'];

interface ExtraIncome {
  id: string;
  label: string;
  amount: number | null;
}

function newExtra(): ExtraIncome {
  return { id: `extra-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, label: '', amount: null };
}

const shekel = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

export function IncomeCalculatorDialog({
  open,
  onOpenChange,
  /** שם הלווה שהחישוב נעשה עבורו */
  borrowerLabel,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowerLabel: string;
  onApply: (monthlyIncome: number) => void;
}) {
  const [salaries, setSalaries] = useState<Array<number | null>>([null, null, null]);
  const [extras, setExtras] = useState<ExtraIncome[]>([]);

  useEffect(() => {
    if (!open) return;
    setSalaries([null, null, null]);
    setExtras([]);
  }, [open]);

  const filled = salaries.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
  );
  const salaryAverage = filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;
  const extrasTotal = extras.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const total = useMemo(
    () => Math.round(salaryAverage + extrasTotal),
    [salaryAverage, extrasTotal]
  );

  const ready = filled.length === 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="flex max-h-[94vh] max-w-2xl flex-col gap-3">
        <DialogHeader className="shrink-0 pr-7 text-center">
          <DialogTitle className="justify-center text-center">
            <span className="inline-flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              חישוב ההכנסה החודשית — {borrowerLabel}
            </span>
          </DialogTitle>
          <DialogDescription className="text-center">
            הבנק לא לוקח את המשכורת האחרונה אלא ממוצע של שלושה חודשים רצופים. הזינו את שלוש
            המשכורות נטו האחרונות, הוסיפו הכנסות קבועות אחרות אם יש, והכלי יחשב את הממוצע
            ויזין אותו לשדה.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pl-1">
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-4">
            <h4 className="text-center text-base font-black text-slate-900">
              שלוש משכורות נטו, חודשים עוקבים
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {MONTH_LABELS.map((label, index) => (
                <label key={label} className="block text-center">
                  <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
                  <NumericInput
                    integer
                    value={salaries[index]}
                    onChange={(value) =>
                      setSalaries((current) =>
                        current.map((item, position) => (position === index ? value : item))
                      )
                    }
                    placeholder="12,000"
                    aria-label={`משכורת נטו — ${label}`}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-center text-lg font-black text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
            <h4 className="text-center text-base font-black text-slate-900">
              הכנסות קבועות נוספות
            </h4>
            <p className="mt-1 text-center text-sm font-medium text-slate-600">
              שכר דירה, קצבה, מילואים קבועים, הכנסה מעסק צדדי — כל מה שנכנס כל חודש ואפשר להוכיח.
            </p>

            {extras.length > 0 && (
              <div className="mt-3 space-y-2">
                {extras.map((extra) => (
                  <div key={extra.id} className="flex flex-wrap items-end gap-2">
                    <label className="min-w-[160px] flex-1">
                      <span className="mb-1 block text-xs font-bold text-slate-600">מקור ההכנסה</span>
                      <input
                        value={extra.label}
                        onChange={(event) =>
                          setExtras((current) =>
                            current.map((item) =>
                              item.id === extra.id ? { ...item, label: event.target.value } : item
                            )
                          )
                        }
                        placeholder="שכר דירה"
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500"
                      />
                    </label>
                    <label className="w-36">
                      <span className="mb-1 block text-xs font-bold text-slate-600">סכום חודשי</span>
                      <NumericInput
                        integer
                        value={extra.amount}
                        onChange={(amount) =>
                          setExtras((current) =>
                            current.map((item) => (item.id === extra.id ? { ...item, amount } : item))
                          )
                        }
                        placeholder="3,000"
                        aria-label="סכום חודשי"
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-center text-base font-black text-slate-900 outline-none focus:border-emerald-500"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setExtras((current) => current.filter((item) => item.id !== extra.id))}
                      aria-label="מחיקת ההכנסה"
                      className="mb-1 rounded-lg p-2 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* הכפתור יושב מתחת לשורות, כי הוא מוסיף את הבאה בתור */}
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setExtras((current) => [...current, newExtra()])}
                className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-emerald-300 bg-white px-4 py-2 text-button font-black text-emerald-800 transition-colors hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4" />
                הוספת הכנסה קבועה
              </button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4">
            <h4 className="flex items-center justify-center gap-2 text-center text-base font-black text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              הסכומים חייבים להיות מגובים במסמכים
            </h4>
            <p className="mt-1 text-center text-sm font-semibold leading-relaxed text-amber-900">
              כל סכום שתזינו כאן צריך להופיע באותו גובה גם בתלוש וגם בתדפיס העו״ש. פער בין
              השניים — גם קטן — נקרא אצל הבנק כבעיית אמינות, והוא עלול לדחות את המסמכים.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-4 text-center">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-900">
              <Info className="h-4 w-4" />
              {ready
                ? `ממוצע שלוש המשכורות: ${shekel.format(Math.round(salaryAverage))}${
                    extrasTotal > 0 ? ` · הכנסות נוספות: ${shekel.format(extrasTotal)}` : ''
                  }`
                : `הזינו את שלוש המשכורות (${filled.length} מתוך 3)`}
            </span>
            <div className="mt-2 text-3xl font-black tabular-nums text-slate-900">
              {total > 0 ? shekel.format(total) : '—'}
            </div>
            <p className="mt-1 text-xs font-bold text-slate-600">ההכנסה החודשית שתיכנס לפרופיל</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl border-2 border-slate-200 px-5 py-2.5 text-button font-black text-slate-600 transition-colors hover:bg-slate-50"
          >
            ביטול
          </button>
          <button
            type="button"
            disabled={!ready || total <= 0}
            onClick={() => {
              onApply(total);
              onOpenChange(false);
            }}
            className={`inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-black text-white transition-all ${
              ready && total > 0
                ? 'bg-blue-600 shadow-sm hover:bg-blue-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            <Calculator className="h-4 w-4" />
            הזינו את הממוצע לשדה
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
