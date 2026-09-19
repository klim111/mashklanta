'use client';

import React from 'react';
import {
  CalendarClock,
  CheckSquare,
  Copy,
  Percent,
  Plus,
  Square,
  Table2,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { formatILS } from '@/lib/currency';
import type { Loan, LoanCategory } from './types';
import { LOAN_CATEGORY_LABELS, loanCategoryOf, loanColor, loanStats } from './loanInsights';

/**
 * פאנל השליטה של תיק ההלוואות.
 *
 * אותו רעיון שבכלי המיחזור ובבונה התמהילים: כל הפרמטרים של כל הלוואה במסך
 * אחד, כל תזוזה של מכוון מתעדכנת מיד בדאשבורד שמתחת — בלי שמירה ובלי מעבר
 * מסך. כאן הפרמטרים הם של הלוואה צרכנית: קרן, ריבית שנתית ותקופה בחודשים.
 */

/** גבולות המכוונים — רחבים מספיק לכל הלוואה צרכנית סבירה */
const APR_MIN = 0.5;
const APR_MAX = 30;
const MONTHS_MIN = 6;
const MONTHS_MAX = 180;

function principalSliderMax(principal: number): number {
  const doubled = Math.max(principal * 2, 100_000);
  return Math.ceil(doubled / 10_000) * 10_000;
}

export function LoanControlPanel({
  loans,
  selectedIds,
  onUpdate,
  onDelete,
  onDuplicate,
  onAdd,
  onToggleSelect,
  onShowAmortization,
}: {
  loans: Loan[];
  selectedIds: string[];
  onUpdate: (loan: Loan) => void;
  onDelete: (id: string) => void;
  onDuplicate: (loan: Loan) => void;
  onAdd: () => void;
  onToggleSelect: (id: string) => void;
  onShowAmortization: (loan: Loan) => void;
}) {
  /**
   * שתי עמודות לכל היותר: הפאנל חי בחצי המסך, לצד הדאשבורד, וכרטיס צר מדי
   * חותך את הסכומים.
   */
  const columns = loans.length <= 1 ? 'grid-cols-1' : 'sm:grid-cols-2';

  return (
    <div className="space-y-2.5">
      <div className={`grid gap-2.5 ${columns}`}>
        {loans.map((loan) => (
          <LoanControlCard
            key={loan.id}
            loan={loan}
            selected={selectedIds.includes(loan.id)}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onToggleSelect={onToggleSelect}
            onShowAmortization={onShowAmortization}
          />
        ))}

        {/* הוספת הלוואה — כרטיס ריק באותה רשת, כמו הוספת מסלול בכלי המיחזור */}
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[140px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-4 text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
            <Plus className="h-4 w-4" />
          </span>
          <span className="text-[13px] font-black">הוספת הלוואה</span>
          <span className="text-[11px]">בנקאית, אשראי, רכב או כל התחייבות חודשית אחרת</span>
        </button>
      </div>
    </div>
  );
}

function LoanControlCard({
  loan,
  selected,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleSelect,
  onShowAmortization,
}: {
  loan: Loan;
  selected: boolean;
  onUpdate: (loan: Loan) => void;
  onDelete: (id: string) => void;
  onDuplicate: (loan: Loan) => void;
  onToggleSelect: (id: string) => void;
  onShowAmortization: (loan: Loan) => void;
}) {
  const stats = loanStats(loan);
  const color = loanColor(loan);
  const category = loanCategoryOf(loan);
  const maxPrincipal = principalSliderMax(loan.principal);

  return (
    <div
      className={`space-y-2 rounded-xl border bg-white p-2.5 transition-all ${
        selected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
      }`}
    >
      {/* כותרת הכרטיס */}
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={() => onToggleSelect(loan.id)}
          title={selected ? 'הסרה מההשוואה' : 'הוספה להשוואה'}
          className={`mt-0.5 shrink-0 rounded-md p-0.5 transition-colors ${
            selected ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'
          }`}
        >
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>

        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />

        <div className="min-w-0 flex-1">
          <input
            value={loan.name}
            onChange={(event) => onUpdate({ ...loan, name: event.target.value })}
            aria-label="שם ההלוואה"
            className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-black text-slate-900 outline-none transition-colors hover:border-slate-200 focus:border-blue-400 focus:bg-white"
          />
          <Select
            value={category}
            onValueChange={(value) => onUpdate({ ...loan, category: value as LoanCategory })}
          >
            <SelectTrigger className="mt-1 h-7 w-full border-slate-200 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LOAN_CATEGORY_LABELS) as LoanCategory[]).map((key) => (
                <SelectItem key={key} value={key} className="text-[12px]">
                  {LOAN_CATEGORY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex shrink-0 gap-0.5">
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
      </div>

      {/* התוצאה החיה של ההלוואה */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-2 py-1.5">
        <Figure label="החזר חודשי" value={formatILS(stats.monthlyPayment)} emphasized />
        <Figure label="סך ריבית" value={formatILS(stats.totalInterest)} />
        <Figure label="סך תשלום" value={formatILS(stats.totalPaid)} />
      </div>

      {/* המכוונים */}
      <ControlRow
        icon={Wallet}
        label="קרן"
        display={formatILS(loan.principal)}
        input={
          <FormattedNumberValueInput
            value={loan.principal}
            onValueChange={(value) => onUpdate({ ...loan, principal: Math.max(0, value) })}
            className="h-7 w-24 text-[12px]"
            aria-label="קרן ההלוואה"
          />
        }
        slider={
          <Slider
            dir="ltr"
            value={[Math.min(loan.principal, maxPrincipal)]}
            onValueChange={([value]) => onUpdate({ ...loan, principal: value })}
            min={0}
            max={maxPrincipal}
            step={1000}
          />
        }
        min="₪0"
        max={formatILS(maxPrincipal)}
      />

      <ControlRow
        icon={Percent}
        label="ריבית שנתית"
        display={`${loan.apr.toFixed(2)}%`}
        slider={
          <Slider
            dir="ltr"
            value={[Math.min(Math.max(loan.apr, APR_MIN), APR_MAX)]}
            onValueChange={([value]) => onUpdate({ ...loan, apr: value })}
            min={APR_MIN}
            max={APR_MAX}
            step={0.05}
          />
        }
        min={`${APR_MIN}%`}
        max={`${APR_MAX}%`}
      />

      <ControlRow
        icon={CalendarClock}
        label="תקופה"
        display={`${loan.months} ח׳${loan.months >= 12 ? ` · ${(loan.months / 12).toFixed(1)} שנים` : ''}`}
        slider={
          <Slider
            dir="ltr"
            value={[Math.min(Math.max(loan.months, MONTHS_MIN), MONTHS_MAX)]}
            onValueChange={([value]) => onUpdate({ ...loan, months: Math.round(value) })}
            min={MONTHS_MIN}
            max={MONTHS_MAX}
            step={1}
          />
        }
        min={`${MONTHS_MIN} ח׳`}
        max={`${MONTHS_MAX} ח׳`}
      />

      <button
        type="button"
        onClick={() => onShowAmortization(loan)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-[12px] font-bold text-slate-600 transition-colors hover:border-slate-900 hover:text-slate-900"
      >
        <Table2 className="h-3.5 w-3.5" />
        לוח סילוקין ופירעון מוקדם
      </button>
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
      <p className="text-[10px] text-slate-500">{label}</p>
      <p
        className={`truncate font-bold leading-tight ${
          emphasized ? 'text-[14px] text-blue-700' : 'text-[12px] text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ControlRow({
  icon: Icon,
  label,
  display,
  input,
  slider,
  min,
  max,
}: {
  icon: React.ElementType;
  label: string;
  display: string;
  input?: React.ReactNode;
  slider: React.ReactNode;
  min: string;
  max: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-[11px] font-bold text-slate-600">{label}</span>
        <span className="mr-auto text-[12px] font-black text-slate-900">{display}</span>
        {input}
      </div>
      <div dir="ltr">
        {slider}
        <div className="mt-0.5 flex justify-between text-[9px] text-slate-400" dir="ltr">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}
