'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Calculator, AlertCircle } from 'lucide-react';
import type { Loan, OptimizationInput, Objective } from './types';
import { findBestPlan } from './optimizer';
import { calculateLoanSummary } from './loanMath';
import { formatILS, formatNumber } from '@/lib/currency';

interface OptimizePanelProps {
  loans: Loan[];
}

export function OptimizePanel({ loans }: OptimizePanelProps) {
  const [optimizationInput, setOptimizationInput] = useState<Partial<OptimizationInput>>({
    existingLoans: loans,
    cashAvailable: 0,
    upcomingExpense: 0,
    newLoanAPR: 12,
    candidateTerms: [12, 24, 36, 48, 60, 72, 84],
    objective: 'minTotalInterest',
    budgetMonthly: undefined,
  });
  
  const [result, setResult] = useState<ReturnType<typeof findBestPlan> | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    if (loans.length === 0) {
      alert('אין הלוואות לאופטימיזציה');
      return;
    }

    setIsCalculating(true);
    
    try {
      // הכנת הקלט
      const input: OptimizationInput = {
        existingLoans: loans,
        cashAvailable: optimizationInput.cashAvailable || 0,
        upcomingExpense: optimizationInput.upcomingExpense || 0,
        newLoanAPR: optimizationInput.newLoanAPR || 12,
        candidateTerms: optimizationInput.candidateTerms || [12, 24, 36, 48, 60, 72, 84],
        objective: optimizationInput.objective || 'minTotalInterest',
        budgetMonthly: optimizationInput.budgetMonthly,
      };
      
      const optimization = findBestPlan(input);
      setResult(optimization);
    } catch (error) {
      console.error('שגיאה בחישוב האופטימיזציה:', error);
      alert('שגיאה בחישוב האופטימיזציה');
    } finally {
      setIsCalculating(false);
    }
  };

  const updateInput = (field: keyof OptimizationInput, value: any) => {
    setOptimizationInput(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="p-6" dir="rtl">
      <h3 className="text-xl font-bold mb-6">מודול שילובים ואופטימיזציה</h3>
      
      {loans.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">הוסף הלוואות כדי להשתמש במודול האופטימיזציה</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* פרמטרי קלט */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="cash-available">מזומן זמין (₪)</Label>
                <Input
                  id="cash-available"
                  type="number"
                  value={optimizationInput.cashAvailable || ''}
                  onChange={(e) => updateInput('cashAvailable', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="upcoming-expense">הוצאה צפויה (₪)</Label>
                <Input
                  id="upcoming-expense"
                  type="number"
                  value={optimizationInput.upcomingExpense || ''}
                  onChange={(e) => updateInput('upcomingExpense', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="new-loan-apr">ריבית להלוואה חדשה/איחוד (%)</Label>
                <Input
                  id="new-loan-apr"
                  type="number"
                  step="0.1"
                  value={optimizationInput.newLoanAPR || ''}
                  onChange={(e) => updateInput('newLoanAPR', parseFloat(e.target.value) || 12)}
                  placeholder="12"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="budget-monthly">תקציב חודשי מקסימלי (₪) - אופציונלי</Label>
                <Input
                  id="budget-monthly"
                  type="number"
                  value={optimizationInput.budgetMonthly || ''}
                  onChange={(e) => updateInput('budgetMonthly', parseFloat(e.target.value) || undefined)}
                  placeholder="ללא הגבלה"
                />
              </div>
              
              <div>
                <Label>מטרת אופטימיזציה</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="objective"
                      checked={optimizationInput.objective === 'minTotalInterest'}
                      onChange={() => updateInput('objective', 'minTotalInterest')}
                    />
                    <span>מינימום סך ריבית</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="objective"
                      checked={optimizationInput.objective === 'minMonthly'}
                      onChange={() => updateInput('objective', 'minMonthly')}
                    />
                    <span>מינימום החזר חודשי</span>
                  </label>
                </div>
              </div>
              
              <div>
                <Label>תקופות מועמדות (חודשים)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[12, 24, 36, 48, 60, 72, 84].map(term => (
                    <label key={term} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={optimizationInput.candidateTerms?.includes(term) ?? true}
                        onChange={(e) => {
                          const current = optimizationInput.candidateTerms || [12, 24, 36, 48, 60, 72, 84];
                          const updated = e.target.checked
                            ? [...current, term].sort((a, b) => a - b)
                            : current.filter(t => t !== term);
                          updateInput('candidateTerms', updated);
                        }}
                      />
                      <span className="text-sm">{term}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* כפתור חישוב */}
          <div className="text-center">
            <Button 
              onClick={handleCalculate} 
              disabled={isCalculating}
              className="px-8 py-3"
            >
              <Calculator className="h-5 w-5 ml-2" />
              {isCalculating ? 'מחשב...' : 'חשב תרחיש משתלם'}
            </Button>
          </div>

          {/* תוצאות */}
          {result && (
            <div className="space-y-6">
              <div className="border-t pt-6">
                <h4 className="text-lg font-bold mb-4">תוצאות האופטימיזציה</h4>
                
                {/* אזהרת חריגה מתקציב */}
                {result.budgetExceeded && (
                  <Card className="p-4 bg-yellow-50 border-yellow-200 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <h5 className="font-bold text-yellow-800">אזהרה: חריגה מתקציב</h5>
                    </div>
                    <p className="text-sm text-yellow-700">
                      אף אחד מהתרחישים לא עומד בתקציב החודשי שהוגדר של {formatILS(optimizationInput.budgetMonthly || 0)}.
                      מוצגים התרחישים הקרובים ביותר לתקציב.
                    </p>
                  </Card>
                )}

                {/* התרחיש המנצח */}
                <Card className={`p-4 mb-4 ${result.budgetExceeded ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {result.budgetExceeded ? (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    )}
                    <h5 className={`font-bold ${result.budgetExceeded ? 'text-yellow-800' : 'text-green-800'}`}>
                      {result.budgetExceeded ? 'התרחיש הקרוב ביותר לתקציב' : 'התרחיש המומלץ'}
                    </h5>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">החזר חודשי כולל</div>
                      <div className="font-bold text-lg">{formatILS(result.best.totalMonthlyPayment)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">סך ריבית</div>
                      <div className="font-bold text-lg text-red-600">{formatILS(result.best.totalInterest)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">סך תשלומים</div>
                      <div className="font-bold text-lg">{formatILS(result.best.totalPaid)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">זמן סיום</div>
                      <div className="font-bold text-lg">{result.best.weightedEndTime} חודשים</div>
                    </div>
                  </div>
                  
                  <div className={`text-sm p-3 rounded ${
                    result.budgetExceeded 
                      ? 'text-yellow-700 bg-yellow-100' 
                      : 'text-green-700 bg-green-100'
                  }`}>
                    <strong>{result.best.description}</strong>
                    <br />
                    {result.reason}
                  </div>
                  
                  {/* פירוט ההלוואות בתרחיש המנצח */}
                  <div className="mt-4">
                    <h6 className="font-semibold mb-2">הלוואות בתרחיש:</h6>
                    <div className="space-y-2">
                      {result.best.loans.map((loan, index) => (
                        <div key={index} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                          <span>{loan.name}</span>
                          <span>{formatILS(loan.principal)} • {loan.apr}% • {loan.months} חודשים</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* השוואת תרחישים */}
                <Tabs defaultValue="comparison" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="comparison">השוואת תרחישים</TabsTrigger>
                    <TabsTrigger value="details">פירוט מלא</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="comparison" className="space-y-4">
                    {optimizationInput.budgetMonthly && (
                      <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                        💡 תקציב חודשי מוגדר: {formatILS(optimizationInput.budgetMonthly)}. 
                        תרחישים החורגים מהתקציב מסומנים באדום.
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="p-3 text-right">תרחיש</th>
                            <th className="p-3 text-right">
                              החזר חודשי
                              {optimizationInput.budgetMonthly && (
                                <div className="text-xs font-normal text-gray-500">
                                  (תקציב: {formatILS(optimizationInput.budgetMonthly)})
                                </div>
                              )}
                            </th>
                            <th className="p-3 text-right">סך ריבית</th>
                            <th className="p-3 text-right">סך תשלומים</th>
                            <th className="p-3 text-right">זמן סיום</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.compared.map((scenario, index) => {
                            const exceedsBudget = optimizationInput.budgetMonthly && 
                              scenario.totalMonthlyPayment > optimizationInput.budgetMonthly;
                            
                            return (
                              <tr 
                                key={index} 
                                className={`border-b ${
                                  scenario === result.best 
                                    ? result.budgetExceeded 
                                      ? 'bg-yellow-50 font-semibold' 
                                      : 'bg-green-50 font-semibold'
                                    : exceedsBudget 
                                      ? 'bg-red-50 text-gray-500' 
                                      : 'hover:bg-gray-50'
                                }`}
                              >
                                <td className="p-3">
                                  {scenario === result.best && (
                                    result.budgetExceeded ? (
                                      <AlertCircle className="h-4 w-4 text-yellow-600 inline ml-1" />
                                    ) : (
                                      <TrendingUp className="h-4 w-4 text-green-600 inline ml-1" />
                                    )
                                  )}
                                  {exceedsBudget && scenario !== result.best && (
                                    <TrendingDown className="h-4 w-4 text-red-500 inline ml-1" />
                                  )}
                                  {scenario.description}
                                  {exceedsBudget && (
                                    <span className="text-xs text-red-500 mr-2">(חורג מתקציב)</span>
                                  )}
                                </td>
                                <td className={`p-3 ${exceedsBudget ? 'text-red-500 font-semibold' : ''}`}>
                                  {formatILS(scenario.totalMonthlyPayment)}
                                </td>
                                <td className="p-3">{formatILS(scenario.totalInterest)}</td>
                                <td className="p-3">{formatILS(scenario.totalPaid)}</td>
                                <td className="p-3">{scenario.weightedEndTime} חודשים</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {optimizationInput.budgetMonthly && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                        <strong>סיכום תקציב:</strong>
                        {(() => {
                          const withinBudget = result.compared.filter(s => 
                            s.totalMonthlyPayment <= (optimizationInput.budgetMonthly || 0)
                          ).length;
                          const total = result.compared.length;
                          return (
                            <span className="mr-2">
                              {withinBudget} מתוך {total} תרחישים עומדים בתקציב החודשי
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="details" className="space-y-4">
                    {result.best.cashAllocation && Object.keys(result.best.cashAllocation).length > 0 && (
                      <Card className="p-4">
                        <h5 className="font-semibold mb-3">הקצאת מזומן (שיטת Avalanche)</h5>
                        <div className="space-y-2">
                          {Object.entries(result.best.cashAllocation).map(([loanId, amount]) => {
                            const originalLoan = loans.find(l => l.id === loanId);
                            return (
                              <div key={loanId} className="flex justify-between items-center text-sm">
                                <span>{originalLoan?.name || loanId}</span>
                                <span className="font-semibold">{formatILS(amount)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                    
                    <Card className="p-4">
                      <h5 className="font-semibold mb-3">השוואה עם המצב הנוכחי</h5>
                      {(() => {
                        // חישוב המצב הנוכחי
                        const currentState = {
                          totalMonthlyPayment: loans.reduce((sum, loan) => {
                            const summary = calculateLoanSummary(loan);
                            return sum + summary.monthlyPayment;
                          }, 0),
                          totalInterest: loans.reduce((sum, loan) => {
                            const summary = calculateLoanSummary(loan);
                            return sum + summary.totalInterest;
                          }, 0),
                          totalPaid: loans.reduce((sum, loan) => {
                            const summary = calculateLoanSummary(loan);
                            return sum + summary.totalPaid;
                          }, 0),
                        };

                        // חישוב השינויים
                        const monthlyChange = result.best.totalMonthlyPayment - currentState.totalMonthlyPayment;
                        const interestChange = result.best.totalInterest - currentState.totalInterest;
                        const totalChange = result.best.totalPaid - currentState.totalPaid;

                        return (
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <div className="text-sm text-gray-600">החזר חודשי</div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{formatILS(result.best.totalMonthlyPayment)}</span>
                                  <span className={`text-sm ${monthlyChange > 0 ? 'text-red-600' : monthlyChange < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {monthlyChange > 0 ? `+${formatILS(monthlyChange)}` : monthlyChange < 0 ? `${formatILS(monthlyChange)}` : 'ללא שינוי'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">נוכחי: {formatILS(currentState.totalMonthlyPayment)}</div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-600">סך הריבית</div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{formatILS(result.best.totalInterest)}</span>
                                  <span className={`text-sm ${interestChange > 0 ? 'text-red-600' : interestChange < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {interestChange > 0 ? `+${formatILS(interestChange)}` : interestChange < 0 ? `${formatILS(interestChange)}` : 'ללא שינוי'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">נוכחי: {formatILS(currentState.totalInterest)}</div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <div className="text-sm text-gray-600">סך התשלומים</div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{formatILS(result.best.totalPaid)}</span>
                                  <span className={`text-sm ${totalChange > 0 ? 'text-red-600' : totalChange < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {totalChange > 0 ? `+${formatILS(totalChange)}` : totalChange < 0 ? `${formatILS(totalChange)}` : 'ללא שינוי'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">נוכחי: {formatILS(currentState.totalPaid)}</div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-600">מספר הלוואות</div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{result.best.loans.length}</span>
                                  <span className="text-sm text-gray-500">
                                    (נוכחי: {loans.length})
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}