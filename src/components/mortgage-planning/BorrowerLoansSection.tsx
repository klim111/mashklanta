'use client';

import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormattedNumberInput } from '@/components/ui/formatted-number-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  createEmptyLoan,
  getNonBulletLoans,
  hasEnteredLoanPayment,
  type BorrowerLoan,
} from '@/lib/borrower-loans';
import { fieldErrorClassName } from '@/lib/mortgage-planning-validation';
import { cn } from '@/lib/utils';

interface BorrowerLoansSectionProps {
  loans: BorrowerLoan[];
  fieldKeyPrefix: string;
  fieldErrors?: Record<string, boolean>;
  showBulletToggle?: boolean;
  /** בעמודת לווה בזוג — מציג רק הלוואות שאינן משוטפות */
  coupleColumnMode?: boolean;
  /** שורה משותפת לרוחב שתי עמודות */
  sharedSpanMode?: boolean;
  getNextBulletOrder?: () => number;
  onLoansChange: (loans: BorrowerLoan[]) => void;
}

export function BorrowerLoansSection({
  loans,
  fieldKeyPrefix,
  fieldErrors = {},
  showBulletToggle = false,
  coupleColumnMode = false,
  sharedSpanMode = false,
  getNextBulletOrder,
  onLoansChange,
}: BorrowerLoansSectionProps) {
  const displayedLoans = sharedSpanMode
    ? loans.filter((loan) => loan.isBullet)
    : coupleColumnMode
      ? getNonBulletLoans(loans)
      : loans;
  const canAddAnotherLoan = coupleColumnMode
    ? loans.length > 0 && hasEnteredLoanPayment(loans)
    : sharedSpanMode
      ? displayedLoans.length > 0 && hasEnteredLoanPayment(displayedLoans)
      : displayedLoans.length > 0 && hasEnteredLoanPayment(displayedLoans);

  const updateLoan = (id: string, updates: Partial<BorrowerLoan>) => {
    onLoansChange(loans.map((loan) => (loan.id === id ? { ...loan, ...updates } : loan)));
  };

  const removeLoan = (id: string) => {
    onLoansChange(loans.filter((loan) => loan.id !== id));
  };

  const addLoan = () => {
    onLoansChange([...loans, { ...createEmptyLoan(), isBullet: sharedSpanMode }]);
  };

  return (
    <motion.div layout className="space-y-4">
      {displayedLoans.map((loan, index) => {
        const paymentField = `${fieldKeyPrefix}.loans.${loan.id}.monthlyPayment`;
        const title = sharedSpanMode
          ? 'החזר חודשי משותף'
          : displayedLoans.length > 1
            ? `הלוואה ${index + 1} — החזר חודשי`
            : 'החזר חודשי';

        return (
          <motion.div
            key={loan.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={cn(
              'space-y-3 rounded-lg p-3 transition-colors',
              sharedSpanMode || loan.isBullet
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-white border border-gray-200'
            )}
          >
            <motion.div layout className="flex items-center justify-between gap-2">
              <Label className="text-right block font-medium text-amber-900">
                {sharedSpanMode ? title : title}
              </Label>
              <motion.div layout className="flex items-center gap-2 shrink-0">
                {displayedLoans.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLoan(loan.id)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                    aria-label="הסר הלוואה"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            </motion.div>

            <FormattedNumberInput
              placeholder="₪"
              value={loan.monthlyPayment}
              onValueChange={(value) => updateLoan(loan.id, { monthlyPayment: value })}
              className={cn(
                'text-right text-lg p-3',
                sharedSpanMode && 'bg-white',
                fieldErrors[paymentField] && fieldErrorClassName
              )}
            />

            {showBulletToggle && !sharedSpanMode && (
              <motion.div layout className="flex items-center justify-end gap-2">
                <Label
                  htmlFor={`${fieldKeyPrefix}-bullet-${loan.id}`}
                  className="text-sm cursor-pointer text-right"
                >
                  הלוואה משוטפת
                </Label>
                <Checkbox
                  id={`${fieldKeyPrefix}-bullet-${loan.id}`}
                  checked={loan.isBullet}
                  onCheckedChange={(checked) => {
                    const isBullet = checked === true;
                    updateLoan(loan.id, {
                      isBullet,
                      bulletOrder: isBullet
                        ? loan.bulletOrder ?? getNextBulletOrder?.() ?? Date.now()
                        : undefined,
                    });
                  }}
                />
              </motion.div>
            )}

            {showBulletToggle && sharedSpanMode && (
              <motion.div layout className="flex items-center justify-end gap-2">
                <Label
                  htmlFor={`${fieldKeyPrefix}-bullet-${loan.id}`}
                  className="text-sm cursor-pointer text-right"
                >
                  הלוואה משוטפת
                </Label>
                <Checkbox
                  id={`${fieldKeyPrefix}-bullet-${loan.id}`}
                  checked={loan.isBullet}
                  onCheckedChange={(checked) => {
                    const isBullet = checked === true;
                    updateLoan(loan.id, {
                      isBullet,
                      bulletOrder: isBullet
                        ? loan.bulletOrder ?? getNextBulletOrder?.() ?? Date.now()
                        : undefined,
                    });
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {canAddAnotherLoan && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLoan}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 ml-2" />
          הוסף הלוואה נוספת
        </Button>
      )}
    </motion.div>
  );
}
