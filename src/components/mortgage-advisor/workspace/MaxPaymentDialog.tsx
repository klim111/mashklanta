'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormattedNumberInput } from '@/components/ui/formatted-number-input';
import { BorrowerLoansSection } from '@/components/mortgage-planning/BorrowerLoansSection';
import { createEmptyLoan, sumBorrowerLoans } from '@/lib/borrower-loans';
import type { BorrowerLoan } from '@/lib/borrower-loans';
import {
  calculateMaxProperty,
  defaultMortgagePlanningUserData,
} from '@/lib/mortgage-affordability';
import type { DealType } from '../types';
import { planningPropertyType } from '../propertyContext';
import { Calculator, Check, Users, User, Wallet } from 'lucide-react';
import { formatShekel } from './primitives';
import { formatDuration } from '../engine';
import { yearsToMonths } from '@/lib/mortgage-plan';

interface MaxPaymentDialogProps {
  open: boolean;
  dealType: DealType;
  /** ההון העצמי של הלקוח — נדרש לחישוב המשכנתא המקסימלית שנגזרת מההחזר */
  equity: number;
  onClose: () => void;
  onConfirm: (maxMonthlyPayment: number) => void;
}

interface BorrowerForm {
  age: string;
  monthlyIncome: string;
  loans: BorrowerLoan[];
}

const emptyBorrowerForm = (): BorrowerForm => ({ age: '', monthlyIncome: '', loans: [] });

/**
 * חישוב ההחזר החודשי המקסימלי לפי נתוני הלקוח, באותה שיטה של "מה אני יכול
 * להרשות לעצמי": הכנסה פנויה אחרי הלוואות קיימות, וכלל ה-40% של בנק ישראל.
 * התוצאה נכנסת לשדה ההחזר המקסימלי של התמהיל.
 */
