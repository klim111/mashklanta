'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calculator, TrendingUp } from 'lucide-react';
import type { Loan, LoanPlannerState } from './types';
import { LoanCard } from './LoanCard';
import { AmortTable } from './AmortTable';
import { ComparePanel } from './ComparePanel';
import { OptimizePanel } from './OptimizePanel';

const STORAGE_KEY = 'consumer-loans-state';

const defaultLoan: Omit<Loan, 'id'> = {
  name: 'הלוואה חדשה',
  principal: 100000,
  apr: 12,
  months: 36,
};

export function LoanPlanner() {
  const [state, setState] = useState<LoanPlannerState>({
    loans: [],
    selectedForComparison: [],
    optimizationInput: {},
  });
  
  const [showAmortTable, setShowAmortTable] = useState<Loan | null>(null);

  // טעינה משמירה מקומית
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedState = JSON.parse(saved);
        setState(parsedState);
      }
    } catch (error) {
      console.error('שגיאה בטעינת נתונים מקומיים:', error);
    }
  }, []);

  // שמירה מקומית
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('שגיאה בשמירת נתונים מקומיים:', error);
    }
  }, [state]);

  const addLoan = () => {
    const newLoan: Loan = {
      ...defaultLoan,
      id: `loan-${Date.now()}`,
      name: `הלוואה ${state.loans.length + 1}`,
    };
    
    setState(prev => ({
      ...prev,
      loans: [...prev.loans, newLoan],
    }));
  };

  const updateLoan = (updatedLoan: Loan) => {
    setState(prev => ({
      ...prev,
      loans: prev.loans.map(loan => 
        loan.id === updatedLoan.id ? updatedLoan : loan
      ),
    }));
  };

  const deleteLoan = (id: string) => {
    setState(prev => ({
      ...prev,
      loans: prev.loans.filter(loan => loan.id !== id),
      selectedForComparison: prev.selectedForComparison.filter(selectedId => selectedId !== id),
    }));
  };

  const duplicateLoan = (loan: Loan) => {
    const newLoan: Loan = {
      ...loan,
      id: `loan-${Date.now()}`,
      name: `${loan.name} (עותק)`,
    };
    
    setState(prev => ({
      ...prev,
      loans: [...prev.loans, newLoan],
    }));
  };

  const toggleLoanSelection = (id: string) => {
    setState(prev => ({
      ...prev,
      selectedForComparison: prev.selectedForComparison.includes(id)
        ? prev.selectedForComparison.filter(selectedId => selectedId !== id)
        : [...prev.selectedForComparison, id],
    }));
  };

  const clearSelection = () => {
    setState(prev => ({
      ...prev,
      selectedForComparison: [],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            מתכנן הלוואות צרכניות והשוואות
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            כלי מתקדם לתכנון, השוואה ואופטימיזציה של הלוואות צרכניות עם חישובי אנונה מדויקים
          </p>
        </div>

        <Tabs defaultValue="loans" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="loans" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              ניהול הלוואות
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              השוואה
            </TabsTrigger>
            <TabsTrigger value="optimize" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              שילובים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loans" className="space-y-6">
            {/* כפתור הוספת הלוואה */}
            <div className="text-center">
              <Button onClick={addLoan} className="px-6 py-3">
                <Plus className="h-5 w-5 ml-2" />
                הוסף הלוואה חדשה
              </Button>
            </div>

            {/* רשימת הלוואות */}
            {state.loans.length === 0 ? (
              <div className="text-center py-12">
                <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  אין הלוואות במערכת
                </h3>
                <p className="text-gray-500 mb-6">
                  התחל על ידי הוספת ההלוואה הראשונה שלך
                </p>
                <Button onClick={addLoan} className="px-6 py-3">
                  <Plus className="h-5 w-5 ml-2" />
                  הוסף הלוואה ראשונה
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {state.loans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    onUpdate={updateLoan}
                    onDelete={deleteLoan}
                    onDuplicate={duplicateLoan}
                    onShowAmortization={setShowAmortTable}
                    isSelected={state.selectedForComparison.includes(loan.id)}
                    onToggleSelect={toggleLoanSelection}
                  />
                ))}
              </div>
            )}

            {/* הסבר על בחירת הלוואות להשוואה */}
            {state.loans.length > 1 && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  💡 לחץ על שם ההלוואה כדי לבחור אותה להשוואה. 
                  נבחרו {state.selectedForComparison.length} הלוואות להשוואה.
                </p>
                
                {/* כפתורי פעולה מהירה כאשר נבחרו 2+ הלוואות */}
                {state.selectedForComparison.length >= 2 && (
                  <div className="mt-4 flex justify-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // מעבר לטאב השוואה
                        const tabsList = document.querySelector('[role="tablist"]');
                        const compareTab = tabsList?.querySelector('[value="compare"]') as HTMLElement;
                        compareTab?.click();
                      }}
                      className="flex items-center gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      הצג סיכום
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]');
                        const compareTab = tabsList?.querySelector('[value="compare"]') as HTMLElement;
                        compareTab?.click();
                      }}
                      className="flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      איחוד הלוואות
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]');
                        const compareTab = tabsList?.querySelector('[value="compare"]') as HTMLElement;
                        compareTab?.click();
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      פרעון מוקדם
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare">
            <ComparePanel
              loans={state.loans}
              selectedIds={state.selectedForComparison}
              onClearSelection={clearSelection}
            />
          </TabsContent>

          <TabsContent value="optimize">
            <OptimizePanel loans={state.loans} />
          </TabsContent>
        </Tabs>

        {/* מודאל טבלת סילוקין */}
        {showAmortTable && (
          <AmortTable
            loan={showAmortTable}
            onClose={() => setShowAmortTable(null)}
          />
        )}
      </div>
    </div>
  );
}