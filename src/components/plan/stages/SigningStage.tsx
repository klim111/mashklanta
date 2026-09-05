'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Check, PenLine, ShieldCheck } from 'lucide-react';
import { SIGNING_CHECKS, winningOffer } from '@/lib/mortgage-plan';
import type { PlanData, SigningData } from '@/lib/mortgage-plan';
import {
  DateField,
  Metric,
  NumberField,
  Panel,
  SelectField,
  formatPercent,
  formatShekel,
} from '../ui';

/** פער שאינו נובע מעיגול — סימן שמשהו בחוזה שונה ממה שסוכם */
const MONTHLY_TOLERANCE = 5;
const RATE_TOLERANCE = 0.01;

export function SigningStage({
  data,
  onChange,
}: {
  data: PlanData;
  onChange: (next: SigningData) => void;
}) {
  const value = data.SIGNING;
  const winner = winningOffer(data.AUCTION);

  const preApprovalBank = data.APPLICATIONS.bank;
  const bankOptions = Array.from(
    new Set([
      ...data.AUCTION.offers.map((offer) => offer.bank),
      ...(preApprovalBank ? [preApprovalBank] : []),
    ])
  ).map((bank) => ({ value: bank, label: bank }));

  const set = <K extends keyof SigningData>(key: K, next: SigningData[K]) =>
    onChange({ ...value, [key]: next });

  const toggleCheck = (key: string) => {
    const checklist = { ...value.checklist };
    if (checklist[key]) delete checklist[key];
    else checklist[key] = true;
    onChange({ ...value, checklist });
  };

  /** אימוץ התנאים שזכו במכרז, כדי שהאימות ייעשה מול מספרים ולא מהזיכרון */
  const pullFromWinner = () => {
    if (!winner) return;
    onChange({
      ...value,
      bank: winner.bank,
      finalMonthlyPayment: winner.monthlyPayment,
      finalAverageRate: winner.averageRate,
      finalAmount: value.finalAmount ?? data.MIX.totalAmount,
    });
  };

  const pullFromFinalMix = () => {
    const mix = data.MIX;
    if (!mix.isFinal) return;
    onChange({
      ...value,
      finalMonthlyPayment: mix.monthlyPayment,
      finalAverageRate: mix.averageRate,
      finalAmount: mix.totalAmount,
    });
  };

  const monthlyGap =
    winner?.monthlyPayment != null && value.finalMonthlyPayment != null
      ? value.finalMonthlyPayment - winner.monthlyPayment
      : null;
  const rateGap =
    winner?.averageRate != null && value.finalAverageRate != null
      ? value.finalAverageRate - winner.averageRate
      : null;

  const drifted =
    (monthlyGap !== null && Math.abs(monthlyGap) > MONTHLY_TOLERANCE) ||
    (rateGap !== null && Math.abs(rateGap) > RATE_TOLERANCE);

  const done = SIGNING_CHECKS.filter((check) => value.checklist[check.key]).length;

  return (
    <div className="space-y-5">
      {data.MIX.isFinal && (
        <Panel
          title="התמהיל הסופי שנבחר"
          description="אלה התנאים שננעלו בשלב בניית התמהיל. אפשר לטעון אותם לחוזה ואז לאמת מול מה שנחתם בפועל."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="שם התמהיל" value={data.MIX.mixName ?? '—'} />
            <Metric label="סכום" value={formatShekel(data.MIX.totalAmount)} />
            <Metric label="החזר חודשי" value={formatShekel(data.MIX.monthlyPayment)} />
            <Metric label="ריבית ממוצעת" value={formatPercent(data.MIX.averageRate, 2)} />
          </div>
        </Panel>
      )}
      <Panel
        title="התנאים שנחתמו בפועל"
        description="העתיקו מהחוזה את מה שכתוב בו — לא את מה שסוכם בטלפון. כאן מתגלים הפערים."
        action={
          <div className="flex flex-wrap gap-2">
            {data.MIX.isFinal && (
              <button
                type="button"
                onClick={pullFromFinalMix}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800 transition-colors hover:bg-slate-50"
              >
                טענו את התמהיל הסופי
              </button>
            )}
            {winner && (
              <button
                type="button"
                onClick={pullFromWinner}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-slate-700"
              >
                טענו את תנאי ההצעה הזוכה
              </button>
            )}
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="הבנק שאיתו נחתם"
            value={value.bank}
            options={
              bankOptions.length > 0 ? bankOptions : [{ value: 'אחר', label: 'בנק אחר' }]
            }
            onChange={(next) => set('bank', next)}
          />
          <DateField
            label="תאריך החתימה"
            value={value.signingDate}
            onChange={(next) => set('signingDate', next)}
          />
          <NumberField
            label="סכום המשכנתא בחוזה"
            value={value.finalAmount}
            onChange={(next) => set('finalAmount', next)}
            suffix="₪"
          />
          <NumberField
            label="החזר חודשי ראשון"
            value={value.finalMonthlyPayment}
            onChange={(next) => set('finalMonthlyPayment', next)}
            suffix="₪"
          />
          <NumberField
            label="ריבית ממוצעת משוקללת"
            value={value.finalAverageRate}
            onChange={(next) => set('finalAverageRate', next)}
            suffix="%"
            integer={false}
          />
        </div>

        {winner && (
          <div className="mt-5">
            <div className="mb-3 text-xs font-black text-slate-600">מול מה שסוכם במכרז</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                label="החזר חודשי במכרז"
                value={formatShekel(winner.monthlyPayment)}
                note={
                  monthlyGap === null
                    ? undefined
                    : Math.abs(monthlyGap) <= MONTHLY_TOLERANCE
                      ? 'תואם למה שנחתם'
                      : `פער של ${formatShekel(Math.abs(monthlyGap))} ${monthlyGap > 0 ? 'לרעתכם' : 'לטובתכם'}`
                }
                tone={
                  monthlyGap === null
                    ? 'default'
                    : Math.abs(monthlyGap) <= MONTHLY_TOLERANCE
                      ? 'good'
                      : monthlyGap > 0
                        ? 'bad'
                        : 'warn'
                }
              />
              <Metric
                label="ריבית במכרז"
                value={formatPercent(winner.averageRate, 2)}
                note={
                  rateGap === null
                    ? undefined
                    : Math.abs(rateGap) <= RATE_TOLERANCE
                      ? 'תואמת למה שנחתם'
                      : `פער של ${Math.abs(rateGap).toFixed(2)} נקודות אחוז`
                }
                tone={
                  rateGap === null
                    ? 'default'
                    : Math.abs(rateGap) <= RATE_TOLERANCE
                      ? 'good'
                      : 'bad'
                }
              />
              <Metric
                label="התמהיל שתכננתם"
                value={formatShekel(data.MIX.monthlyPayment)}
                note={data.MIX.mixName ?? undefined}
              />
            </div>

            {drifted && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  התנאים בחוזה שונים ממה שסוכם במכרז. עצרו לפני החתימה, בקשו הסבר בכתב וודאו
                  שהמסמך מתוקן — אחרי החתימה אין דרך חזרה.
                </span>
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="צ׳ק־ליסט לפני החתימה"
        description="עברו על כל סעיף מול המסמך עצמו. סגירת השלב דורשת שכל הבדיקות יאומתו."
        action={
          <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-black text-white">
            {done} / {SIGNING_CHECKS.length}
          </span>
        }
      >
        <div className="space-y-2">
          {SIGNING_CHECKS.map((check, index) => {
            const checked = Boolean(value.checklist[check.key]);
            return (
              <motion.button
                key={check.key}
                type="button"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => toggleCheck(check.key)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-right transition-all ${
                  checked
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                  }`}
                >
                  {checked && <Check className="h-3 w-3 text-white" />}
                </span>
                <span
                  className={`flex-1 text-sm font-semibold ${
                    checked ? 'text-emerald-900' : 'text-slate-800'
                  }`}
                >
                  {check.label}
                </span>
                {checked ? (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <PenLine className="h-4 w-4 shrink-0 text-slate-300" />
                )}
              </motion.button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
