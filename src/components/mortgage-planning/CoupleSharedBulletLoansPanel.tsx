'use client';

import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormattedNumberInput } from '@/components/ui/formatted-number-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  createEmptyLoan,
  getCoupleBulletLoans,
  nextBulletDisplayOrder,
  pickOwnerForNewBulletLoan,
  sumCoupleBulletLoans,
  type CoupleBorrowerKey,
} from '@/lib/borrower-loans';
import { fieldErrorClassName } from '@/lib/mortgage-planning-validation';
import { cn } from '@/lib/utils';
import type { BorrowerLoan } from '@/lib/borrower-loans';
import type { MortgagePlanningUserData } from '@/lib/mortgage-affordability';

const ownerLabels: Record<CoupleBorrowerKey, string> = {
  borrower1: 'לווה 1',
  borrower2: 'לווה 2',
};

interface CoupleSharedBulletLoansPanelProps {
  userData: MortgagePlanningUserData;
  fieldErrors?: Record<string, boolean>;
  onUpdateBorrowerLoans: (owner: CoupleBorrowerKey, loans: BorrowerLoan[]) => void;
}

export function CoupleSharedBulletLoansPanel({
  userData,
  fieldErrors = {},
  onUpdateBorrowerLoans,
}: CoupleSharedBulletLoansPanelProps) {
  const bulletLoans = getCoupleBulletLoans(userData);
  const totalBulletPayment = sumCoupleBulletLoans(userData);

  if (bulletLoans.length === 0) return null;

  const updateBulletLoan = (
    owner: CoupleBorrowerKey,
    loanId: string,
    updates: Partial<BorrowerLoan>
  ) => {
    onUpdateBorrowerLoans(
      owner,
      userData[owner].loans.map((loan) => (loan.id === loanId ? { ...loan, ...updates } : loan))
    );
  };

  const removeBulletLoan = (owner: CoupleBorrowerKey, loanId: string) => {
    onUpdateBorrowerLoans(
      owner,
      userData[owner].loans.filter((loan) => loan.id !== loanId)
    );
  };

  const addBulletLoan = () => {
    const owner = pickOwnerForNewBulletLoan(userData);
    const ownerLoans = userData[owner].loans;
    onUpdateBorrowerLoans(owner, [
      ...ownerLoans,
      { ...createEmptyLoan(), isBullet: true, bulletOrder: nextBulletDisplayOrder(userData) },
    ]);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4"
    >
      <Label className="text-right block text-lg font-semibold text-amber-900">
        החזר חודשי של הלוואה משותפת
      </Label>

      <motion.div layout className="space-y-3 rounded-lg border border-amber-100 bg-white/80 p-4">
        <p className="text-sm font-medium text-amber-900 text-right">סיכום הלוואות משוטפות</p>

        <motion.ul layout className="space-y-3">
          {bulletLoans.map(({ loan, owner }, displayIndex) => {
            const paymentField = `${owner}.loans.${loan.id}.monthlyPayment`;
            const label =
              bulletLoans.length > 1
                ? `${ownerLabels[owner]} — משוטפת ${displayIndex + 1}`
                : ownerLabels[owner];

            return (
              <motion.li
                key={`${owner}-${loan.id}`}
                layout
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
              >
                <span className="text-sm text-amber-800 shrink-0 sm:w-36 text-right">{label}</span>
                <FormattedNumberInput
                  placeholder="₪"
                  value={loan.monthlyPayment}
                  onValueChange={(value) =>
                    updateBulletLoan(owner, loan.id, { monthlyPayment: value })
                  }
                  className={cn(
                    'text-right text-lg p-3 flex-1 bg-white',
                    fieldErrors[paymentField] && fieldErrorClassName
                  )}
                />
                <div className="flex items-center justify-end gap-2 shrink-0">
                  <Label
                    htmlFor={`${owner}-bullet-${loan.id}`}
                    className="text-xs cursor-pointer text-amber-800"
                  >
                    משוטפת
                  </Label>
                  <Checkbox
                    id={`${owner}-bullet-${loan.id}`}
                    checked={loan.isBullet}
                    onCheckedChange={(checked) =>
                      updateBulletLoan(owner, loan.id, {
                        isBullet: checked === true,
                        bulletOrder: checked ? loan.bulletOrder ?? nextBulletDisplayOrder(userData) : undefined,
                      })
                    }
                  />
                  {bulletLoans.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBulletLoan(owner, loan.id)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                      aria-label="הסר הלוואה משוטפת"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ul>

        <motion.p layout className="text-right text-base font-bold text-amber-900 pt-2 border-t border-amber-100">
          סה״כ החזר משוטף: ₪{totalBulletPayment.toLocaleString()}
        </motion.p>
      </motion.div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addBulletLoan}
        className="w-full border-dashed border-amber-300 text-amber-900 hover:bg-amber-100/50"
      >
        <Plus className="w-4 h-4 ml-2" />
        הוסף הלוואה משוטפת נוספת
      </Button>
    </motion.div>
  );
}
