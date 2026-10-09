'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarClock, CalendarDays, TrendingDown } from 'lucide-react';
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
import {
  buildLoanSchedule,
  hasLoanDates,
  paymentDate,
  resolvePrepaymentTiming,
  toISODate,
} from './loanMath';
import { ParamRow, formatDateIL } from './LoanFields';

/**
 * פירעון מוקדם בתוך הלוואה — אותו רעיון של פרעון מוקדם במסלול בבונה
 * התמהילים: בוחרים סכום, את התשלום שאיתו הוא נפרע, ואם ההלוואה מתקצרת או
 * שההחזר קטן. התצוגה המקדימה מראה מיד את החיסכון, ואחרי האישור הפירעון נכנס
 * ללוח ההחזרים, לחישובים ולגרפים — ואפשר להסיר אותו מתיבת ההלוואה.
 *
 * אין ערכי ברירת מחדל: הסכום, מספר התשלום והאופן ריקים עד שהלקוח בוחר.
 *
 * המועד נבחר לפי מספר תשלום, או — כשבהלוואה הוזנו תאריך לקיחה ויום תשלום —
 * לפי תאריך. בפירעון לפי תאריך הסכום יורד מהיתרה ביום שנבחר, ועליו משולמת
 * הריבית היומית מהתשלום האחרון שלפניו ועד אותו יום. אפשר לפרוע עד התשלום
 * שלפני האחרון-אחד (תקופה פחות 2) — אחריו כבר אין טעם בפירעון מוקדם.
 */

