'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormattedNumberInput } from '@/components/ui/formatted-number-input';
import { Label } from '@/components/ui/label';
import { parseFormattedNumberInput } from '@/lib/currency';
import { getAffordabilityInputs, type MortgagePlanningUserData } from '@/lib/mortgage-affordability';
import type { CoupleBorrowerKey } from '@/lib/borrower-loans';
import {
  fieldErrorClassName,
  fieldErrorsFromList,
  getCoupleFormErrors,
} from '@/lib/mortgage-planning-validation';
import { cn } from '@/lib/utils';
import { BorrowerFieldsColumn } from './BorrowerFieldsColumn';
import { CoupleSharedBulletLoansPanel } from './CoupleSharedBulletLoansPanel';
import { FormSubmitButton } from './FormSubmitButton';
import {
  coupleHasLoanEntries,
  getCoupleBulletLoans,
  nextBulletDisplayOrder,
} from '@/lib/borrower-loans';
import { LoanManagementOffer } from './LoanManagementOffer';

interface CouplePersonalInfoFormProps {
  userData: MortgagePlanningUserData;
  onUserDataChange: (data: MortgagePlanningUserData) => void;
  onBack: () => void;
  onContinue: () => void;
  continueLabel?: string;
  subtitle?: string;
}

export function CouplePersonalInfoForm({
  userData,
  onUserDataChange,
  onBack,
  onContinue,
  continueLabel = 'הצג אפשרויות משכנתא',
  subtitle,
}: CouplePersonalInfoFormProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const aggregated = getAffordabilityInputs(userData);
  const updateBorrower = (
    key: CoupleBorrowerKey,
    updates: Partial<MortgagePlanningUserData['borrower1']>
  ) => {
    onUserDataChange({
      ...userData,
      [key]: { ...userData[key], ...updates },
    });
  };

  const updateBorrowerLoans = (key: CoupleBorrowerKey, loans: MortgagePlanningUserData['borrower1']['loans']) => {
    updateBorrower(key, { loans });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-5xl mx-auto"
    >
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">בוא נכיר — זוג</h2>
        <p className="text-lg text-gray-600 mb-4">
          {subtitle ?? 'הזינו את נתוני שני הלווים לחישוב משוקלל של יכולת ההחזר'}
        </p>
        <motion.div layout className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            משכנתא לזוג משתלמת יותר — הבנקים נותנים לרוב ריביות אטרקטיביות יותר לזוגות בזכות פיזור הסיכון
          </span>
        </motion.div>
      </div>

      <motion.div layout className="space-y-8">
        <motion.div layout className="max-w-md mx-auto">
          <Label htmlFor="familyOwnCapital" className="text-right block mb-2 text-lg font-medium">
            הון עצמי של המשפחה
          </Label>
          <FormattedNumberInput
            id="familyOwnCapital"
            placeholder="₪"
            value={userData.ownCapital}
            onValueChange={(value) => onUserDataChange({ ...userData, ownCapital: value })}
            className={cn(
              'text-right text-lg p-4',
              fieldErrors.familyOwnCapital && fieldErrorClassName
            )}
          />
        </motion.div>

        <motion.div layout className="grid md:grid-cols-2 gap-6 items-start">
          <BorrowerFieldsColumn
            title="לווה 1"
            borrower={userData.borrower1}
            borrowerKey="borrower1"
            fieldErrors={fieldErrors}
            showBulletToggle
            coupleColumnMode
            getNextBulletOrder={() => nextBulletDisplayOrder(userData)}
            onChange={(updates) => updateBorrower('borrower1', updates)}
          />
          <BorrowerFieldsColumn
            title="לווה 2"
            borrower={userData.borrower2}
            borrowerKey="borrower2"
            fieldErrors={fieldErrors}
            showBulletToggle
            coupleColumnMode
            getNextBulletOrder={() => nextBulletDisplayOrder(userData)}
            onChange={(updates) => updateBorrower('borrower2', updates)}
          />

          {getCoupleBulletLoans(userData).length > 0 && (
            <CoupleSharedBulletLoansPanel
              userData={userData}
              fieldErrors={fieldErrors}
              onUpdateBorrowerLoans={updateBorrowerLoans}
            />
          )}
        </motion.div>

        {coupleHasLoanEntries(userData.borrower1, userData.borrower2) && (
          <LoanManagementOffer
            userData={userData}
            mode="couple"
            planningStep="personal-info-couple"
            onUserDataChange={onUserDataChange}
          />
        )}

        {(userData.borrower1.monthlyIncome || userData.borrower2.monthlyIncome) && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-5">
              <h3 className="text-lg font-bold text-blue-900 mb-3 text-center">סיכום נתונים מצרפיים</h3>
              <motion.div layout className="grid sm:grid-cols-2 gap-3 text-sm text-blue-900">
                <p>
                  <span className="font-semibold">סה״כ הכנסה חודשית:</span>{' '}
                  ₪{aggregated.income.toLocaleString()}
                </p>
                <p>
                  <span className="font-semibold">סה״כ החזרי הלוואות:</span>{' '}
                  ₪{aggregated.loanPayment.toLocaleString()}
                </p>
                <p>
                  <span className="font-semibold">הכנסה פנויה משפחתית:</span>{' '}
                  ₪{aggregated.disposableIncome.toLocaleString()}
                </p>
                <p>
                  <span className="font-semibold">גיל לחישוב תקופה (הצעיר):</span>{' '}
                  {aggregated.age || '—'}
                </p>
                {userData.ownCapital && (
                  <p className="sm:col-span-2">
                    <span className="font-semibold">הון עצמי משפחתי:</span>{' '}
                    ₪{parseFormattedNumberInput(userData.ownCapital).toLocaleString()}
                  </p>
                )}
              </motion.div>
            </CardContent>
          </Card>
        )}

        <motion.div layout className="flex gap-4 justify-center pt-4">
          <Button variant="outline" onClick={onBack} className="px-6 py-3">
            <ArrowRight className="w-5 h-5 mr-2" />
            חזור
          </Button>
          <FormSubmitButton
            label={continueLabel}
            errors={getCoupleFormErrors(userData)}
            onInvalidAttempt={() =>
              setFieldErrors(fieldErrorsFromList(getCoupleFormErrors(userData)))
            }
            onValidClick={onContinue}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
