'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarClock, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatILS } from '@/lib/currency';
import type { Loan, LoanPrepayment } from './types';
import { buildLoanSchedule } from './loanMath';
import { ParamRow } from './LoanFields';

/**
 * פירעון מוקדם בתוך הלוואה — אותו רעיון של פרעון מוקדם במסלול בבונה
 * התמהילים: בוחרים סכום, את התשלום שאיתו הוא נפרע, ואם ההלוואה מתקצרת או
 * שההחזר קטן. התצוגה המקדימה מראה מיד את החיסכון, ואחרי האישור הפירעון נכנס
 * ללוח ההחזרים, לחישובים ולגרפים — ואפשר להסיר אותו מתיבת ההלוואה.
 *
 * אין ערכי ברירת מחדל: הסכום, מספר התשלום והאופן ריקים עד שהלקוח בוחר.
 */

const MODE_LABELS: Record<LoanPrepayment['mode'], { title: string; hint: string }> = {
  shorten: { title: 'קיצור התקופה', hint: 'ההחזר החודשי נשמר וההלוואה נגמרת מוקדם' },
  reduce: { title: 'הקטנת ההחזר החודשי', hint: 'התקופה נשמרת וההחזר קטן' },
};

export function LoanPrepaymentDialog({
  loan,
  onClose,
  onConfirm,
}: {
  loan: Loan | null;
  onClose: () => void;
  onConfirm: (loanId: string, prepayment: Omit<LoanPrepayment, 'id'>) => void;
}) {
  const open = loan !== null;
  const [amount, setAmount] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [mode, setMode] = useState<LoanPrepayment['mode'] | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(null);
    setMonth(null);
    setMode(null);
  }, [open, loan?.id]);

  const base = useMemo(() => (loan ? buildLoanSchedule(loan) : null), [loan]);
  const lastMonth = Math.max(1, (base?.monthsActual ?? 2) - 1);

  /** היתרה אחרי התשלום שנבחר — המקסימום שאפשר לפרוע בו */
  const balanceAt = month && base ? base.rows[Math.min(month, base.rows.length) - 1]?.balEnd ?? 0 : 0;
  const capacity = Math.max(0, Math.round(balanceAt));
  const applied = amount !== null && month !== null ? Math.min(amount, capacity) : 0;

  const preview = useMemo(() => {
    if (!loan || !base || month === null || mode === null || applied <= 0) return null;
    const next = buildLoanSchedule({
      ...loan,
      prepayments: [...(loan.prepayments ?? []), { id: 'preview', amount: applied, month, mode }],
    });
    const nextPayment = next.rows[month]?.pay ?? 0;
    return {
      interestSaved: base.totalInterest - next.totalInterest,
      monthsSaved: base.monthsActual - next.monthsActual,
      paymentBefore: base.rows[month]?.pay ?? 0,
      paymentAfter: nextPayment,
      monthsAfter: next.monthsActual,
    };
  }, [loan, base, month, mode, applied]);

  const ready = loan !== null && month !== null && mode !== null && applied > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir="rtl" className="max-h-[92vh] max-w-xl overflow-y-auto text-right">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            פירעון מוקדם · {loan?.name}
          </DialogTitle>
          <DialogDescription>
            סכום חד-פעמי שמשולם יחד עם אחד התשלומים. לוח ההחזרים, החישובים והגרפים יתעדכנו לפיו.
          </DialogDescription>
        </DialogHeader>

        {loan && base && (
          <div className="space-y-3">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <ParamRow
                icon={CalendarClock}
                label="מאיזה תשלום"
                value={month}
                onChange={(value) =>
                  setMonth(value === null ? null : Math.min(Math.max(1, value), lastMonth))
                }
                min={1}
                max={lastMonth}
                step={1}
                suffix={`מתוך ${base.monthsActual}`}
              />
              <ParamRow
                icon={Banknote}
                label="סכום הפירעון"
                value={amount}
                onChange={setAmount}
                min={0}
                max={Math.max(1_000, capacity || Math.round(loan.principal))}
                step={500}
                suffix="₪"
                disabled={month === null}
                placeholder={month === null ? 'בחרו תשלום' : 'הזינו'}
              />
              <p className="text-2xs text-slate-500">
                {month === null
                  ? 'בחרו קודם את התשלום — הסכום המקסימלי הוא היתרה שנשארת אחריו.'
                  : `היתרה אחרי תשלום ${month}: ${formatILS(capacity)}${
                      amount !== null && amount > capacity ? ' — הסכום שמעליה לא ייכנס לפירעון' : ''
                    }`}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-bold text-slate-700">איך הפירעון משפיע</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(MODE_LABELS) as LoanPrepayment['mode'][]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    className={`rounded-xl border p-2.5 text-right transition-colors ${
                      mode === option
                        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    <span className="block text-xs font-black">{MODE_LABELS[option].title}</span>
                    <span className="block text-2xs text-slate-500">{MODE_LABELS[option].hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <TrendingDown className="h-3.5 w-3.5" />
                השפעת הפירעון
              </p>
              <div className="grid grid-cols-3 gap-2">
                <PreviewStat
                  label="חיסכון בריבית"
                  value={preview ? formatILS(preview.interestSaved) : '—'}
                  highlight
                />
                <PreviewStat
                  label={mode === 'reduce' ? 'החזר חודשי חדש' : 'קיצור התקופה'}
                  value={
                    !preview
                      ? '—'
                      : mode === 'reduce'
                        ? formatILS(preview.paymentAfter)
                        : `${preview.monthsSaved} ח׳`
                  }
                />
                <PreviewStat
                  label="תשלומים בסך הכול"
                  value={preview ? `${preview.monthsAfter}` : '—'}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button
            disabled={!ready}
            onClick={() => {
              if (!loan || month === null || mode === null || applied <= 0) return;
              onConfirm(loan.id, { amount: applied, month, mode });
              onClose();
            }}
          >
            הוספת הפירעון
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-white p-2 text-center">
      <p className="text-2xs text-slate-400">{label}</p>
      <p className={`text-xs font-bold ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
