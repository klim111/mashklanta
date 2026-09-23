'use client';

import React, { useState } from 'react';
import { CalendarClock, Download, Percent, Table2, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { Slider } from '@/components/ui/slider';
import { formatILS } from '@/lib/currency';
import type { Loan } from './types';
import { buildAmortSchedule } from './loanMath';
import { AmortChart } from './AmortChart';

/**
 * לוח הסילוקין של הלוואה בודדת — הצלילה לפרטים מתוך הכלי.
 *
 * מציג את הגרף והטבלה זה ליד זה, עם אפשרות להוסיף פירעון מוקדם בחודש מסוים
 * ולראות מיד מה הוא עושה לריבית, לתשלום ולתקופה. הטבלה מיוצאת ל-CSV.
 */
export function AmortTable({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const [prepayAmount, setPrepayAmount] = useState(0);
  const [prepayMonth, setPrepayMonth] = useState(1);
  const [prepayEnabled, setPrepayEnabled] = useState(false);

  const active = prepayEnabled && prepayAmount > 0;

  const baseline = buildAmortSchedule({
    principal: loan.principal,
    apr: loan.apr,
    months: loan.months,
  });

  const schedule = active
    ? buildAmortSchedule({
        principal: loan.principal,
        apr: loan.apr,
        months: loan.months,
        prepayAmount,
        prepayMonth,
        mode: 'reduce',
      })
    : baseline;

  const exportToCSV = () => {
    const headers = ['חודש', 'יתרה תחילת חודש', 'תשלום', 'ריבית', 'קרן', 'יתרה סוף חודש'];
    const csvContent = [
      headers.join(','),
      ...schedule.rows.map((row) =>
        [
          row.m,
          row.balStart.toFixed(2),
          row.pay.toFixed(2),
          row.interest.toFixed(2),
          row.principal.toFixed(2),
          row.balEnd.toFixed(2),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `טבלת_סילוקין_${loan.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        dir="rtl"
        className="w-[calc(100vw-1.5rem)] max-w-5xl overflow-hidden rounded-3xl border-0 bg-white p-0 text-right shadow-2xl sm:w-full"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Table2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-base font-black text-slate-900">
              לוח סילוקין · {loan.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {formatILS(loan.principal)} · {loan.apr.toFixed(2)}% · {loan.months} חודשים
            </DialogDescription>
          </div>
        </div>

        <div className="max-h-[75vh] space-y-2.5 overflow-y-auto px-5 py-4">
          {/* מצב ההלוואה */}
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-4">
            <Figure
              icon={Wallet}
              label="תשלום חודשי"
              value={formatILS(schedule.paymentInitial)}
              emphasized
            />
            <Figure
              icon={Percent}
              label="סך ריבית"
              value={formatILS(schedule.totalInterest)}
              delta={active ? schedule.totalInterest - baseline.totalInterest : undefined}
            />
            <Figure
              icon={Wallet}
              label="סך תשלום"
              value={formatILS(schedule.totalPaid)}
              delta={active ? schedule.totalPaid - baseline.totalPaid : undefined}
            />
            <Figure
              icon={CalendarClock}
              label="חודשים בפועל"
              value={`${schedule.monthsActual}`}
            />
          </div>

          {/* פירעון מוקדם */}
          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={prepayEnabled}
                onChange={(event) => setPrepayEnabled(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              בדיקת פירעון מוקדם
              <span className="font-normal text-slate-400">
                (הקרן קטנה, התקופה נשמרת והתשלום החודשי יורד)
              </span>
            </label>

            {prepayEnabled && (
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-2xs font-bold text-slate-600">סכום הפירעון</p>
                  <FormattedNumberValueInput
                    value={prepayAmount || ''}
                    onValueChange={setPrepayAmount}
                    placeholder="0"
                    aria-label="סכום הפירעון המוקדם"
                    className="h-8 w-32 text-xs"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-2xs font-bold text-slate-600">חודש הפירעון</span>
                    <span className="mr-auto text-xs font-black text-slate-900">
                      חודש {prepayMonth}
                    </span>
                  </div>
                  <div dir="ltr">
                    <Slider
                      dir="ltr"
                      value={[Math.min(prepayMonth, loan.months)]}
                      onValueChange={([value]) => setPrepayMonth(Math.round(value))}
                      min={1}
                      max={Math.max(1, loan.months)}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* הגרף */}
          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <p className="mb-1 text-xs font-bold text-slate-800">ירידת הקרן והריבית המצטברת</p>
            <AmortChart
              loan={loan}
              prepay={active ? { amount: prepayAmount, month: prepayMonth } : undefined}
              height={200}
            />
          </div>

          {/* הטבלה */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-2.5 py-2">
              <p className="text-xs font-bold text-slate-800">טבלת התשלומים</p>
              <button
                type="button"
                onClick={exportToCSV}
                className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-2xs font-bold text-slate-600 transition-colors hover:border-slate-900 hover:text-slate-900"
              >
                <Download className="h-3.5 w-3.5" />
                ייצוא ל-CSV
              </button>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-2xs">
                <thead className="sticky top-0 bg-white text-2xs font-bold text-slate-500 shadow-sm">
                  <tr>
                    <th className="p-2 text-right">חודש</th>
                    <th className="p-2 text-right">יתרה בתחילת חודש</th>
                    <th className="p-2 text-right">תשלום</th>
                    <th className="p-2 text-right">ריבית</th>
                    <th className="p-2 text-right">קרן</th>
                    <th className="p-2 text-right">יתרה בסוף חודש</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.rows.map((row) => (
                    <tr
                      key={row.m}
                      className={`border-t border-slate-100 ${
                        active && row.m === prepayMonth ? 'bg-amber-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-2 font-bold text-slate-700">{row.m}</td>
                      <td className="p-2 text-slate-600">{formatILS(row.balStart)}</td>
                      <td className="p-2 font-bold text-slate-900">{formatILS(row.pay)}</td>
                      <td className="p-2 text-rose-600">{formatILS(row.interest)}</td>
                      <td className="p-2 text-emerald-600">{formatILS(row.principal)}</td>
                      <td className="p-2 text-slate-600">{formatILS(row.balEnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-5 py-2 text-button font-black text-white transition-colors hover:bg-blue-700"
          >
            סגירה
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Figure({
  icon: Icon,
  label,
  value,
  delta,
  emphasized = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delta?: number;
  emphasized?: boolean;
}) {
  const hasDelta = typeof delta === 'number' && Math.abs(delta) > 1;
  const improved = (delta ?? 0) < 0;
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-2xs text-slate-500">
        <Icon className="h-3 w-3 text-slate-400" />
        {label}
      </p>
      <p
        className={`truncate font-bold leading-tight ${
          emphasized ? 'text-info text-blue-700' : 'text-sm text-slate-900'
        }`}
      >
        {value}
      </p>
      {hasDelta && (
        <p className={`text-2xs font-bold ${improved ? 'text-emerald-600' : 'text-rose-600'}`}>
          {improved ? '−' : '+'}
          {formatILS(Math.abs(delta as number))}
        </p>
      )}
    </div>
  );
}
