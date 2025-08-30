'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, Merge, Calculator, PiggyBank } from 'lucide-react';
import type { Loan } from './types';
import { calculateLoanSummary, buildAmortSchedule } from './loanMath';
import { formatILS } from '@/lib/currency';

interface ComparePanelProps {
  loans: Loan[];
  selectedIds: string[];
  onClearSelection: () => void;
  activeAction?: 'summary' | 'consolidation' | 'prepayment' | null;
  onActionComplete?: () => void;
}

export function ComparePanel({ loans, selectedIds, onClearSelection, activeAction, onActionComplete }: ComparePanelProps) {
  const [showAmortChart, setShowAmortChart] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showConsolidation, setShowConsolidation] = useState(false);
  const [showPrepayment, setShowPrepayment] = useState(false);
  const [consolidationForm, setConsolidationForm] = useState({
    apr: '10',
    months: '60'
  });
  const [prepaymentAmount, setPrepaymentAmount] = useState('');
  
  // Handle activeAction from parent component
  React.useEffect(() => {
    if (activeAction) {
      switch (activeAction) {
        case 'summary':
          setShowSummary(true);
          setShowConsolidation(false);
          setShowPrepayment(false);
          break;
        case 'consolidation':
          setShowSummary(false);
          setShowConsolidation(true);
          setShowPrepayment(false);
          break;
        case 'prepayment':
          setShowSummary(false);
          setShowConsolidation(false);
          setShowPrepayment(true);
          break;
      }
      // Call onActionComplete to reset the activeAction in parent
      onActionComplete?.();
    }
  }, [activeAction, onActionComplete]);
  
  const selectedLoans = loans.filter(loan => selectedIds.includes(loan.id));
  
  if (selectedLoans.length < 2) {
    return (
      <Card className="p-6" dir="rtl">
        <h3 className="text-xl font-bold mb-4">השוואת הלוואות</h3>
        <p className="text-gray-600">
          בחר לפחות 2 הלוואות להשוואה על ידי לחיצה על שמן
        </p>
      </Card>
    );
  }

  const comparisons = selectedLoans.map(loan => {
    const summary = calculateLoanSummary(loan);
    return {
      name: loan.name,
      loan,
      summary,
    };
  });

  // חישוב סיכום כולל של ההלוואות הנבחרות
  const totalSummary = {
    totalMonthlyPayment: comparisons.reduce((sum, comp) => sum + comp.summary.monthlyPayment, 0),
    totalPaid: comparisons.reduce((sum, comp) => sum + comp.summary.totalPaid, 0),
    totalInterest: comparisons.reduce((sum, comp) => sum + comp.summary.totalInterest, 0),
    totalPrincipal: selectedLoans.reduce((sum, loan) => sum + loan.principal, 0)
  };

  // חישוב הלוואה מאוחדת
  const consolidatedLoan: Loan = {
    id: 'consolidated',
    name: 'הלוואה מאוחדת',
    principal: totalSummary.totalPrincipal,
    apr: parseFloat(consolidationForm.apr) || 10,
    months: parseInt(consolidationForm.months) || 60
  };
  const consolidatedSummary = calculateLoanSummary(consolidatedLoan);

  // חישוב הצעת פרעון מוקדם
  const prepaymentSuggestion = (() => {
    if (!prepaymentAmount || parseFloat(prepaymentAmount) <= 0) return null;
    
    const amount = parseFloat(prepaymentAmount);
    
    // מציאת ההלוואה עם הריבית הגבוהה ביותר
    const highestInterestLoan = selectedLoans.reduce((prev, curr) => 
      curr.apr > prev.apr ? curr : prev
    );
    
    // חישוב יתרה לאחר פרעון חלקי/מלא
    const maxPayoff = Math.min(amount, highestInterestLoan.principal);
    const remainingPrincipal = highestInterestLoan.principal - maxPayoff;
    
    let updatedLoan = null;
    if (remainingPrincipal > 0) {
      updatedLoan = {
        ...highestInterestLoan,
        principal: remainingPrincipal
      };
    }
    
    // חישוב הסכומים החדשים
    const otherLoans = selectedLoans.filter(loan => loan.id !== highestInterestLoan.id);
    const updatedLoans = updatedLoan ? [...otherLoans, updatedLoan] : otherLoans;
    
    const newComparisons = updatedLoans.map(loan => ({
      loan,
      summary: calculateLoanSummary(loan)
    }));
    
    const newTotalSummary = {
      totalMonthlyPayment: newComparisons.reduce((sum, comp) => sum + comp.summary.monthlyPayment, 0),
      totalPaid: newComparisons.reduce((sum, comp) => sum + comp.summary.totalPaid, 0),
      totalInterest: newComparisons.reduce((sum, comp) => sum + comp.summary.totalInterest, 0),
      totalPrincipal: updatedLoans.reduce((sum, loan) => sum + loan.principal, 0)
    };
    
    return {
      targetLoan: highestInterestLoan,
      payoffAmount: maxPayoff,
      remainingAmount: amount - maxPayoff,
      updatedLoans,
      newTotalSummary,
      savings: {
        monthlyPayment: totalSummary.totalMonthlyPayment - newTotalSummary.totalMonthlyPayment,
        totalInterest: totalSummary.totalInterest - newTotalSummary.totalInterest,
        totalPaid: totalSummary.totalPaid - newTotalSummary.totalPaid
      }
    };
  })();

  // נתונים לגרף עמודות
  const chartData = comparisons.map(comp => ({
    name: comp.name,
    'החזר חודשי': Math.round(comp.summary.monthlyPayment),
    'סך ריבית': Math.round(comp.summary.totalInterest),
    'סך תשלומים': Math.round(comp.summary.totalPaid),
  }));

  // נתונים לגרף לוח סילוקין משווה
  const getAmortComparisonData = () => {
    if (selectedLoans.length !== 2) return [];
    
    const schedules = selectedLoans.map(loan => ({
      loan,
      schedule: buildAmortSchedule({
        principal: loan.principal,
        apr: loan.apr,
        months: loan.months,
      })
    }));

    const maxMonths = Math.max(...schedules.map(s => s.schedule.monthsActual));
    const data = [];

    for (let month = 1; month <= maxMonths; month++) {
      const dataPoint: any = { month };
      
      schedules.forEach(({ loan, schedule }) => {
        const row = schedule.rows.find(r => r.m === month);
        if (row) {
          dataPoint[`${loan.name} - יתרה`] = Math.round(row.balEnd);
        } else {
          dataPoint[`${loan.name} - יתרה`] = 0;
        }
      });
      
      data.push(dataPoint);
    }

    return data;
  };

  const amortComparisonData = getAmortComparisonData();
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

  return (
    <Card className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">השוואת הלוואות ({selectedLoans.length})</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowSummary(!showSummary)}
            className="flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            {showSummary ? 'הסתר סיכום' : 'הצג סיכום'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowConsolidation(!showConsolidation)}
            className="flex items-center gap-2"
          >
            <Merge className="h-4 w-4" />
            איחוד הלוואות
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowPrepayment(!showPrepayment)}
            className="flex items-center gap-2"
          >
            <PiggyBank className="h-4 w-4" />
            פרעון מוקדם
          </Button>
          {selectedLoans.length === 2 && (
            <Button 
              variant="outline" 
              onClick={() => setShowAmortChart(!showAmortChart)}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {showAmortChart ? 'הסתר גרף סילוקין' : 'הצג גרף סילוקין'}
            </Button>
          )}
          <Button variant="outline" onClick={onClearSelection}>
            נקה בחירה
          </Button>
        </div>
      </div>

      {/* סיכום כולל של ההלוואות הנבחרות */}
      {showSummary && (
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            סיכום ההלוואות הנבחרות
          </h4>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">סך קרן</div>
              <div className="text-lg font-bold text-blue-600">
                {formatILS(totalSummary.totalPrincipal)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">החזר חודשי כולל</div>
              <div className="text-lg font-bold text-green-600">
                {formatILS(totalSummary.totalMonthlyPayment)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">סך ריבית כולל</div>
              <div className="text-lg font-bold text-red-600">
                {formatILS(totalSummary.totalInterest)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">סך תשלומים כולל</div>
              <div className="text-lg font-bold text-gray-700">
                {formatILS(totalSummary.totalPaid)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* איחוד הלוואות */}
      {showConsolidation && (
        <Card className="p-6 mb-6 bg-green-50 border-green-200">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Merge className="h-5 w-5" />
            איחוד הלוואות
          </h4>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold mb-3">פרמטרי ההלוואה המאוחדת</h5>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="consolidation-apr">ריבית שנתית חדשה (%)</Label>
                  <Input
                    id="consolidation-apr"
                    type="number"
                    step="0.1"
                    value={consolidationForm.apr}
                    onChange={(e) => setConsolidationForm(prev => ({ ...prev, apr: e.target.value }))}
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label htmlFor="consolidation-months">תקופה חדשה (חודשים)</Label>
                  <Input
                    id="consolidation-months"
                    type="number"
                    value={consolidationForm.months}
                    onChange={(e) => setConsolidationForm(prev => ({ ...prev, months: e.target.value }))}
                    placeholder="60"
                  />
                </div>
                <div className="p-3 bg-gray-100 rounded">
                  <div className="text-sm text-gray-600">קרן מאוחדת</div>
                  <div className="font-bold">{formatILS(totalSummary.totalPrincipal)}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-semibold mb-3">השוואת עלויות</h5>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-red-100 rounded">
                    <div className="font-semibold text-red-700">הלוואות נפרדות</div>
                    <div>החזר חודשי: {formatILS(totalSummary.totalMonthlyPayment)}</div>
                    <div>סך ריבית: {formatILS(totalSummary.totalInterest)}</div>
                    <div>סך תשלומים: {formatILS(totalSummary.totalPaid)}</div>
                  </div>
                  <div className="p-3 bg-green-100 rounded">
                    <div className="font-semibold text-green-700">הלוואה מאוחדת</div>
                    <div>החזר חודשי: {formatILS(consolidatedSummary.monthlyPayment)}</div>
                    <div>סך ריבית: {formatILS(consolidatedSummary.totalInterest)}</div>
                    <div>סך תשלומים: {formatILS(consolidatedSummary.totalPaid)}</div>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-100 rounded">
                  <div className="font-semibold text-blue-700">חיסכון/הפסד</div>
                  <div className={`${consolidatedSummary.monthlyPayment < totalSummary.totalMonthlyPayment ? 'text-green-600' : 'text-red-600'}`}>
                    החזר חודשי: {formatILS(consolidatedSummary.monthlyPayment - totalSummary.totalMonthlyPayment)}
                  </div>
                  <div className={`${consolidatedSummary.totalInterest < totalSummary.totalInterest ? 'text-green-600' : 'text-red-600'}`}>
                    סך ריבית: {formatILS(consolidatedSummary.totalInterest - totalSummary.totalInterest)}
                  </div>
                  <div className={`${consolidatedSummary.totalPaid < totalSummary.totalPaid ? 'text-green-600' : 'text-red-600'}`}>
                    סך תשלומים: {formatILS(consolidatedSummary.totalPaid - totalSummary.totalPaid)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* פרעון מוקדם */}
      {showPrepayment && (
        <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            פרעון מוקדם
          </h4>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="prepayment-amount">סכום זמין במזומן (₪)</Label>
                  <Input
                    id="prepayment-amount"
                    type="number"
                    value={prepaymentAmount}
                    onChange={(e) => setPrepaymentAmount(e.target.value)}
                    placeholder="הכנס סכום זמין"
                  />
                </div>
                
                {prepaymentAmount && parseFloat(prepaymentAmount) > 0 && (
                  <div className="p-4 bg-blue-100 rounded">
                    <h5 className="font-semibold text-blue-700 mb-2">המלצת המערכת</h5>
                    <p className="text-sm text-blue-600 mb-2">
                      מומלץ לפרוע את "{selectedLoans.reduce((prev, curr) => curr.apr > prev.apr ? curr : prev).name}" 
                      (ריבית {selectedLoans.reduce((prev, curr) => curr.apr > prev.apr ? curr : prev).apr}% - הגבוהה ביותר)
                    </p>
                    <div className="text-sm">
                      <div>סכום פרעון: {formatILS(Math.min(parseFloat(prepaymentAmount), selectedLoans.reduce((prev, curr) => curr.apr > prev.apr ? curr : prev).principal))}</div>
                      {parseFloat(prepaymentAmount) > selectedLoans.reduce((prev, curr) => curr.apr > prev.apr ? curr : prev).principal && (
                        <div>יתרה זמינה: {formatILS(parseFloat(prepaymentAmount) - selectedLoans.reduce((prev, curr) => curr.apr > prev.apr ? curr : prev).principal)}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              {prepaymentAmount && parseFloat(prepaymentAmount) > 0 && (
                <div>
                  <h5 className="font-semibold mb-3">השוואת מצב לאחר פרעון</h5>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-red-100 rounded">
                        <div className="font-semibold text-red-700">לפני פרעון</div>
                        <div>החזר חודשי: {formatILS(totalSummary.totalMonthlyPayment)}</div>
                        <div>סך ריבית: {formatILS(totalSummary.totalInterest)}</div>
                        <div>סך תשלומים: {formatILS(totalSummary.totalPaid)}</div>
                      </div>
                      <div className="p-3 bg-green-100 rounded">
                        <div className="font-semibold text-green-700">אחרי פרעון</div>
                        {(() => {
                          const amount = parseFloat(prepaymentAmount);
                          const highestInterestLoan = selectedLoans.reduce((prev, curr) => curr.apr > prev.apr ? curr : prev);
                          const maxPayoff = Math.min(amount, highestInterestLoan.principal);
                          const remainingPrincipal = highestInterestLoan.principal - maxPayoff;
                          
                          const otherLoans = selectedLoans.filter(loan => loan.id !== highestInterestLoan.id);
                          const updatedLoans = remainingPrincipal > 0 ? 
                            [...otherLoans, { ...highestInterestLoan, principal: remainingPrincipal }] : 
                            otherLoans;
                          
                          const newComparisons = updatedLoans.map(loan => ({
                            loan,
                            summary: calculateLoanSummary(loan)
                          }));
                          
                          const newTotalSummary = {
                            totalMonthlyPayment: newComparisons.reduce((sum, comp) => sum + comp.summary.monthlyPayment, 0),
                            totalPaid: newComparisons.reduce((sum, comp) => sum + comp.summary.totalPaid, 0),
                            totalInterest: newComparisons.reduce((sum, comp) => sum + comp.summary.totalInterest, 0)
                          };
                          
                          return (
                            <>
                              <div>החזר חודשי: {formatILS(newTotalSummary.totalMonthlyPayment)}</div>
                              <div>סך ריבית: {formatILS(newTotalSummary.totalInterest)}</div>
                              <div>סך תשלומים: {formatILS(newTotalSummary.totalPaid)}</div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-100 rounded">
                      <div className="font-semibold text-blue-700">חיסכון כולל</div>
                      {(() => {
                        const amount = parseFloat(prepaymentAmount);
                        const highestInterestLoan = selectedLoans.reduce((prev, curr) => curr.apr > prev.apr ? curr : prev);
                        const maxPayoff = Math.min(amount, highestInterestLoan.principal);
                        const remainingPrincipal = highestInterestLoan.principal - maxPayoff;
                        
                        const otherLoans = selectedLoans.filter(loan => loan.id !== highestInterestLoan.id);
                        const updatedLoans = remainingPrincipal > 0 ? 
                          [...otherLoans, { ...highestInterestLoan, principal: remainingPrincipal }] : 
                          otherLoans;
                        
                        const newComparisons = updatedLoans.map(loan => ({
                          loan,
                          summary: calculateLoanSummary(loan)
                        }));
                        
                        const newTotalSummary = {
                          totalMonthlyPayment: newComparisons.reduce((sum, comp) => sum + comp.summary.monthlyPayment, 0),
                          totalPaid: newComparisons.reduce((sum, comp) => sum + comp.summary.totalPaid, 0),
                          totalInterest: newComparisons.reduce((sum, comp) => sum + comp.summary.totalInterest, 0)
                        };
                        
                        return (
                          <>
                            <div className="text-green-600">
                              החזר חודשי: {formatILS(totalSummary.totalMonthlyPayment - newTotalSummary.totalMonthlyPayment)}
                            </div>
                            <div className="text-green-600">
                              סך ריבית: {formatILS(totalSummary.totalInterest - newTotalSummary.totalInterest)}
                            </div>
                            <div className="text-green-600">
                              סך תשלומים: {formatILS(totalSummary.totalPaid - newTotalSummary.totalPaid)}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {(() => {
                      const amount = parseFloat(prepaymentAmount);
                      const highestInterestLoan = selectedLoans.reduce((prev, curr) => curr.apr > prev.apr ? curr : prev);
                      const maxPayoff = Math.min(amount, highestInterestLoan.principal);
                      const remainingPrincipal = highestInterestLoan.principal - maxPayoff;
                      
                      const otherLoans = selectedLoans.filter(loan => loan.id !== highestInterestLoan.id);
                      const updatedLoans = remainingPrincipal > 0 ? 
                        [...otherLoans, { ...highestInterestLoan, principal: remainingPrincipal }] : 
                        otherLoans;
                      
                      if (updatedLoans.length > 0) {
                        return (
                          <div>
                            <h6 className="font-semibold mb-2">הלוואות שנותרו:</h6>
                            <div className="space-y-2 text-sm">
                              {updatedLoans.map(loan => {
                                const summary = calculateLoanSummary(loan);
                                return (
                                  <div key={loan.id} className="p-2 bg-white rounded border">
                                    <div className="font-medium">{loan.name}</div>
                                    <div className="text-gray-600">
                                      קרן: {formatILS(loan.principal)} | 
                                      החזר: {formatILS(summary.monthlyPayment)} | 
                                      ריבית: {loan.apr}%
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* טבלת השוואה */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-right font-semibold">הלוואה</th>
              <th className="p-3 text-right font-semibold">קרן</th>
              <th className="p-3 text-right font-semibold">ריבית</th>
              <th className="p-3 text-right font-semibold">תקופה</th>
              <th className="p-3 text-right font-semibold">החזר חודשי</th>
              <th className="p-3 text-right font-semibold">סך ריבית</th>
              <th className="p-3 text-right font-semibold">סך תשלומים</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((comp, index) => (
              <tr key={comp.loan.id} className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                <td className="p-3 font-medium">{comp.name}</td>
                <td className="p-3">{formatILS(comp.loan.principal)}</td>
                <td className="p-3">{comp.loan.apr}%</td>
                <td className="p-3">{comp.loan.months} חודשים</td>
                <td className="p-3 font-semibold text-blue-600">
                  {formatILS(comp.summary.monthlyPayment)}
                </td>
                <td className="p-3 font-semibold text-red-600">
                  {formatILS(comp.summary.totalInterest)}
                </td>
                <td className="p-3 font-semibold">
                  {formatILS(comp.summary.totalPaid)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* גרף השוואה מתקדם */}
      <div className="space-y-6">
        <div className="h-80">
          <h4 className="text-lg font-semibold mb-4">השוואה ויזואלית - היבטים כלליים</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [formatILS(value), name]}
                labelStyle={{ direction: 'rtl' }}
              />
              <Legend />
              <Bar dataKey="החזר חודשי" fill="#3b82f6" name="החזר חודשי" />
              <Bar dataKey="סך ריבית" fill="#ef4444" name="סך ריבית" />
              <Bar dataKey="סך תשלומים" fill="#10b981" name="סך תשלומים" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* גרף השוואת לוח סילוקין */}
        {showAmortChart && selectedLoans.length === 2 && (
          <div className="h-96 border-t pt-6">
            <h4 className="text-lg font-semibold mb-4">השוואת קצב החזר - לוח סילוקין</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={amortComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  label={{ value: 'חודש', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                  label={{ value: 'יתרה (₪)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [formatILS(value), name]}
                  labelFormatter={(month) => `חודש ${month}`}
                  labelStyle={{ direction: 'rtl' }}
                />
                <Legend />
                {selectedLoans.map((loan, index) => (
                  <Line 
                    key={loan.id}
                    type="monotone" 
                    dataKey={`${loan.name} - יתרה`}
                    stroke={colors[index % colors.length]} 
                    strokeWidth={3}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* סיכום מהיר */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold mb-2">סיכום השוואה:</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600">החזר חודשי הנמוך ביותר</div>
            <div className="font-semibold">
              {(() => {
                const lowest = comparisons.reduce((prev, curr) => 
                  curr.summary.monthlyPayment < prev.summary.monthlyPayment ? curr : prev
                );
                return `${lowest.name}: ${formatILS(lowest.summary.monthlyPayment)}`;
              })()}
            </div>
          </div>
          <div>
            <div className="text-gray-600">ריבית הנמוכה ביותר</div>
            <div className="font-semibold">
              {(() => {
                const lowest = comparisons.reduce((prev, curr) => 
                  curr.summary.totalInterest < prev.summary.totalInterest ? curr : prev
                );
                return `${lowest.name}: ${formatILS(lowest.summary.totalInterest)}`;
              })()}
            </div>
          </div>
          <div>
            <div className="text-gray-600">תקופה הקצרה ביותר</div>
            <div className="font-semibold">
              {(() => {
                const shortest = comparisons.reduce((prev, curr) => 
                  curr.loan.months < prev.loan.months ? curr : prev
                );
                return `${shortest.name}: ${shortest.loan.months} חודשים`;
              })()}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}