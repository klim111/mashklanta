'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatILS } from '@/lib/currency';
import type { PlanningLoanImportItem } from '@/lib/consumer-loans-import';
import type { Loan } from './types';
import { principalFromAnnuityPayment } from './loanMath';

const highlightFieldClass =
  'ring-2 ring-amber-400 border-amber-400 bg-amber-50/80 focus-visible:ring-amber-500';

interface LoanPlanningImportWizardProps {
  loans: PlanningLoanImportItem[];
  onComplete: (loans: Loan[]) => void;
  onCancel: () => void;
}

export function LoanPlanningImportWizard({
  loans,
  onComplete,
  onCancel,
}: LoanPlanningImportWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [apr, setApr] = useState('');
  const [months, setMonths] = useState('');
  const [completedLoans, setCompletedLoans] = useState<Loan[]>([]);
  const aprRef = useRef<HTMLInputElement>(null);

  const currentLoan = loans[currentIndex];
  const parsedApr = parseFloat(apr);
  const parsedMonths = parseInt(months, 10);
  const isStepValid =
    Number.isFinite(parsedApr) &&
    parsedApr > 0 &&
    Number.isFinite(parsedMonths) &&
    parsedMonths > 0;

  const estimatedPrincipal =
    isStepValid && currentLoan
      ? Math.round(principalFromAnnuityPayment(currentLoan.monthlyPayment, parsedApr, parsedMonths))
      : 0;

  useEffect(() => {
    setApr('');
    setMonths('');
    const timer = window.setTimeout(() => aprRef.current?.focus(), 200);
    return () => window.clearTimeout(timer);
  }, [currentIndex]);

  const handleContinue = () => {
    if (!isStepValid || !currentLoan) return;

    const newLoan: Loan = {
      id: `loan-${currentLoan.id}-${Date.now()}`,
      name: currentLoan.label,
      principal: estimatedPrincipal,
      apr: parsedApr,
      months: parsedMonths,
    };

    const nextCompleted = [...completedLoans, newLoan];

    if (currentIndex + 1 >= loans.length) {
      onComplete(nextCompleted);
      return;
    }

    setCompletedLoans(nextCompleted);
    setCurrentIndex((i) => i + 1);
  };

  if (!currentLoan) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6"
    >
      <motion.div layout className="text-center space-y-2">
        <p className="text-sm font-medium text-blue-700 bg-blue-50 inline-block px-4 py-1 rounded-full">
          הלוואה {currentIndex + 1} מתוך {loans.length}
        </p>
        <h2 className="text-2xl font-bold text-gray-900">בוא נשלים את פרטי ההלוואות שלך</h2>
        <p className="text-gray-600 text-sm">
          הזנת במסך ההכרות את ההחזר החודשי — עכשיו מלא את הריבית והתקופה לכל הלוואה, אחת אחרי השנייה.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentLoan.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="p-6 shadow-md border-blue-100" dir="rtl">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">{currentLoan.label}</h3>

            <motion.div layout className="space-y-5">
              <motion.div layout className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                <Label className="text-gray-600 text-sm mb-1 block">החזר חודשי שציינת במסך ההכרות</Label>
                <p className="text-2xl font-bold text-gray-900">{formatILS(currentLoan.monthlyPayment)}</p>
              </motion.div>

              <motion.div layout className="grid sm:grid-cols-2 gap-4">
                <motion.div layout>
                  <Label htmlFor="import-apr" className="mb-2 block font-medium text-amber-900">
                    ריבית שנתית (%) — יש למלא
                  </Label>
                  <Input
                    ref={aprRef}
                    id="import-apr"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="לדוגמה: 8.5"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                    className={highlightFieldClass}
                  />
                </motion.div>
                <motion.div layout>
                  <Label htmlFor="import-months" className="mb-2 block font-medium text-amber-900">
                    תקופה (חודשים) — יש למלא
                  </Label>
                  <Input
                    id="import-months"
                    type="number"
                    min="1"
                    placeholder="לדוגמה: 36"
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                    className={highlightFieldClass}
                  />
                </motion.div>
              </motion.div>

              {isStepValid && estimatedPrincipal > 0 && (
                <motion.p
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-center text-gray-600 bg-green-50 border border-green-100 rounded-lg py-2 px-3"
                >
                  לפי הנתונים שלך, קרן משוערת:{' '}
                  <span className="font-semibold text-green-800">{formatILS(estimatedPrincipal)}</span>
                </motion.p>
              )}

              <Button
                type="button"
                onClick={handleContinue}
                disabled={!isStepValid}
                className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700"
              >
                {currentIndex + 1 >= loans.length ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 ml-2" />
                    סיום והצגת כל ההלוואות
                  </>
                ) : (
                  <>
                    <ArrowLeft className="w-5 h-5 ml-2" />
                    המשך להלוואה הבאה
                  </>
                )}
              </Button>
            </motion.div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {completedLoans.length > 0 && (
        <motion.div layout className="text-center text-sm text-gray-500">
          הושלמו {completedLoans.length} מתוך {loans.length} הלוואות
        </motion.div>
      )}

      <div className="text-center">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-gray-500">
          דלג — אמשיך לבד במתכנן
        </Button>
      </div>
    </motion.div>
  );
}
