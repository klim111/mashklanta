'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormattedNumberInput } from '@/components/ui/formatted-number-input';
import { Label } from '@/components/ui/label';
import { createEmptyLoan, borrowerHasLoanEntries } from '@/lib/borrower-loans';
import { fieldErrorClassName } from '@/lib/mortgage-planning-validation';
import { cn } from '@/lib/utils';
import type { BorrowerData } from '@/lib/mortgage-affordability';
import { BorrowerLoansSection } from './BorrowerLoansSection';

interface BorrowerFieldsColumnProps {
  title: string;
  borrower: BorrowerData;
  borrowerKey: 'borrower1' | 'borrower2';
  fieldErrors?: Record<string, boolean>;
  showBulletToggle?: boolean;
  coupleColumnMode?: boolean;
  getNextBulletOrder?: () => number;
  onChange: (updates: Partial<BorrowerData>) => void;
}

export function BorrowerFieldsColumn({
  title,
  borrower,
  borrowerKey,
  fieldErrors = {},
  showBulletToggle = false,
  coupleColumnMode = false,
  getNextBulletOrder,
  onChange,
}: BorrowerFieldsColumnProps) {
  const ageField = `${borrowerKey}.age`;
  const incomeField = `${borrowerKey}.monthlyIncome`;
  const hasLoans = borrowerHasLoanEntries(borrower);
  const hasLoanFieldError = Object.keys(fieldErrors).some((key) =>
    key.startsWith(`${borrowerKey}.loans.`)
  );

  return (
    <motion.div
      layout
      className={cn(
        'border rounded-xl p-5 bg-gray-50/50 space-y-5 transition-colors',
        fieldErrors[ageField] || fieldErrors[incomeField] || hasLoanFieldError
          ? 'border-red-400 ring-2 ring-red-100'
          : 'border-gray-200'
      )}
    >
      <h3 className="text-lg font-bold text-gray-900 text-center">{title}</h3>

      <motion.div layout>
        <Label className="text-right block mb-2 font-medium">גיל</Label>
        <Input
          type="number"
          placeholder="גיל"
          value={borrower.age}
          onChange={(e) => onChange({ age: e.target.value })}
          className={cn(
            'text-right text-lg p-3',
            fieldErrors[ageField] && fieldErrorClassName
          )}
        />
      </motion.div>

      <motion.div layout>
        <Label className="text-right block mb-2 font-medium">הכנסה חודשית</Label>
        <FormattedNumberInput
          placeholder="₪"
          value={borrower.monthlyIncome}
          onValueChange={(value) => onChange({ monthlyIncome: value })}
          className={cn(
            'text-right text-lg p-3',
            fieldErrors[incomeField] && fieldErrorClassName
          )}
        />
      </motion.div>

      <motion.div layout>
        <Label className="text-right block mb-3 font-medium">
          הלוואות עם תקופת פירעון מעל 18 חודשים?
        </Label>
        <motion.div layout className="flex gap-3 justify-center">
          <Button
            type="button"
            size="sm"
            variant={hasLoans ? 'default' : 'outline'}
            onClick={() => onChange({ loans: [createEmptyLoan()] })}
          >
            כן
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!hasLoans ? 'default' : 'outline'}
            onClick={() => onChange({ loans: [] })}
          >
            לא
          </Button>
        </motion.div>
      </motion.div>

      {hasLoans && (
        <BorrowerLoansSection
          loans={borrower.loans}
          fieldKeyPrefix={borrowerKey}
          fieldErrors={fieldErrors}
          showBulletToggle={showBulletToggle}
          coupleColumnMode={coupleColumnMode}
          getNextBulletOrder={getNextBulletOrder}
          onLoansChange={(loans) => onChange({ loans })}
        />
      )}
    </motion.div>
  );
}
