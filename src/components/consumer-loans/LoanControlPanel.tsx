'use client';

import React from 'react';
import {
  Banknote,
  CalendarClock,
  Copy,
  Percent,
  Table2,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatILS } from '@/lib/currency';
import type { Loan, LoanCategory, LoanDraft } from './types';
import { LOAN_CATEGORY_LABELS, loanColor, loanStats } from './loanInsights';
import { isCompleteLoan } from './loanMath';
import { ParamRow, valueOrDash } from './LoanFields';
import { RateInfoButton } from './RateInfoButton';

/**
 * פאנל השליטה של תיק ההלוואות.
 *
 * כל הלוואה היא תיבה, וכל פרמטר בה — קרן, ריבית ותקופה — בשורה משלו, עם שדה
 * הזנה וסליידר זה לצד זה. הלוואה חדשה נפתחת ריקה; היא נכנסת לדאשבורד רק כשכל
 * השדות שלה הוזנו. בתוך התיבה יושבים גם הפירעון המוקדם ולוח הסילוקין.
 */

/** גבולות הסליידרים — רחבים מספיק לכל הלוואה צרכנית סבירה */
const APR_MAX = 30;
const MONTHS_MAX = 180;

function principalSliderMax(principal: number | null): number {
  const base = Math.max((principal ?? 0) * 1.5, 200_000);
  return Math.ceil(base / 10_000) * 10_000;
}

export function LoanControlPanel({
  loans,
  onUpdate,
  onDelete,
  onDuplicate,
  onPrepay,
  onRemovePrepayment,
  onShowAmortization,
  children,
}: {
  loans: LoanDraft[];
  onUpdate: (loan: LoanDraft) => void;
  onDelete: (id: string) => void;
  onDuplicate: (loan: LoanDraft) => void;
  onPrepay: (loan: Loan) => void;
  onRemovePrepayment: (loanId: string, prepaymentId: string) => void;
  onShowAmortization: (loan: Loan) => void;
  /** הכפתורים שמתחת להלוואות — הוספה, איחוד ואסטרטגיה */
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      {loans.map((loan) => (
        <LoanControlCard
          key={loan.id}
          loan={loan}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onPrepay={onPrepay}
          onRemovePrepayment={onRemovePrepayment}
          onShowAmortization={onShowAmortization}
        />
      ))}
      {children}
    </div>
  );
}

function LoanControlCard({
  loan,
  onUpdate,
  onDelete,
  onDuplicate,
  onPrepay,
  onRemovePrepayment,
  onShowAmortization,
}: {
  loan: LoanDraft;
  onUpdate: (loan: LoanDraft) => void;
  onDelete: (id: string) => void;
  onDuplicate: (loan: LoanDraft) => void;
  onPrepay: (loan: Loan) => void;
  onRemovePrepayment: (loanId: string, prepaymentId: string) => void;
  onShowAmortization: (loan: Loan) => void;
}) {
  const complete = isCompleteLoan(loan);
  const stats = complete ? loanStats(loan) : null;
  const color = loanColor(loan);
  const prepayments = [...(loan.prepayments ?? [])].sort((a, b) => a.month - b.month);

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
      {/* כותרת התיבה */}
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <input
          value={loan.name}
          onChange={(event) => onUpdate({ ...loan, name: event.target.value })}
          aria-label="שם ההלוואה"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-black text-slate-900 outline-none transition-colors hover:border-slate-200 focus:border-blue-400 focus:bg-white"
        />
        <Select
          value={loan.category ?? ''}
          onValueChange={(value) => onUpdate({ ...loan, category: value as LoanCategory })}
        >
          <SelectTrigger className="h-7 w-36 shrink-0 border-slate-200 text-2xs">
            <SelectValue placeholder="סוג ההלוואה" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LOAN_CATEGORY_LABELS) as LoanCategory[]).map((key) => (
              <SelectItem key={key} value={key} className="text-xs">
                {LOAN_CATEGORY_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => onDuplicate(loan)}
          title="שכפול ההלוואה"
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(loan.id)}
          title="מחיקת ההלוואה"
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* הפרמטרים — כל אחד בשורה משלו */}
      <div className="space-y-1.5">
        <ParamRow
          icon={Wallet}
          label="קרן"
          value={loan.principal}
          onChange={(value) => onUpdate({ ...loan, principal: value })}
          min={0}
          max={principalSliderMax(loan.principal)}
          step={1_000}
          suffix="₪"
        />
        <ParamRow
          icon={Percent}
          label="ריבית שנתית"
          info={<RateInfoButton />}
          value={loan.apr}
          onChange={(value) => onUpdate({ ...loan, apr: value === null ? null : Math.min(value, 99) })}
          min={0}
          max={APR_MAX}
          step={0.05}
          suffix="%"
          integer={false}
        />
        <ParamRow
          icon={CalendarClock}
          label="תקופה"
          value={loan.months}
          onChange={(value) => onUpdate({ ...loan, months: value === null ? null : Math.min(value, 600) })}
          min={1}
          max={MONTHS_MAX}
          step={1}
          suffix="חודשים"
        />
      </div>

      {/* התוצאה החיה של ההלוואה */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
        <Figure label="החזר חודשי" value={valueOrDash(!!stats, formatILS(stats?.monthlyPayment ?? 0))} emphasized />
        <Figure label="סך ריבית" value={valueOrDash(!!stats, formatILS(stats?.totalInterest ?? 0))} />
        <Figure label="סך תשלום" value={valueOrDash(!!stats, formatILS(stats?.totalPaid ?? 0))} />
      </div>

      {/* הפירעונות המוקדמים שהוזנו */}
      {prepayments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {prepayments.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 py-0.5 pl-0.5 pr-2 text-2xs font-bold text-emerald-900"
            >
              <Banknote className="h-3 w-3" />
              {formatILS(item.amount)} בתשלום {item.month} ·{' '}
              {item.mode === 'shorten' ? 'קיצור תקופה' : 'הקטנת החזר'}
              <button
                type="button"
                onClick={() => onRemovePrepayment(loan.id, item.id)}
                title="הסרת הפירעון המוקדם"
                className="rounded p-0.5 text-emerald-700 transition-colors hover:bg-white hover:text-rose-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={!complete}
          onClick={() => complete && onPrepay(loan)}
          title={complete ? undefined : 'הזינו קרן, ריבית ותקופה כדי להוסיף פירעון מוקדם'}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-xs font-bold text-emerald-800 transition-colors hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Banknote className="h-3.5 w-3.5" />
          פירעון מוקדם
        </button>
        <button
          type="button"
          disabled={!complete}
          onClick={() => complete && onShowAmortization(loan)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Table2 className="h-3.5 w-3.5" />
          לוח סילוקין
        </button>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-2xs text-slate-500">{label}</p>
      <p
        className={`truncate font-bold leading-tight ${
          emphasized ? 'text-sm text-blue-700' : 'text-xs text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
