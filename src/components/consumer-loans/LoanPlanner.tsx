'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calculator, TrendingUp, Merge, PiggyBank, GripVertical } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Loan, LoanPlannerState } from './types';
import { LoanCard } from './LoanCard';
import { AmortTable } from './AmortTable';
import { ComparePanel } from './ComparePanel';
import { OptimizePanel } from './OptimizePanel';
import { LoanPlanningImportWizard } from './LoanPlanningImportWizard';
import {
  clearConsumerLoansImportSession,
  readConsumerLoansImportSession,
} from '@/lib/consumer-loans-import';

// Component for droppable zones
function DroppableZone({ id, children, className = '' }: { 
  id: string; 
  children: React.ReactNode; 
  className?: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`${className} ${isOver ? 'bg-blue-100 border-2 border-blue-300 border-dashed rounded-lg' : ''} transition-all duration-200`}
    >
      {children}
    </div>
  );
}

const STORAGE_KEY = 'consumer-loans-state';

const defaultLoan: Omit<Loan, 'id'> = {
  name: 'הלוואה חדשה',
  principal: 100000,
  apr: 12,
  months: 36,
};

export function LoanPlanner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoanPlannerState>({
    loans: [],
    selectedForComparison: [],
    optimizationInput: {},
  });
  
  const [showAmortTable, setShowAmortTable] = useState<Loan | null>(null);
  const [activeCompareAction, setActiveCompareAction] = useState<'summary' | 'consolidation' | 'prepayment' | null>(null);
  const [activeTab, setActiveTab] = useState('loans');
  const [draggedLoan, setDraggedLoan] = useState<Loan | null>(null);
  const [importSession, setImportSession] = useState<ReturnType<
    typeof readConsumerLoansImportSession
  >>(null);
  const [importChecked, setImportChecked] = useState(false);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const finishPlanningImport = useCallback((importedLoans: Loan[]) => {
    setState((prev) => ({
      ...prev,
      loans: [...prev.loans, ...importedLoans],
    }));
    clearConsumerLoansImportSession();
    setImportSession(null);
    setActiveTab('loans');
  }, []);

  const cancelPlanningImport = useCallback(() => {
    clearConsumerLoansImportSession();
    setImportSession(null);
  }, []);

  // טעינה משמירה מקומית + אשף ייבוא ממסך ההכרות
  useEffect(() => {
    try {
      const fromPlanning = searchParams.get('import') === 'planning';
      const session = fromPlanning ? readConsumerLoansImportSession() : null;

      if (session) {
        setImportSession(session);
        setImportChecked(true);
        return;
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedState = JSON.parse(saved);
        setState(parsedState);
      }
    } catch (error) {
      console.error('שגיאה בטעינת נתונים מקומיים:', error);
    } finally {
      setImportChecked(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (importSession) {
      setActiveTab('loans');
    }
  }, [importSession]);

  // שמירה מקומית (לא במהלך אשף הייבוא)
  useEffect(() => {
    if (importSession) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('שגיאה בשמירת נתונים מקומיים:', error);
    }
  }, [state, importSession]);

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

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const loanId = event.active.id as string;
    const loan = state.loans.find(l => l.id === loanId);
    setDraggedLoan(loan || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedLoan(null);
    
    if (!over) return;

    const loanId = active.id as string;
    const dropZone = over.id as string;
    
    // Add loan to selection if not already selected
    if (!state.selectedForComparison.includes(loanId)) {
      setState(prev => ({
        ...prev,
        selectedForComparison: [...prev.selectedForComparison, loanId],
      }));
    }
    
    // Handle different drop zones
    switch (dropZone) {
      case 'compare-tab':
        setActiveTab('compare');
        break;
      case 'summary-action':
        setActiveCompareAction('summary');
        setActiveTab('compare');
        break;
      case 'consolidation-action':
        setActiveCompareAction('consolidation');
        setActiveTab('compare');
        break;
      case 'prepayment-action':
        setActiveCompareAction('prepayment');
        setActiveTab('compare');
        break;
    }
  };

  // Handle manual tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:text-4xl">
              מתכנן הלוואות צרכניות והשוואות
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              כלי מתקדם לתכנון, השוואה ואופטימיזציה של הלוואות צרכניות עם חישובי אנונה מדויקים
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-8 grid h-auto w-full grid-cols-3 gap-1 p-1">
            <TabsTrigger value="loans" className="flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[11px] sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
              <Calculator className="h-4 w-4 shrink-0" />
              <span className="leading-tight">ניהול הלוואות</span>
            </TabsTrigger>
            <DroppableZone id="compare-tab" className="flex-1 min-w-0">
              <TabsTrigger value="compare" className="flex min-w-0 w-full flex-col items-center gap-1 px-1 py-2 text-[11px] sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
                <TrendingUp className="h-4 w-4 shrink-0" />
                <span className="leading-tight">השוואה</span>
                {state.selectedForComparison.length > 0 && (
                  <span className="bg-blue-500 text-white rounded-full px-2 py-1 text-xs">
                    {state.selectedForComparison.length}
                  </span>
                )}
                {draggedLoan && (
                  <span className="text-xs text-green-600">← שחרר כאן</span>
                )}
              </TabsTrigger>
            </DroppableZone>
            <TabsTrigger value="optimize" className="flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[11px] sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="leading-tight">שילובים</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loans" className="space-y-6">
            {importSession && (
              <LoanPlanningImportWizard
                loans={importSession.loans}
                onComplete={finishPlanningImport}
                onCancel={cancelPlanningImport}
              />
            )}

            {!importSession && importChecked && (
              <>
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
                  💡 לחץ על שם ההלוואה כדי לבחור אותה להשוואה או גרור באמצעות הידית <GripVertical className="inline h-4 w-4" /> לכרטיסיית השוואה או לכפתורי הפעולה. 
                  נבחרו {state.selectedForComparison.length} הלוואות להשוואה.
                </p>
                {draggedLoan && (
                  <p className="text-sm text-green-700 mt-2">
                    🎯 גורר את "{draggedLoan.name}" - שחרר על כרטיסיית השוואה או כפתור פעולה
                  </p>
                )}
                
                {/* כפתורי פעולה מהירה כאשר נבחרו 2+ הלוואות */}
                {state.selectedForComparison.length >= 2 && (
                  <div className="mt-4 flex justify-center gap-3">
                    <DroppableZone id="summary-action" className="rounded-lg p-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setActiveCompareAction('summary');
                          setActiveTab('compare');
                        }}
                        className="flex items-center gap-2 relative"
                      >
                        <Calculator className="h-4 w-4" />
                        הצג סיכום
                        {draggedLoan && (
                          <span className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                            ↓
                          </span>
                        )}
                      </Button>
                    </DroppableZone>
                    <DroppableZone id="consolidation-action" className="rounded-lg p-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setActiveCompareAction('consolidation');
                          setActiveTab('compare');
                        }}
                        className="flex items-center gap-2 relative"
                      >
                        <Merge className="h-4 w-4" />
                        איחוד הלוואות
                        {draggedLoan && (
                          <span className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                            ↓
                          </span>
                        )}
                      </Button>
                    </DroppableZone>
                    <DroppableZone id="prepayment-action" className="rounded-lg p-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setActiveCompareAction('prepayment');
                          setActiveTab('compare');
                        }}
                        className="flex items-center gap-2 relative"
                      >
                        <PiggyBank className="h-4 w-4" />
                        פרעון מוקדם
                        {draggedLoan && (
                          <span className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                            ↓
                          </span>
                        )}
                      </Button>
                    </DroppableZone>
                  </div>
                )}
                
                {/* הוראות גרירה כאשר יש הלוואות אבל אין בחירה */}
                {state.selectedForComparison.length < 2 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">
                      🖱️ גרור הלוואות לכרטיסיית השוואה או בחר לפחות 2 הלוואות כדי להציג כפתורי פעולה
                    </p>
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </TabsContent>

          <TabsContent value="compare">
            <ComparePanel
              loans={state.loans}
              selectedIds={state.selectedForComparison}
              onClearSelection={clearSelection}
              activeAction={activeCompareAction}
              onActionComplete={() => setActiveCompareAction(null)}
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

      {/* Drag overlay */}
      <DragOverlay>
        {draggedLoan ? (
          <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-blue-300 opacity-90">
            <h4 className="font-semibold">{draggedLoan.name}</h4>
            <p className="text-sm text-gray-600">גרור לכרטיסיית השוואה או לכפתור פעולה</p>
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
}