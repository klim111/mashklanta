'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calculator, TrendingUp, PieChart, Home, Users } from 'lucide-react';
import type { MortgageMix, MortgageAdvisorState } from './types';
import { MortgageMixBuilder } from './MortgageMixBuilder';
import { MortgageMixCard } from './MortgageMixCard';
import { ComparisonPanel } from './ComparisonPanel';
import { MortgageDetailsModal } from './MortgageDetailsModal';
import { ScenarioAnalysis } from './ScenarioAnalysis';

const STORAGE_KEY = 'mortgage-advisor-state';

export function MortgageAdvisorTool() {
  const [state, setState] = useState<MortgageAdvisorState>({
    mixes: [],
    selectedForComparison: [],
    activeTab: 'builder'
  });
  
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingMix, setEditingMix] = useState<MortgageMix | undefined>();
  const [showDetailsModal, setShowDetailsModal] = useState<MortgageMix | null>(null);
  const [showScenarioAnalysis, setShowScenarioAnalysis] = useState<MortgageMix | null>(null);

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
    setShowBuilder(true);
  };

  const saveMix = (mix: MortgageMix) => {
    setState(prev => ({
      ...prev,
      mixes: editingMix 
        ? prev.mixes.map(m => m.id === mix.id ? mix : m)
        : [...prev.mixes, mix]
    }));
    setShowBuilder(false);
    setEditingMix(undefined);
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

  const editMix = (mix: MortgageMix) => {
    setEditingMix(mix);
    setShowBuilder(true);
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
  };

  const showDetails = (mix: MortgageMix) => {
    setShowDetailsModal(mix);
  };

  const showScenarios = (mix: MortgageMix) => {
    setShowScenarioAnalysis(mix);
  };

  if (showBuilder) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
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
            onCancel={() => {
              setShowBuilder(false);
              setEditingMix(undefined);
            }}
          />
        </div>
      </div>
    );
  }

  if (showScenarioAnalysis) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          <ScenarioAnalysis
            baseMix={showScenarioAnalysis}
            onClose={() => setShowScenarioAnalysis(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <Home className="h-10 w-10 text-blue-600" />
            כלי יועצי משכנתא
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            כלי מתקדם ליועצי משכנתא לבניית תמהילי משכנתא מותאמים אישית, 
            השוואות מקצועיות והדמיות פיננסיות מדויקות
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-blue-600 font-medium">
              מיועד ליועצי משכנתא מקצועיים
            </span>
          </div>
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
            {/* כפתור הוספת תמהיל */}
            <div className="text-center">
              <Button onClick={addMix} className="px-6 py-3 text-lg">
                <Plus className="h-5 w-5 ml-2" />
                בנה תמהיל חדש
              </Button>
            </div>

            {/* רשימת תמהילים */}
            {state.mixes.length === 0 ? (
              <div className="text-center py-12">
                <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  אין תמהילי משכנתא במערכת
                </h3>
                <p className="text-gray-500 mb-6">
                  התחל על ידי בניית התמהיל הראשון שלך
                </p>
                <Button onClick={addMix} className="px-6 py-3">
                  <Plus className="h-5 w-5 ml-2" />
                  בנה תמהיל ראשון
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {state.mixes.map((mix) => (
                    <MortgageMixCard
                      key={mix.id}
                      mix={mix}
                      onUpdate={updateMix}
                      onDelete={deleteMix}
                      onDuplicate={duplicateMix}
                      onShowDetails={showDetails}
                      onAnalyzeScenarios={showScenarios}
                      onToggleSelect={toggleMixSelection}
                      isSelected={state.selectedForComparison.includes(mix.id)}
                    />
                  ))}
                </div>

                {/* הסבר על בחירת תמהילים להשוואה */}
                {state.mixes.length > 1 && (
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <h4 className="text-lg font-semibold text-blue-800">השוואת תמהילים</h4>
                    </div>
                    <p className="text-sm text-blue-700 mb-4">
                      💡 לחץ על שם התמהיל כדי לבחור אותו להשוואה. 
                      נבחרו {state.selectedForComparison.length} תמהילים להשוואה.
                    </p>
                    
                    {state.selectedForComparison.length >= 2 && (
                      <Button 
                        onClick={() => setState(prev => ({ ...prev, activeTab: 'compare' }))}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <TrendingUp className="h-4 w-4 ml-2" />
                        עבור להשוואה ({state.selectedForComparison.length} תמהילים)
                      </Button>
                    )}
                    
                    {state.selectedForComparison.length === 1 && (
                      <p className="text-xs text-blue-600 mt-2">
                        🖱️ בחר תמהיל נוסף כדי להשוות ביניהם
                      </p>
                    )}
                  </div>
                )}
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
          onClose={() => setShowDetailsModal(null)}
        />
      </div>
    </div>
  );
}