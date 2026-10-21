'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { monthLabel, timeline } from '@/lib/cash-flow';
import type { AmortRow, CashFlowState } from '@/lib/cash-flow';
import { PERCENT, SHEKEL } from './fields';

export type ScheduleView =
  | { kind: 'loan'; title: string; rows: AmortRow[] }
  | { kind: 'flow' };

/** לוח החזרים: של הלוואה אחת (קרן, ריבית, יתרה), או התזרים החודשי של הכול יחד */
export function ScheduleDialog({
  view,
  state,
  onClose,
}: {
  view: ScheduleView | null;
  state: CashFlowState;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!view} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl" className="max-h-[85vh] max-w-4xl overflow-hidden">
        {view?.kind === 'loan' && <LoanTable title={view.title} rows={view.rows} />}
        {view?.kind === 'flow' && <FlowTable state={state} />}
      </DialogContent>
    </Dialog>
  );
}

const th = 'sticky top-0 bg-slate-100 px-3 py-2 text-right text-2xs font-black text-slate-600';
const td = 'px-3 py-1.5 text-sm tabular-nums text-slate-800';

function LoanTable({ title, rows }: { title: string; rows: AmortRow[] }) {
  const interest = rows.reduce((sum, row) => sum + row.interest, 0);
  const paid = rows.reduce((sum, row) => sum + row.payment, 0);
  return (
    <>
      <DialogHeader className="text-center">
        <DialogTitle className="justify-center text-center text-xl">{title}</DialogTitle>
        <DialogDescription className="text-center text-info">
          {rows.length} תשלומים · סך הכול {SHEKEL(paid)} · מתוכם ריבית {SHEKEL(interest)}
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>חודש</th>
              <th className={th}>תאריך</th>
              <th className={th}>החזר</th>
              <th className={th}>קרן</th>
              <th className={th}>ריבית</th>
              <th className={th}>יתרה</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-t border-slate-100 even:bg-slate-50/60">
                <td className={td}>{row.month}</td>
                <td className={td}>{monthLabel(row.month - 1)}</td>
                <td className={`${td} font-bold`}>{SHEKEL(row.payment)}</td>
                <td className={td}>{SHEKEL(row.principal)}</td>
                <td className={td}>{SHEKEL(row.interest)}</td>
                <td className={td}>{SHEKEL(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FlowTable({ state }: { state: CashFlowState }) {
  const points = useMemo(() => timeline(state), [state]);
  return (
    <>
      <DialogHeader className="text-center">
        <DialogTitle className="justify-center text-center text-xl">התזרים החודשי</DialogTitle>
        <DialogDescription className="text-center text-info">
          מה משלמים בכל חודש, כמה נשאר, ויחס ההחזר — עד סוף ההלוואה האחרונה
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>חודש</th>
              <th className={th}>משכנתא</th>
              {state.loans.map((loan, index) => (
                <th key={loan.id} className={th}>
                  {loan.name || `הלוואה ${index + 1}`}
                </th>
              ))}
              <th className={th}>סך החזר</th>
              <th className={th}>נשאר פנוי</th>
              <th className={th}>יחס בפועל</th>
              <th className={th}>יחס למשכנתא</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.month} className="border-t border-slate-100 even:bg-slate-50/60">
                <td className={td}>{monthLabel(point.month)}</td>
                <td className={td}>{SHEKEL(point.mortgage)}</td>
                {state.loans.map((loan) => (
                  <td key={loan.id} className={td}>
                    {point.loans[loan.id] ? SHEKEL(point.loans[loan.id]) : '—'}
                  </td>
                ))}
                <td className={`${td} font-bold`}>{SHEKEL(point.total)}</td>
                <td className={`${td} ${point.free < 0 ? 'font-bold text-rose-700' : ''}`}>{SHEKEL(point.free)}</td>
                <td className={td}>{PERCENT(point.actualRatio)}</td>
                <td className={td}>{PERCENT(point.mortgageRatio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
