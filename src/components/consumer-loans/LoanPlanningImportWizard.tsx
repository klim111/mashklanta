'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CalendarDays, CheckCircle2, RefreshCcw, Sparkles } from 'lucide-react';
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

type LoanAgeMode = 'past' | 'new';

interface LoanPlanningImportWizardProps {
  loans: PlanningLoanImportItem[];
  onComplete: (loans: Loan[]) => void;
  onCancel: () => void;
}

function getCurrentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthsElapsedFromYearMonth(yearMonth: string): number {
  const [yearStr, monthStr] = yearMonth.split('-');
  const startYear = parseInt(yearStr, 10);
  const startMonth = parseInt(monthStr, 10);
  if (!Number.isFinite(startYear) || !Number.isFinite(startMonth)) return -1;
  const today = new Date();
  return (today.getFullYear() - startYear) * 12 + (today.getMonth() + 1 - startMonth);
}

export function LoanPlanningImportWizard({
  loans,
  onComplete,
  onCancel,
}: LoanPlanningImportWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [apr, setApr] = useState('');
  const [months, setMonths] = useState('');
  const [startDate, setStartDate] = useState(''); // YYYY-MM
  const [ageMode, setAgeMode] = useState<LoanAgeMode>('past');
  const [completedLoans, setCompletedLoans] = useState<Loan[]>([]);
  const aprRef = useRef<HTMLInputElement>(null);

  const currentLoan = loans[currentIndex];
  const parsedApr = parseFloat(apr);
  const parsedMonths = parseInt(months, 10);

  const hasValidApr = Number.isFinite(parsedApr) && parsedApr > 0;
  const hasValidMonths = Number.isFinite(parsedMonths) && parsedMonths > 0;

  const monthsElapsed =
    ageMode === 'past' && startDate ? monthsElapsedFromYearMonth(startDate) : 0;

  const hasValidStartDate =
    ageMode === 'new' ||
    (ageMode === 'past' &&
      startDate.length > 0 &&
      monthsElapsed >= 0 &&
      hasValidMonths &&
      monthsElapsed < parsedMonths);

  const isStepValid = hasValidApr && hasValidMonths && hasValidStartDate;

  const originalPrincipal = useMemo(() => {
    if (!hasValidApr || !hasValidMonths || !currentLoan) return 0;
    return Math.round(
      principalFromAnnuityPayment(currentLoan.monthlyPayment, parsedApr, parsedMonths),
    );
  }, [hasValidApr, hasValidMonths, currentLoan, parsedApr, parsedMonths]);

  const remainingMonths =
    ageMode === 'past' && hasValidMonths
      ? Math.max(0, parsedMonths - Math.max(0, monthsElapsed))
      : parsedMonths;

  const currentBalance = useMemo(() => {
    if (!isStepValid || !currentLoan) return 0;
    if (ageMode === 'new') return originalPrincipal;
    if (remainingMonths <= 0) return 0;
    return Math.round(
      principalFromAnnuityPayment(currentLoan.monthlyPayment, parsedApr, remainingMonths),
    );
  }, [isStepValid, currentLoan, ageMode, originalPrincipal, remainingMonths, parsedApr]);

  useEffect(() => {
    setApr('');
    setMonths('');
    setStartDate('');
    setAgeMode('past');
    const timer = window.setTimeout(() => aprRef.current?.focus(), 200);
    return () => window.clearTimeout(timer);
  }, [currentIndex]);

  const handleContinue = () => {
    if (!isStepValid || !currentLoan) return;

    const newLoan: Loan = {
      id: `loan-${currentLoan.id}-${Date.now()}`,
      name: currentLoan.label,
      principal: ageMode === 'past' ? currentBalance : originalPrincipal,
      apr: parsedApr,
      months: ageMode === 'past' ? remainingMonths : parsedMonths,
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

  const todayYearMonth = getCurrentYearMonth();
  const showLoanPaidOffWarning =
    ageMode === 'past' &&
    startDate.length > 0 &&
    hasValidMonths &&
    monthsElapsed >= parsedMonths;

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
          הזנת במסך ההכרות את ההחזר החודשי — עכשיו מלא את הריבית, התקופה ומתי נלקחה ההלוואה, אחת אחרי השנייה.
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
                    תקופה כוללת (חודשים) — יש למלא
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

              {/* בחירת מצב: הלוואה מהעבר (עם תאריך) לעומת הלוואה חדשה מהיום */}
              <motion.div
                layout
                className="rounded-lg border border-blue-100 bg-blue-50/60 p-4"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {ageMode === 'past' ? (
                    <motion.div
                      key="past"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <Label
                        htmlFor="import-start-date"
                        className="block font-medium text-blue-900"
                      >
                        <CalendarDays className="w-4 h-4 inline ml-1" />
                        מתי נלקחה ההלוואה? — יש למלא
                      </Label>
                      <Input
                        id="import-start-date"
                        type="month"
                        max={todayYearMonth}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={highlightFieldClass}
                      />
                      {showLoanPaidOffWarning && (
                        <p className="text-xs text-red-600">
                          לפי התאריך והתקופה שהוזנו, ההלוואה כבר אמורה להיות סגורה. בדוק שוב.
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-sm text-gray-600">
                          זו הלוואה חדשה שאתה לוקח עכשיו?
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAgeMode('new');
                            setStartDate('');
                          }}
                          className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-100 shrink-0"
                        >
                          <Sparkles className="w-4 h-4" />
                          הלוואה חדשה
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="new"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 text-blue-900 font-medium">
                        <Sparkles className="w-4 h-4" />
                        מחושבת כהלוואה חדשה שנלקחת היום
                      </div>
                      <p className="text-sm text-gray-600">
                        החישוב יתבצע להלוואה מלאה מהיום, ללא חודשי עבר.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAgeMode('past')}
                        className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-100 w-full sm:w-auto"
                      >
                        <RefreshCcw className="w-4 h-4" />
                        חשב הלוואה שנלקחה בעבר
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {isStepValid && originalPrincipal > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg border border-green-100 bg-green-50 py-3 px-4 space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">סכום הלוואה מקורי</span>
                    <span className="font-semibold text-gray-900">
                      {formatILS(originalPrincipal)}
                    </span>
                  </div>
                  {ageMode === 'past' ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">חודשים שעברו</span>
                        <span className="font-semibold text-gray-900">{monthsElapsed}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">חודשים שנותרו</span>
                        <span className="font-semibold text-gray-900">{remainingMonths}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-green-200">
                        <span className="text-green-800 font-medium">יתרת קרן להיום</span>
                        <span className="font-bold text-green-800">
                          {formatILS(currentBalance)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm pt-2 border-t border-green-200">
                      <span className="text-green-800 font-medium">יתרת קרן להיום</span>
                      <span className="font-bold text-green-800">
                        {formatILS(currentBalance)}
                      </span>
                    </div>
                  )}
                </motion.div>
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