type Timing = 'payment' | 'date';

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
  const [date, setDate] = useState<string>('');
  const [timing, setTiming] = useState<Timing>('payment');
  const [mode, setMode] = useState<LoanPrepayment['mode'] | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(null);
    setMonth(null);
    setDate('');
    setTiming('payment');
    setMode(null);
  }, [open, loan?.id]);

  const base = useMemo(() => (loan ? buildLoanSchedule(loan) : null), [loan]);
  const dated = loan ? hasLoanDates(loan) : false;
  /** התשלום האחרון שאפשר לפרוע איתו: תקופת ההלוואה פחות 2 */
  const lastMonth = loan && base ? Math.min(loan.months, base.monthsActual) - 2 : 0;
  const possible = lastMonth >= 1;

  /** טווח התאריכים: מהתשלום הראשון ועד יום לפני התשלום שאחרי lastMonth */
  const dateMin = loan && dated ? toISODate(paymentDate(loan, 1) as Date) : '';
  const dateMax =
    loan && dated && possible
      ? toISODate(new Date((paymentDate(loan, lastMonth + 1) as Date).getTime() - 86_400_000))
      : '';
  const dateValid = Boolean(date) && date >= dateMin && date <= dateMax;

  /** מועד הפירעון בפועל: התשלום שאחריו הוא יורד, וכמה ימים אחרי התשלום */
  const when = useMemo(() => {
    if (!loan) return null;
    if (timing === 'date') {
      if (!dateValid) return null;
      return resolvePrepaymentTiming(loan, { month: 0, date });
    }
    return month === null ? null : { month, days: 0 };
  }, [loan, timing, date, dateValid, month]);

  /** היתרה אחרי התשלום שנבחר — המקסימום שאפשר לפרוע בו */
  const balanceAt =
    when && base ? base.rows[Math.min(when.month, base.rows.length) - 1]?.balEnd ?? 0 : 0;
  const capacity = Math.max(0, Math.round(balanceAt));
  const applied = amount !== null && when !== null ? Math.min(amount, capacity) : 0;
  const accruedInterest = loan && when ? (applied * loan.apr) / 100 / 365 * when.days : 0;

  const prepayment = useMemo(() => {
    if (!when || mode === null || applied <= 0) return null;
    return {
      amount: applied,
      month: when.month,
      mode,
      ...(timing === 'date' ? { date } : {}),
    } satisfies Omit<LoanPrepayment, 'id'>;
  }, [when, mode, applied, timing, date]);

  const preview = useMemo(() => {
    if (!loan || !base || !prepayment) return null;
    const next = buildLoanSchedule({
      ...loan,
      prepayments: [...(loan.prepayments ?? []), { id: 'preview', ...prepayment }],
    });
    return {
      interestSaved: base.totalInterest - next.totalInterest,
      monthsSaved: base.monthsActual - next.monthsActual,
      paymentAfter: next.rows[prepayment.month]?.pay ?? 0,
      monthsAfter: next.monthsActual,
    };
  }, [loan, base, prepayment]);

  const paymentDateLabel = (k: number) =>
    loan && dated ? formatDateIL(toISODate(paymentDate(loan, k) as Date)) : '';

  const ready = loan !== null && prepayment !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir="rtl" className="max-h-[92vh] max-w-xl overflow-y-auto text-right">
        <DialogHeader className="pr-8 text-right">
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
            {!possible ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                בהלוואה של פחות משלושה תשלומים אין מקום לפירעון מוקדם.
              </p>
            ) : (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              {/* לפי מספר תשלום או לפי תאריך */}
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-0.5" role="tablist">
                {(
                  [
                    { id: 'payment', label: 'לפי מספר תשלום', icon: CalendarClock },
                    { id: 'date', label: 'לפי תאריך', icon: CalendarDays },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={timing === option.id}
                    disabled={option.id === 'date' && !dated}
                    title={
                      option.id === 'date' && !dated
                        ? 'הזינו בכרטיס ההלוואה תאריך לקיחה ויום תשלום כדי לבחור לפי תאריך'
                        : undefined
                    }
                    onClick={() => setTiming(option.id)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      timing === option.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <option.icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
              {!dated && (
                <p className="text-2xs text-slate-500">
                  כדי לבחור לפי תאריך, הזינו בכרטיס ההלוואה תאריך לקיחה ויום תשלום.
                </p>
              )}

              {timing === 'payment' ? (
                <ParamRow
                  icon={CalendarClock}
                  label="מאיזה תשלום"
                  value={month}
                  onChange={(value) =>
                    setMonth(value === null || value < 1 ? null : Math.min(value, lastMonth))
                  }
                  min={1}
                  max={lastMonth}
                  step={1}
                  suffix={`עד ${lastMonth}`}
                  clampInput
                />
              ) : (
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="text-2xs font-bold text-slate-600">תאריך הפירעון</span>
                  </div>
                  <input
                    type="date"
                    value={date}
                    min={dateMin}
                    max={dateMax}
                    onChange={(event) => setDate(event.target.value)}
                    aria-label="תאריך הפירעון"
                    className={`h-8 min-w-0 rounded-lg border bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${
                      date ? 'border-slate-200' : 'border-dashed border-slate-300'
                    }`}
                  />
                </div>
              )}

              <ParamRow
                icon={Banknote}
                label="סכום הפירעון"
                value={amount}
                onChange={setAmount}
                min={0}
                max={Math.max(1_000, capacity || Math.round(loan.principal))}
                step={500}
                suffix="₪"
                disabled={when === null}
                placeholder={when === null ? (timing === 'date' ? 'בחרו תאריך' : 'בחרו תשלום') : 'הזינו'}
              />
              <p className="text-2xs text-slate-500">
                {timing === 'date' && date && !dateValid
                  ? `אפשר לבחור תאריך בין ${formatDateIL(dateMin)} ל-${formatDateIL(dateMax)}.`
                  : when === null
                    ? timing === 'date'
                      ? `בחרו תאריך בין ${formatDateIL(dateMin)} ל-${formatDateIL(dateMax)}. הסכום המקסימלי הוא היתרה באותו יום.`
                      : `בחרו תשלום בין 1 ל-${lastMonth}. הסכום המקסימלי הוא היתרה שנשארת אחריו.`
                    : timing === 'date'
                      ? `${when.days} ימים אחרי תשלום ${when.month} (${paymentDateLabel(when.month)}). היתרה: ${formatILS(capacity)}${
                          accruedInterest > 0 ? ` · ריבית יומית על הסכום עד יום הפירעון: ${formatILS(accruedInterest)}` : ''
                        }`
                      : `היתרה אחרי תשלום ${when.month}${dated ? ` (${paymentDateLabel(when.month)})` : ''}: ${formatILS(capacity)}${
                          amount !== null && amount > capacity ? ' — הסכום שמעליה לא ייכנס לפירעון' : ''
                        }`}
              </p>
            </div>
            )}

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
              if (!loan || !prepayment) return;
              onConfirm(loan.id, prepayment);
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
