'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Calculator,
  AlertTriangle,
  Lightbulb,
  Target,
  DollarSign
} from 'lucide-react';
import type { MortgageMix } from './types';
import { calculateMortgageMix, formatCurrency, formatPercentage } from './mortgageCalculations';

interface ScenarioAnalysisProps {
  baseMix: MortgageMix;
  onClose?: () => void;
}

interface ScenarioParams {
  interestRateChange: number; // שינוי ריבית באחוזים
  incomeChange: number; // שינוי הכנסה באחוזים
  propertyValueChange: number; // שינוי שווי נכס באחוזים
  inflationRate: number; // ציפיות אינפלציה
}

export function ScenarioAnalysis({ baseMix, onClose }: ScenarioAnalysisProps) {
  const [scenarios, setScenarios] = useState<ScenarioParams>({
    interestRateChange: 0,
    incomeChange: 0,
    propertyValueChange: 0,
    inflationRate: 2.5
  });

  const baseCalculation = calculateMortgageMix(baseMix);
  
  // בדיקה אם יש מסלולי פריים בתמהיל
  const hasPrimeTracks = baseMix.tracks.some(track => track.type === 'prime');

  // יצירת תמהיל עם שינוי ריבית (רק למסלולים שאינם פריים)
  const createRateChangeScenario = (rateChange: number) => {
    const modifiedTracks = baseMix.tracks.map(track => ({
      ...track,
      // אם זה מסלול פריים, לא משנים את הריבית
      interestRate: track.type === 'prime' 
        ? track.interestRate 
        : Math.max(0.1, track.interestRate + rateChange)
    }));

    return calculateMortgageMix({
      ...baseMix,
      tracks: modifiedTracks
    });
  };

  // תרחישי ריבית שונים
  const optimisticScenario = createRateChangeScenario(-1); // ירידה של 1%
  const pessimisticScenario = createRateChangeScenario(+2); // עלייה של 2%
  const currentScenario = createRateChangeScenario(scenarios.interestRateChange);

  // חישוב יחס החוב להכנסה
  const calculateDebtToIncomeRatio = (monthlyPayment: number, monthlyIncome: number) => {
    return (monthlyPayment / monthlyIncome) * 100;
  };

  // הערכת סיכון
  const assessRisk = (debtToIncomeRatio: number) => {
    if (debtToIncomeRatio <= 30) return { level: 'נמוך', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (debtToIncomeRatio <= 40) return { level: 'בינוני', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'גבוה', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6 text-blue-600" />
          ניתוח תרחישים: {baseMix.name}
        </h2>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            חזור
          </Button>
        )}
      </div>

      {/* פרמטרי התרחיש */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            הגדרות תרחיש
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!hasPrimeTracks && (
              <div>
                <Label>שינוי ריבית ({scenarios.interestRateChange > 0 ? '+' : ''}{scenarios.interestRateChange.toFixed(1)}%)</Label>
                <Slider
                  value={[scenarios.interestRateChange]}
                  onValueChange={(value) => setScenarios({...scenarios, interestRateChange: value[0]})}
                  min={-3}
                  max={5}
                  step={0.1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-3%</span>
                  <span>+5%</span>
                </div>
              </div>
            )}
            
            {hasPrimeTracks && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">מסלול פריים זוהה</span>
                </div>
                <p className="text-xs text-orange-700">
                  ריבית פריים נקבעת על ידי בנק ישראל ולא ניתנת לשינוי בניתוח תרחישים
                </p>
              </div>
            )}

            <div>
              <Label>שינוי הכנסה ({scenarios.incomeChange > 0 ? '+' : ''}{scenarios.incomeChange}%)</Label>
              <Slider
                value={[scenarios.incomeChange]}
                onValueChange={(value) => setScenarios({...scenarios, incomeChange: value[0]})}
                min={-30}
                max={50}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-30%</span>
                <span>+50%</span>
              </div>
            </div>

            <div>
              <Label>שינוי שווי נכס ({scenarios.propertyValueChange > 0 ? '+' : ''}{scenarios.propertyValueChange}%)</Label>
              <Slider
                value={[scenarios.propertyValueChange]}
                onValueChange={(value) => setScenarios({...scenarios, propertyValueChange: value[0]})}
                min={-40}
                max={100}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-40%</span>
                <span>+100%</span>
              </div>
            </div>

            <div>
              <Label>ציפיות אינפלציה ({scenarios.inflationRate}%)</Label>
              <Slider
                value={[scenarios.inflationRate]}
                onValueChange={(value) => setScenarios({...scenarios, inflationRate: value[0]})}
                min={0}
                max={8}
                step={0.1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>8%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* השוואת תרחישים */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* תרחיש אופטימי */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <TrendingUp className="h-5 w-5" />
              תרחיש אופטימי
            </CardTitle>
            <p className="text-sm text-green-700">ירידת ריבית של 1%</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(optimisticScenario.summary.totalMonthlyPayment)}
              </div>
              <div className="text-sm text-green-700">תשלום חודשי</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(baseCalculation.summary.totalMonthlyPayment - optimisticScenario.summary.totalMonthlyPayment)}
              </div>
              <div className="text-xs text-green-700">חיסכון חודשי</div>
            </div>
          </CardContent>
        </Card>

        {/* תרחיש נוכחי */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Target className="h-5 w-5" />
              תרחיש נוכחי
            </CardTitle>
            <p className="text-sm text-blue-700">
              שינוי ריבית: {scenarios.interestRateChange > 0 ? '+' : ''}{scenarios.interestRateChange.toFixed(1)}%
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(currentScenario.summary.totalMonthlyPayment)}
              </div>
              <div className="text-sm text-blue-700">תשלום חודשי</div>
            </div>
            
            <div className="text-center">
              <div className={`text-lg font-semibold ${
                currentScenario.summary.totalMonthlyPayment > baseCalculation.summary.totalMonthlyPayment 
                  ? 'text-red-600' : 'text-green-600'
              }`}>
                {currentScenario.summary.totalMonthlyPayment > baseCalculation.summary.totalMonthlyPayment ? '+' : ''}
                {formatCurrency(currentScenario.summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment)}
              </div>
              <div className="text-xs text-blue-700">שינוי מהבסיס</div>
            </div>
          </CardContent>
        </Card>

        {/* תרחיש פסימי */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <TrendingDown className="h-5 w-5" />
              תרחיש פסימי
            </CardTitle>
            <p className="text-sm text-red-700">עליית ריבית של 2%</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(pessimisticScenario.summary.totalMonthlyPayment)}
              </div>
              <div className="text-sm text-red-700">תשלום חודשי</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                +{formatCurrency(pessimisticScenario.summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment)}
              </div>
              <div className="text-xs text-red-700">עלייה חודשית</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ניתוח סיכונים */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            ניתוח סיכונים והמלצות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                רגישות לשינוי ריבית
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">עלייה של 1%:</span>
                  <span className="font-medium text-red-600">
                    +{formatCurrency(createRateChangeScenario(1).summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">עלייה של 2%:</span>
                  <span className="font-medium text-red-600">
                    +{formatCurrency(pessimisticScenario.summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">ירידה של 1%:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(optimisticScenario.summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                המלצות
              </h4>
              <div className="space-y-2">
                {baseCalculation.summary.averageRate > 4 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">ריבית גבוהה</span>
                    </div>
                    <p className="text-xs text-yellow-700">
                      שקול מסלולים עם ריבית נמוכה יותר או תמהיל שונה
                    </p>
                  </div>
                )}

                {baseMix.tracks.filter(t => t.type === 'variable').length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">ריבית משתנה</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      התמהיל כולל ריבית משתנה - שקול הגנה מפני עלייה
                    </p>
                  </div>
                )}

                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">גיוון מסלולים</span>
                  </div>
                  <p className="text-xs text-green-700">
                    התמהיל מגוון היטב בין סוגי מסלולים שונים
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* סיכום תרחישים */}
      <Card>
        <CardHeader>
          <CardTitle>סיכום השוואה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-2">תרחיש</th>
                  <th className="text-right p-2">תשלום חודשי</th>
                  <th className="text-right p-2">שינוי מהבסיס</th>
                  <th className="text-right p-2">ריבית ממוצעת</th>
                  <th className="text-right p-2">סך הריבית</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">בסיס</td>
                  <td className="p-2">{formatCurrency(baseCalculation.summary.totalMonthlyPayment)}</td>
                  <td className="p-2">-</td>
                  <td className="p-2">{formatPercentage(baseCalculation.summary.averageRate)}</td>
                  <td className="p-2">{formatCurrency(baseCalculation.summary.totalInterest)}</td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium text-green-700">אופטימי (-1%)</td>
                  <td className="p-2">{formatCurrency(optimisticScenario.summary.totalMonthlyPayment)}</td>
                  <td className="p-2 text-green-600">
                    {formatCurrency(optimisticScenario.summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment)}
                  </td>
                  <td className="p-2">{formatPercentage(optimisticScenario.summary.averageRate)}</td>
                  <td className="p-2">{formatCurrency(optimisticScenario.summary.totalInterest)}</td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium text-red-700">פסימי (+2%)</td>
                  <td className="p-2">{formatCurrency(pessimisticScenario.summary.totalMonthlyPayment)}</td>
                  <td className="p-2 text-red-600">
                    +{formatCurrency(pessimisticScenario.summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment)}
                  </td>
                  <td className="p-2">{formatPercentage(pessimisticScenario.summary.averageRate)}</td>
                  <td className="p-2">{formatCurrency(pessimisticScenario.summary.totalInterest)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}