export function MaxPaymentDialog({
  open,
  dealType,
  equity,
  onClose,
  onConfirm,
}: MaxPaymentDialogProps) {
  const [isCouple, setIsCouple] = useState(false);
  const [borrower1, setBorrower1] = useState<BorrowerForm>(emptyBorrowerForm);
  const [borrower2, setBorrower2] = useState<BorrowerForm>(emptyBorrowerForm);
  const [includeInsurance, setIncludeInsurance] = useState(false);

  // כל פתיחה מתחילה מטופס נקי, כדי שנתונים של לקוח קודם לא יזלגו לחישוב
  useEffect(() => {
    if (!open) return;
    setIsCouple(false);
    setBorrower1(emptyBorrowerForm());
    setBorrower2(emptyBorrowerForm());
    setIncludeInsurance(false);
  }, [open]);

  const result = useMemo(() => {
    const base = defaultMortgagePlanningUserData();
    return calculateMaxProperty(
      {
        ...base,
        propertyType: planningPropertyType(dealType),
        applicationType: isCouple ? 'couple' : 'individual',
        ownCapital: String(Math.round(equity)),
        age: borrower1.age,
        monthlyIncome: borrower1.monthlyIncome,
        loans: borrower1.loans,
        hasLoans: borrower1.loans.length > 0,
        borrower1: { ...borrower1 },
        borrower2: { ...borrower2 },
      },
      { includeInsurance }
    );
  }, [dealType, equity, isCouple, borrower1, borrower2, includeInsurance]);

  const filled = (form: BorrowerForm) =>
    parseInt(form.age, 10) > 0 && form.monthlyIncome.trim() !== '';
  const ready =
    filled(borrower1) && (!isCouple || filled(borrower2)) && result.maxMonthlyPayment > 0;

  const loanPayments =
    sumBorrowerLoans(borrower1.loans) + (isCouple ? sumBorrowerLoans(borrower2.loans) : 0);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Calculator className="h-5 w-5 text-blue-600" />
            חישוב ההחזר החודשי המקסימלי
          </DialogTitle>
          <DialogDescription className="text-right">
            נזין את נתוני הלקוח, ננתח את ההלוואות הקיימות, ונחשב את ההחזר המקסימלי לפי כלל ה-40%
            של בנק ישראל מההכנסה הפנויה.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isCouple ? 'outline' : 'default'}
              className="h-9 flex-1 text-xs"
              onClick={() => setIsCouple(false)}
            >
              <User className="h-4 w-4 ml-1" />
              לווה יחיד
            </Button>
            <Button
              type="button"
              variant={isCouple ? 'default' : 'outline'}
              className="h-9 flex-1 text-xs"
              onClick={() => setIsCouple(true)}
            >
              <Users className="h-4 w-4 ml-1" />
              זוג לווים
            </Button>
          </div>

          <div className={`grid gap-3 ${isCouple ? 'sm:grid-cols-2' : ''}`}>
            <BorrowerFields
              title={isCouple ? 'לווה 1' : 'נתוני הלקוח'}
              form={borrower1}
              onChange={setBorrower1}
            />
            {isCouple && (
              <BorrowerFields title="לווה 2" form={borrower2} onChange={setBorrower2} />
            )}
          </div>

          <button
            type="button"
            onClick={() => setIncludeInsurance((value) => !value)}
            className="flex w-full items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-right transition-colors hover:bg-slate-50"
          >
            <Checkbox checked={includeInsurance} className="mt-0.5 pointer-events-none" tabIndex={-1} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-800">
                הפחת עלויות ביטוח מהתקציב
              </span>
              <span className="block text-[10px] text-slate-500 leading-snug mt-0.5">
                ביטוח מבנה וביטוח חיים נכנסים לתוך תקרת ה-40%, ולכן ההחזר לבנק יוצא נמוך יותר.
              </span>
            </span>
          </button>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-blue-900 flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                החזר חודשי מקסימלי
              </span>
              <span className="text-xl font-bold text-blue-700">
                {formatShekel(result.maxMonthlyPayment)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-blue-900 sm:grid-cols-4">
              <ResultCell label="הכנסה פנויה" value={formatShekel(result.disposableIncome)} />
              <ResultCell label="החזרי הלוואות" value={formatShekel(loanPayments)} />
              <ResultCell label="משכנתא מקסימלית" value={formatShekel(result.maxLoanAmount)} />
              <ResultCell label="תקופה מקסימלית" value={formatDuration(yearsToMonths(result.maxLoanPeriod))} />
            </div>
            {result.includesInsurance && result.totalInsuranceMonthly > 0 && (
              <p className="text-[10px] text-blue-800">
                מתוך התקציב הופחתו {formatShekel(result.totalInsuranceMonthly)} ביטוחים בחודש
                (מבנה {formatShekel(result.propertyInsuranceMonthly)}, חיים{' '}
                {formatShekel(result.healthInsuranceMonthly)}).
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="h-9 text-xs" onClick={onClose}>
              ביטול
            </Button>
            <Button
              className="h-9 text-xs"
              disabled={!ready}
              onClick={() => {
                onConfirm(result.maxMonthlyPayment);
                onClose();
              }}
            >
              <Check className="h-4 w-4 ml-1" />
              הכנס {formatShekel(result.maxMonthlyPayment)} לשדה ההחזר
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BorrowerFields({
  title,
  form,
  onChange,
}: {
  title: string;
  form: BorrowerForm;
  onChange: (form: BorrowerForm) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
      <p className="text-xs font-semibold text-slate-700">{title}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">גיל</Label>
          <Input
            dir="ltr"
            className="h-9 text-right"
            type="text"
            inputMode="numeric"
            min={18}
            max={90}
            placeholder="לדוגמה 35"
            value={form.age}
            onChange={(e) => onChange({ ...form, age: e.target.value.replace(/[^\d]/g, '') })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">הכנסה חודשית נטו (₪)</Label>
          <FormattedNumberInput
            className="h-9"
            placeholder="₪"
            value={form.monthlyIncome}
            onValueChange={(monthlyIncome) => onChange({ ...form, monthlyIncome })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">הלוואות קיימות מעל 18 חודשים</Label>
        {form.loans.length === 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full border-dashed text-xs"
            onClick={() => onChange({ ...form, loans: [createEmptyLoan()] })}
          >
            הוסף הלוואה
          </Button>
        ) : (
          <BorrowerLoansSection
            loans={form.loans}
            fieldKeyPrefix={title}
            onLoansChange={(loans) => onChange({ ...form, loans })}
          />
        )}
      </div>
    </div>
  );
}

function ResultCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 p-2">
      <p className="text-[10px] text-blue-700">{label}</p>
      <p className="text-xs font-bold text-blue-900">{value}</p>
    </div>
  );
}
