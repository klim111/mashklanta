'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calculator, TrendingUp, PieChart, Home, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { MortgageMix, MortgageAdvisorState } from './types';
import { MortgageMixBuilder } from './MortgageMixBuilder';
import { MortgageMixCard } from './MortgageMixCard';
import { ComparisonPanel } from './ComparisonPanel';
import { MortgageDetailsModal } from './MortgageDetailsModal';
import { ScenarioAnalysis } from './ScenarioAnalysis';
import { MortgageOptimizer } from './MortgageOptimizer';

const STORAGE_KEY = 'mortgage-advisor-state';

export function MortgageAdvisorTool() {
  const router = useRouter();
  const [state, setState] = useState<MortgageAdvisorState>({
    mixes: [],
    selectedForComparison: [],
    activeTab: 'builder'
  });
  
  const [showBuilder, setShowBuilder] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [editingMix, setEditingMix] = useState<MortgageMix | undefined>();
  const [builderMode, setBuilderMode] = useState<'create' | 'edit'>('create');
  const [showDetailsModal, setShowDetailsModal] = useState<MortgageMix | null>(null);
  const [showScenarioAnalysis, setShowScenarioAnalysis] = useState<MortgageMix | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

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


  const addMix = () => {
    setEditingMix(undefined);
    setBuilderMode('create');
    setShowBuilder(true);
    navigateTo('builder');
  };

  const editMix = (mix: MortgageMix) => {
    setEditingMix(mix);
    setBuilderMode('edit');
    setShowBuilder(true);
    navigateTo('builder');
  };

  const saveMix = (mix: MortgageMix) => {
    setState(prev => ({
      ...prev,
      mixes: editingMix 
        ? prev.mixes.map(m => m.id === mix.id ? mix : m)
        : [...prev.mixes, mix]
    }));
    setShowBuilder(false);
    setShowOptimizer(false);
    setEditingMix(undefined);
    setBuilderMode('create');
    // חזרה למסך הראשי לאחר שמירה
    goToHome();
  };

  const cancelEdit = () => {
    setShowBuilder(false);
    setEditingMix(undefined);
    setBuilderMode('create');
    // חזרה למסך הראשי לאחר ביטול
    goToHome();
  };

  // פונקציות ניווט
  const navigateTo = (screen: string) => {
    setNavigationHistory(prev => [...prev, screen]);
  };

  const goBack = () => {
    if (navigationHistory.length > 0) {
      const previousScreen = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      
      // סגירת כל המודלים והמסכים הפתוחים
      setShowBuilder(false);
      setShowOptimizer(false);
      setShowDetailsModal(null);
      setShowScenarioAnalysis(null);
      setEditingMix(undefined);
      
      // החזרה למסך הקודם לפי הסוג
      if (previousScreen === 'builder') {
        setState(prev => ({ ...prev, activeTab: 'builder' }));
      } else if (previousScreen === 'compare') {
        setState(prev => ({ ...prev, activeTab: 'compare' }));
      } else {
        // אם אין מסך קודם ספציפי, חזור למסך הראשי
        setState(prev => ({ ...prev, activeTab: 'builder' }));
      }
    } else {
      router.back();
    }
  };

  const goToHome = () => {
    // איפוס כל המצבים בבת אחת
    setShowBuilder(false);
    setShowOptimizer(false);
    setShowDetailsModal(null);
    setShowScenarioAnalysis(null);
    setEditingMix(undefined);
    setBuilderMode('create');
    setNavigationHistory([]);
    
    // חזרה למסך הראשי
    setState(prevState => ({
      ...prevState,
      selectedForComparison: [],
      activeTab: 'builder'
    }));
  };

  const goToMainPage = () => {
    router.push('/');
  };

  const updateMix = (updatedMix: MortgageMix) => {
    setState(prev => ({
      ...prev,
      mixes: prev.mixes.map(mix => 
        mix.id === updatedMix.id ? updatedMix : mix
      )
    }));
  };

  const deleteMix = (id: string) => {
    setState(prev => ({
      ...prev,
      mixes: prev.mixes.filter(mix => mix.id !== id),
      selectedForComparison: prev.selectedForComparison.filter(selectedId => selectedId !== id)
    }));
  };

  const duplicateMix = (mix: MortgageMix) => {
    const newMix: MortgageMix = {
      ...mix,
      id: `mix-${Date.now()}`,
      name: `${mix.name} (עותק)`,
      createdAt: new Date()
    };
    
    setState(prev => ({
      ...prev,
      mixes: [...prev.mixes, newMix]
    }));
  };

  const toggleMixSelection = (id: string) => {
    setState(prev => ({
      ...prev,
      selectedForComparison: prev.selectedForComparison.includes(id)
        ? prev.selectedForComparison.filter(selectedId => selectedId !== id)
        : [...prev.selectedForComparison, id]
    }));
  };

  const clearSelection = () => {
    setState(prev => ({
      ...prev,
      selectedForComparison: []
    }));
  };

  const handleTabChange = (value: string) => {
    setState(prev => ({
      ...prev,
      activeTab: value as any
    }));
    navigateTo(value);
  };

  const showDetails = (mix: MortgageMix) => {
    setShowDetailsModal(mix);
    navigateTo('details');
  };

  const showScenarios = (mix: MortgageMix) => {
    setShowScenarioAnalysis(mix);
    navigateTo('scenarios');
  };

  if (showOptimizer) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          {/* כפתורי ניווט */}
          <div className="flex justify-between items-center mb-6">
            <Button 
              variant="outline" 
              onClick={goBack}
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              חזור
            </Button>
            <div></div>
            <Button 
              variant="outline" 
              onClick={goToMainPage}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              עמוד ראשי
            </Button>
          </div>

          <MortgageOptimizer onSelectMix={saveMix} />
        </div>
      </div>
    );
  }

  if (showBuilder) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          {/* כפתורי ניווט */}
          <div className="flex justify-between items-center mb-6">
            <Button 
              variant="outline" 
              onClick={goBack}
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              חזור
            </Button>
            <div></div>
            <Button 
              variant="outline" 
              onClick={goToMainPage}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              עמוד ראשי
            </Button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {editingMix ? 'עריכת תמהיל משכנתא' : 'בניית תמהיל משכנתא חדש'}
            </h1>
            <p className="text-lg text-gray-600">
              בנה תמהיל משכנתא מותאם אישית עם מספר מסלולים
            </p>
          </div>

          <MortgageMixBuilder
            onSave={saveMix}
            editingMix={editingMix}
            onCancel={cancelEdit}
            existingMixes={state.mixes}
          />
        </div>
      </div>
    );
  }

  if (showScenarioAnalysis) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          {/* כפתורי ניווט */}
          <div className="flex justify-between items-center mb-6">
            <Button 
              variant="outline" 
              onClick={goBack}
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              חזור
            </Button>
            <div></div>
            <Button 
              variant="outline" 
              onClick={goToMainPage}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              עמוד ראשי
            </Button>
          </div>

          <ScenarioAnalysis
            baseMix={showScenarioAnalysis}
            onClose={() => {
              setShowScenarioAnalysis(null);
              goToHome();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        {/* כפתורי ניווט */}
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="outline" 
            onClick={goBack}
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            חזור
          </Button>
          <div></div>
          <Button 
            variant="outline" 
            onClick={goToMainPage}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            עמוד ראשי
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <Home className="h-10 w-10 text-blue-600" />
            כלי יועצי משכנתא
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            כלי מתקדם ליועצי משכנתא לבניית תמהילי משכנתא מותאמים אישית, 
            השוואות מקצועיות והדמיות פיננסיות מדויקות
          </p>
        </div>

        <Tabs value={state.activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              ניהול תמהילים
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              השוואה והדמיות
              {state.selectedForComparison.length > 0 && (
                <span className="bg-blue-500 text-white rounded-full px-2 py-1 text-xs">
                  {state.selectedForComparison.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-6">
            {/* רשימת תמהילים */}
            {state.mixes.length === 0 ? (
              <div className="text-center py-12">
                <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  אין תמהילי משכנתא במערכת
                </h3>
                <p className="text-gray-500 mb-6">
                  התחל על ידי בניית תמהיל חדש בהתאמה אישית
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={addMix} variant="outline" className="px-6 py-3">
                    <Plus className="h-5 w-5 ml-2" />
                    הוסף תמהיל מותאם אישית
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {state.mixes.length >= 3 && (
                  <div className="text-center space-y-3">
                    <h3 className="text-2xl font-bold text-gray-900">סלים אחידים</h3>
                    <div className="max-w-3xl mx-auto p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">
                        לחץ על התמהילים שברצונך להשוות ועבור ללשונית השוואה לקבלת השוואה מפורטת בין התמהילים
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <Button 
                    onClick={addMix} 
                    variant="outline"
                    className="px-6 py-6 text-lg h-auto flex-col gap-2 border-2 hover:border-blue-500 hover:bg-blue-50"
                  >
                    <Plus className="h-8 w-8" />
                    <div className="flex flex-col gap-1">
                      <span className="font-bold">הוסף תמהיל מותאם אישית</span>
                      <span className="text-sm text-gray-600 font-normal">בנה תמהיל בהתאמה אישית מלאה</span>
                    </div>
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {state.mixes.map((mix, index) => {
                    const summaryHeaderConfig =
                      index === 0
                        ? {
                            title: 'סל אחיד מס\' 1',
                            description: '100% ריבית קבועה לא צמודה - יציבות מקסימלית',
                          }
                        : index === 1
                          ? {
                              title: 'סל אחיד מס\' 2',
                              description: '50% קבועה + 50% פריים - איזון בין יציבות לגמישות',
                            }
                          : index === 2
                            ? {
                                title: 'סל אחיד מס\' 3',
                                description: '33% קל"צ + 33% פריים + 33% משתנה לא צמודה כל 5 שנים',
                              }
                            : {
                                title: `תמהיל מותאם אישית ${index - 2}`,
                                description: 'תמהיל מותאם אישית',
                              };
                    return (
                      <div key={mix.id}>
                        <MortgageMixCard
                          mix={mix}
                          onUpdate={updateMix}
                          onDelete={deleteMix}
                          onDuplicate={duplicateMix}
                          onShowDetails={showDetails}
                          onAnalyzeScenarios={showScenarios}
                          onToggleSelect={toggleMixSelection}
                          onEdit={editMix}
                          isSelected={state.selectedForComparison.includes(mix.id)}
                          showSummaryHeader={true}
                          summaryHeaderConfig={summaryHeaderConfig}
                        />
                      </div>
                    );
                  })}
                </div>

              </>
            )}
          </TabsContent>

          <TabsContent value="compare">
            <ComparisonPanel
              mixes={state.mixes}
              selectedIds={state.selectedForComparison}
              onClearSelection={clearSelection}
            />
          </TabsContent>
        </Tabs>

        {/* מודלים */}
        <MortgageDetailsModal
          mix={showDetailsModal}
          isOpen={!!showDetailsModal}
          onClose={() => {
            setShowDetailsModal(null);
            goToHome();
          }}
        />
      </div>
    </div>
  );
}