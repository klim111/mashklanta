'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Shield, DollarSign, Calendar, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { MortgageMix, MortgageTrack } from './types';
import { DEFAULT_INTEREST_RATES } from './types';
import { calculateMortgageMix, formatCurrency, formatPercentage } from './mortgageCalculations';
import { MortgageMixCard } from './MortgageMixCard';
import { ComparisonPanel } from './ComparisonPanel';
import { formatDuration } from './engine';
import {
  PLAN_TERM_MONTHS_MAX,
  PLAN_TERM_MONTHS_MIN,
  clampTermMonths,
  monthsToYears,
  yearsToMonths,
} from '@/lib/mortgage-plan';

interface OptimizerInputs {
  totalAmount: number;
  maxMonthlyPayment: number;
  currentAge: number;
  retirementAge: number;
  incomeSource: 'regular' | 'government' | 'dollar' | 'euro';
  riskTolerance: number; // 1-10
  expectedChanges: 'near' | 'medium' | 'far' | 'none';
  changeDescription: string;
  interestSensitivity: number; // 1-10
  maxYears: number;
}

interface OptimizedMix {
  mix: MortgageMix;
  score: number;
  reasoning: string;
  advantages: string[];
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export function MortgageOptimizer({ onSelectMix }: { onSelectMix?: (mix: MortgageMix) => void }) {
  const [inputs, setInputs] = useState<OptimizerInputs>({
    totalAmount: 1000000,
    maxMonthlyPayment: 5000,
    currentAge: 35,
    retirementAge: 67,
    incomeSource: 'regular',
    riskTolerance: 5,
    expectedChanges: 'none',
    changeDescription: '',
    interestSensitivity: 5,
    maxYears: 30
  });

  const [selectedMixIds, setSelectedMixIds] = useState<string[]>([]);

  // חישוב תמהילים אופטימליים
  const optimizedMixes = useMemo(() => {
    return generateOptimizedMixes(inputs);
  }, [
    inputs.totalAmount,
    inputs.maxMonthlyPayment,
    inputs.currentAge,
    inputs.retirementAge,
    inputs.incomeSource,
    inputs.riskTolerance,
    inputs.expectedChanges,
    inputs.changeDescription,
    inputs.interestSensitivity,
    inputs.maxYears
  ]);

  // איפוס הבחירה כשהתמהילים משתנים
  useEffect(() => {
    setSelectedMixIds([]);
  }, [optimizedMixes]);

  const toggleMixSelection = (id: string) => {
    setSelectedMixIds(prev => 
      prev.includes(id) 
        ? prev.filter(mixId => mixId !== id)
        : [...prev, id]
    );
  };

  const yearsToRetirement = inputs.retirementAge - inputs.currentAge;

  return (
    <div className="space-y-8" dir="rtl">
      {/* כותרת */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
          <Sparkles className="h-10 w-10 text-purple-600" />
          אופטימיזציית תמהיל משכנתא
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          כלי חכם שמנתח את המצב הפיננסי שלך ומציע תמהילי משכנתא מותאמים אישית
        </p>
      </div>

      {/* קלט נתונים */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-purple-600" />
            נתונים בסיסיים
          </CardTitle>
          <CardDescription>
            הזן את פרטיך הפיננסיים לקבלת המלצות מותאמות
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* סכום משכנתא */}
            <div className="space-y-2">
              <Label htmlFor="totalAmount" className="text-base font-semibold">
                סכום המשכנתא (₪)
              </Label>
              <FormattedNumberValueInput
                id="totalAmount"
                value={inputs.totalAmount}
                onValueChange={(v) => setInputs({ ...inputs, totalAmount: v })}
                className="text-lg"
              />
            </div>

            {/* החזר חודשי מקסימלי */}
            <div className="space-y-2">
              <Label htmlFor="maxMonthlyPayment" className="text-base font-semibold">
                החזר חודשי מקסימלי (₪)
              </Label>
              <FormattedNumberValueInput
                id="maxMonthlyPayment"
                value={inputs.maxMonthlyPayment}
                onValueChange={(v) => setInputs({ ...inputs, maxMonthlyPayment: v })}
                className="text-lg"
              />
            </div>

            {/* גיל נוכחי */}
            <div className="space-y-2">
              <Label htmlFor="currentAge" className="text-base font-semibold">
                גיל נוכחי
              </Label>
              <Input
                id="currentAge"
                type="number"
                value={inputs.currentAge}
                onChange={(e) => setInputs({ ...inputs, currentAge: parseFloat(e.target.value) || 0 })}
                className="text-lg"
              />
            </div>

            {/* גיל פרישה */}
            <div className="space-y-2">
              <Label htmlFor="retirementAge" className="text-base font-semibold">
                גיל פרישה משוער
              </Label>
              <Input
                id="retirementAge"
                type="number"
                value={inputs.retirementAge}
                onChange={(e) => setInputs({ ...inputs, retirementAge: parseFloat(e.target.value) || 0 })}
                className="text-lg"
              />
              <p className="text-xs text-gray-500">
                {yearsToRetirement > 0 ? `נותרו ${yearsToRetirement} שנים עד הפרישה` : 'כבר בגיל פרישה'}
              </p>
            </div>

            {/* מקור הכנסה */}
            <div className="space-y-2">
              <Label htmlFor="incomeSource" className="text-base font-semibold">
                מקור הכנסה עיקרי
              </Label>
              <Select 
                value={inputs.incomeSource}
                onValueChange={(value: any) => setInputs({ ...inputs, incomeSource: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">שכיר רגיל / עצמאי</SelectItem>
                  <SelectItem value="government">עובד מדינה (צמוד מדד)</SelectItem>
                  <SelectItem value="dollar">הכנסה בדולרים</SelectItem>
                  <SelectItem value="euro">הכנסה ביורו</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* שינויים צפויים */}
            <div className="space-y-2">
              <Label htmlFor="expectedChanges" className="text-base font-semibold">
                שינויים כלכליים צפויים
              </Label>
              <Select 
                value={inputs.expectedChanges}
                onValueChange={(value: any) => setInputs({ ...inputs, expectedChanges: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא שינויים צפויים</SelectItem>
                  <SelectItem value="near">שינוי בטווח הקרוב (1-2 שנים)</SelectItem>
                  <SelectItem value="medium">שינוי בטווח הבינוני (3-5 שנים)</SelectItem>
                  <SelectItem value="far">שינוי בטווח הרחוק (5+ שנים)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* הסבר על שינוי צפוי */}
          {inputs.expectedChanges !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="changeDescription" className="text-base font-semibold">
                תיאור השינוי הצפוי (אופציונלי)
              </Label>
              <Input
                id="changeDescription"
                value={inputs.changeDescription}
                onChange={(e) => setInputs({ ...inputs, changeDescription: e.target.value })}
                placeholder="לדוגמה: סיום לימודים, לידת ילד, קידום בעבודה..."
              />
            </div>
          )}

          {/* מכווני העדפות */}
          <div className="space-y-6 pt-4 border-t border-purple-200">
            <h3 className="text-lg font-semibold text-gray-900">העדפות והתאמות</h3>

            {/* רגישות לעלייה בריבית */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">רגישות לעלייה בריביות</Label>
                <Badge variant="outline" className="text-sm">
                  {inputs.interestSensitivity}/10
                </Badge>
              </div>
              <Slider
                value={[inputs.interestSensitivity]}
                onValueChange={(value) => setInputs({ ...inputs, interestSensitivity: value[0] })}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>מוכן לקחת סיכון</span>
                <span>רוצה יציבות מקסימלית</span>
              </div>
            </div>

            {/* רמת סיכון כללית */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">נכונות לסיכון פיננסי</Label>
                <Badge variant="outline" className="text-sm">
                  {inputs.riskTolerance}/10
                </Badge>
              </div>
              <Slider
                value={[inputs.riskTolerance]}
                onValueChange={(value) => setInputs({ ...inputs, riskTolerance: value[0] })}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>שמרני (בטוח)</span>
                <span>אגרסיבי (פוטנציאל חיסכון)</span>
              </div>
            </div>

            {/* תקופת החזר מקסימלית */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">תקופת החזר מקסימלית</Label>
                <Badge variant="outline" className="text-sm">
                  {formatDuration(clampTermMonths(yearsToMonths(inputs.maxYears)))}
                </Badge>
              </div>
              <Slider
                dir="ltr"
                value={[clampTermMonths(yearsToMonths(inputs.maxYears))]}
                onValueChange={(value) => setInputs({ ...inputs, maxYears: monthsToYears(value[0]) })}
                min={PLAN_TERM_MONTHS_MIN}
                max={PLAN_TERM_MONTHS_MAX}
                step={1}
                className="w-full"
              />
              <div dir="ltr" className="flex justify-between text-xs text-gray-500">
                <span>{PLAN_TERM_MONTHS_MIN} חודשים</span>
                <span>{PLAN_TERM_MONTHS_MAX} חודשים</span>
              </div>
              <p className="text-xs text-gray-500">
                מקסימום עד גיל 80:{' '}
                {formatDuration(Math.max(PLAN_TERM_MONTHS_MIN, (80 - inputs.currentAge) * 12))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* תמהילים מומלצים */}
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 sm:text-2xl">
            <Sparkles className="h-6 w-6 text-purple-600" />
            תמהילים מומלצים עבורך
          </h2>
          <Badge className="bg-purple-600 text-white text-sm px-3 py-1">
            {optimizedMixes.length} המלצות
          </Badge>
        </div>

        {/* בדיקת תקינות */}
        {optimizedMixes.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              לא ניתן ליצור תמהיל המתאים לדרישות. נסה להגדיל את ההחזר החודשי המקסימלי או את תקופת ההחזר.
            </AlertDescription>
          </Alert>
        )}

        {/* רשימת תמהילים */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {optimizedMixes.map((optimized, index) => (
            <OptimizedMixCard
              key={optimized.mix.id}
              optimized={optimized}
              rank={index + 1}
              isSelected={selectedMixIds.includes(optimized.mix.id)}
              onToggleSelect={() => toggleMixSelection(optimized.mix.id)}
              onSelect={onSelectMix}
            />
          ))}
        </div>

        {/* כפתור השוואה */}
        {selectedMixIds.length >= 2 && (
          <div className="text-center p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">
              נבחרו {selectedMixIds.length} תמהילים להשוואה
            </h3>
            <p className="text-sm text-purple-700 mb-4">
              לחץ להצגת השוואה מפורטת בין התמהילים שבחרת
            </p>
          </div>
        )}
      </div>

      {/* השוואה מפורטת */}
      {selectedMixIds.length >= 2 && (
        <div className="mt-8">
          <ComparisonPanel
            mixes={optimizedMixes
              .filter(opt => selectedMixIds.includes(opt.mix.id))
              .map(opt => opt.mix)
            }
            selectedIds={selectedMixIds}
            onClearSelection={() => setSelectedMixIds([])}
          />
        </div>
      )}
    </div>
  );
}

// קומפוננטת כרטיס תמהיל אופטימלי
function OptimizedMixCard({ 
  optimized, 
  rank, 
  isSelected,
  onToggleSelect,
  onSelect 
}: { 
  optimized: OptimizedMix; 
  rank: number; 
  isSelected: boolean;
  onToggleSelect: () => void;
  onSelect?: (mix: MortgageMix) => void;
}) {
  const calculation = calculateMortgageMix(optimized.mix);
  const riskColors = {
    low: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-red-100 text-red-800 border-red-300'
  };

  const riskIcons = {
    low: <Shield className="h-4 w-4" />,
    medium: <AlertTriangle className="h-4 w-4" />,
    high: <TrendingUp className="h-4 w-4" />
  };

  const riskLabels = {
    low: 'סיכון נמוך',
    medium: 'סיכון בינוני',
    high: 'סיכון גבוה'
  };

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
        isSelected ? 'ring-4 ring-purple-500 shadow-lg' : ''
      }`}
    >
      {/* תג דירוג */}
      <div className="absolute top-4 left-4 z-10">
        <Badge className="bg-purple-600 text-white text-lg px-3 py-1 shadow-lg">
          #{rank}
        </Badge>
      </div>

      {/* תג רמת סיכון */}
      <div className="absolute top-4 right-4 z-10">
        <Badge className={`${riskColors[optimized.riskLevel]} border flex items-center gap-1`}>
          {riskIcons[optimized.riskLevel]}
          {riskLabels[optimized.riskLevel]}
        </Badge>
      </div>

      <CardHeader 
        className="cursor-pointer bg-gradient-to-br from-purple-50 to-white pt-16"
        onClick={onToggleSelect}
      >
        <CardTitle className="text-xl">
          {optimized.mix.name}
        </CardTitle>
        <CardDescription className="text-sm mt-2">
          {optimized.reasoning}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* מדדים עיקריים */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(calculation.summary.totalMonthlyPayment)}
            </div>
            <div className="text-xs text-gray-600">תשלום חודשי</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              {formatPercentage(calculation.summary.averageRate)}
            </div>
            <div className="text-xs text-gray-600">ריבית ממוצעת</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-gray-700">
              {calculation.summary.weightedAverageYears.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600">שנים</div>
          </div>
          
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-gray-700">
              {formatCurrency(calculation.summary.totalInterest)}
            </div>
            <div className="text-xs text-gray-600">סך ריבית</div>
          </div>
        </div>

        {/* יתרונות */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            יתרונות
          </h4>
          <ul className="space-y-1">
            {optimized.advantages.slice(0, 3).map((adv, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>{adv}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* אזהרות */}
        {optimized.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              שים לב
            </h4>
            <ul className="space-y-1">
              {optimized.warnings.slice(0, 2).map((warn, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">⚠</span>
                  <span>{warn}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* חלוקת מסלולים */}
        <div className="pt-3 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">חלוקת מסלולים</h4>
          <div className="space-y-1">
            {optimized.mix.tracks.map((track, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="text-gray-600">{track.name}</span>
                <span className="font-semibold">{track.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* כפתור בחירה */}
        <Button 
          className="w-full"
          variant={isSelected ? "default" : "outline"}
          onClick={onToggleSelect}
        >
          {isSelected ? '✓ נבחר להשוואה' : 'בחר להשוואה'}
        </Button>

        {onSelect && (
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={() => onSelect(optimized.mix)}
          >
            השתמש בתמהיל זה
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// פונקציה ליצירת תמהילים אופטימליים
function generateOptimizedMixes(inputs: OptimizerInputs): OptimizedMix[] {
  const mixes: OptimizedMix[] = [];
  const yearsToRetirement = inputs.retirementAge - inputs.currentAge;

  // תמהיל 1: שמרני (סיכון נמוך)
  const conservativeMix = createConservativeMix(inputs, yearsToRetirement);
  if (conservativeMix) mixes.push(conservativeMix);

  // תמהיל 2: מאוזן
  const balancedMix = createBalancedMix(inputs, yearsToRetirement);
  if (balancedMix) mixes.push(balancedMix);

  // תמהיל 3: אגרסיבי / מותאם
  const aggressiveMix = createAggressiveMix(inputs, yearsToRetirement);
  if (aggressiveMix) mixes.push(aggressiveMix);

  // סינון תמהילים שעומדים בדרישות
  return mixes
    .filter(mix => {
      const calc = calculateMortgageMix(mix.mix);
      return calc.summary.totalMonthlyPayment <= inputs.maxMonthlyPayment;
    })
    .sort((a, b) => b.score - a.score);
}

function createConservativeMix(inputs: OptimizerInputs, yearsToRetirement: number): OptimizedMix | null {
  const tracks: MortgageTrack[] = [];
  const totalAmount = inputs.totalAmount;

  // התאמה למקור הכנסה
  if (inputs.incomeSource === 'government') {
    // עובד מדינה - דגש על מסלולים צמודים
    tracks.push({
      id: 'track-1',
      name: 'ריבית קבועה צמודה',
      type: 'fixed_linked',
      amount: totalAmount * 0.5,
      percentage: 50,
      interestRate: DEFAULT_INTEREST_RATES.fixed_linked,
      years: Math.min(inputs.maxYears, 25),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-2',
      name: 'ריבית קבועה לא צמודה',
      type: 'fixed_unlinked',
      amount: totalAmount * 0.35,
      percentage: 35,
      interestRate: DEFAULT_INTEREST_RATES.fixed_unlinked,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-3',
      name: 'זכאות',
      type: 'eligibility',
      amount: totalAmount * 0.15,
      percentage: 15,
      interestRate: DEFAULT_INTEREST_RATES.eligibility,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
  } else if (inputs.incomeSource === 'dollar') {
    // הכנסה בדולרים - דגש על מטח דולר
    tracks.push({
      id: 'track-1',
      name: 'מטח דולר',
      type: 'dollar',
      amount: totalAmount * 0.4,
      percentage: 40,
      interestRate: DEFAULT_INTEREST_RATES.dollar,
      years: Math.min(inputs.maxYears, 25),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-2',
      name: 'ריבית קבועה לא צמודה',
      type: 'fixed_unlinked',
      amount: totalAmount * 0.4,
      percentage: 40,
      interestRate: DEFAULT_INTEREST_RATES.fixed_unlinked,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-3',
      name: 'זכאות',
      type: 'eligibility',
      amount: totalAmount * 0.2,
      percentage: 20,
      interestRate: DEFAULT_INTEREST_RATES.eligibility,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
  } else {
    // רגיל - דגש על קבוע לא צמוד
    tracks.push({
      id: 'track-1',
      name: 'ריבית קבועה לא צמודה',
      type: 'fixed_unlinked',
      amount: totalAmount * 0.5,
      percentage: 50,
      interestRate: DEFAULT_INTEREST_RATES.fixed_unlinked,
      years: Math.min(inputs.maxYears, 25),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-2',
      name: 'ריבית קבועה צמודה',
      type: 'fixed_linked',
      amount: totalAmount * 0.3,
      percentage: 30,
      interestRate: DEFAULT_INTEREST_RATES.fixed_linked,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-3',
      name: 'זכאות',
      type: 'eligibility',
      amount: totalAmount * 0.2,
      percentage: 20,
      interestRate: DEFAULT_INTEREST_RATES.eligibility,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
  }

  const mix: MortgageMix = {
    id: `optimized-conservative-${Date.now()}`,
    name: 'תמהיל שמרני - יציבות מקסימלית',
    totalAmount,
    tracks,
    createdAt: new Date()
  };

  const advantages = [
    'ריביות קבועות - יציבות מלאה בתשלום החודשי',
    'אין חשש מעליית ריביות בשוק',
    'מתאים למי שמחפש שקט נפשי',
    'ניהול תקציב פשוט וברור'
  ];

  const warnings = [
    'תשלום חודשי גבוה יחסית',
    'אין אפשרות להפחתת תשלומים אם הריבית תרד'
  ];

  let reasoning = 'תמהיל שמרני המתאים למי שמחפש יציבות מקסימלית. ';
  
  if (inputs.interestSensitivity >= 7) {
    reasoning += 'מותאם לרגישות הגבוהה שלך לשינויים בריביות. ';
  }
  
  if (inputs.incomeSource === 'government') {
    reasoning += 'משולב עם מסלולים צמודים המתאימים להכנסה הצמודה שלך ממשכורת המדינה.';
  } else if (inputs.incomeSource === 'dollar') {
    reasoning += 'כולל מסלול מטח דולר המגן מפני סיכון שער החליפין.';
  }

  return {
    mix,
    score: 85 + (inputs.interestSensitivity * 1.5),
    reasoning,
    advantages,
    warnings,
    riskLevel: 'low'
  };
}

function createBalancedMix(inputs: OptimizerInputs, yearsToRetirement: number): OptimizedMix | null {
  const tracks: MortgageTrack[] = [];
  const totalAmount = inputs.totalAmount;

  // התאמה לשינויים צפויים
  if (inputs.expectedChanges === 'near' || inputs.expectedChanges === 'medium') {
    // שינויים קרובים - דגש על פריים
    tracks.push({
      id: 'track-1',
      name: 'פריים',
      type: 'prime',
      amount: totalAmount * 0.35,
      percentage: 35,
      interestRate: DEFAULT_INTEREST_RATES.prime,
      years: Math.min(inputs.maxYears, 25),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-2',
      name: 'ריבית קבועה לא צמודה',
      type: 'fixed_unlinked',
      amount: totalAmount * 0.35,
      percentage: 35,
      interestRate: DEFAULT_INTEREST_RATES.fixed_unlinked,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-3',
      name: 'משתנה 5 שנים',
      type: 'variable_unlinked',
      amount: totalAmount * 0.15,
      percentage: 15,
      interestRate: DEFAULT_INTEREST_RATES.variable_unlinked,
      years: Math.min(inputs.maxYears, 20),
      variablePeriod: 5,
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-4',
      name: 'זכאות',
      type: 'eligibility',
      amount: totalAmount * 0.15,
      percentage: 15,
      interestRate: DEFAULT_INTEREST_RATES.eligibility,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
  } else {
    // ללא שינויים קרובים או שינויים רחוקים
    tracks.push({
      id: 'track-1',
      name: 'ריבית קבועה לא צמודה',
      type: 'fixed_unlinked',
      amount: totalAmount * 0.4,
      percentage: 40,
      interestRate: DEFAULT_INTEREST_RATES.fixed_unlinked,
      years: Math.min(inputs.maxYears, 25),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-2',
      name: 'משתנה 5 שנים',
      type: 'variable_unlinked',
      amount: totalAmount * 0.25,
      percentage: 25,
      interestRate: DEFAULT_INTEREST_RATES.variable_unlinked,
      years: Math.min(inputs.maxYears, 25),
      variablePeriod: 5,
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-3',
      name: 'פריים',
      type: 'prime',
      amount: totalAmount * 0.2,
      percentage: 20,
      interestRate: DEFAULT_INTEREST_RATES.prime,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-4',
      name: 'זכאות',
      type: 'eligibility',
      amount: totalAmount * 0.15,
      percentage: 15,
      interestRate: DEFAULT_INTEREST_RATES.eligibility,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
  }

  const mix: MortgageMix = {
    id: `optimized-balanced-${Date.now()}`,
    name: 'תמהיל מאוזן - גמישות ויציבות',
    totalAmount,
    tracks,
    createdAt: new Date()
  };

  const advantages = [
    'שילוב נכון בין יציבות לגמישות',
    'פריים ומשתנה מאפשרים מחזור זול',
    'פוטנציאל חיסכון אם הריביות ירדו',
    'מגוון מסלולים מפזר סיכונים'
  ];

  const warnings = [
    'חלק מהתשלום עלול לעלות עם הריביות',
    'דורש מעקב תקופתי אחר השוק'
  ];

  let reasoning = 'תמהיל מאוזן המשלב יציבות וגמישות. ';
  
  if (inputs.expectedChanges === 'near' || inputs.expectedChanges === 'medium') {
    reasoning += `מותאם לשינוי הצפוי שלך ב${inputs.expectedChanges === 'near' ? 'טווח הקרוב' : 'טווח הבינוני'} - כולל פריים למחזור זול. `;
  }
  
  reasoning += 'מתאים למי שמחפש איזון בין חיסכון לביטחון.';

  return {
    mix,
    score: 80 + (inputs.riskTolerance * 1),
    reasoning,
    advantages,
    warnings,
    riskLevel: 'medium'
  };
}

function createAggressiveMix(inputs: OptimizerInputs, yearsToRetirement: number): OptimizedMix | null {
  const tracks: MortgageTrack[] = [];
  const totalAmount = inputs.totalAmount;

  // אם קרוב לפנסיה - קרן שווה
  const useEqualPrincipal = yearsToRetirement > 0 && yearsToRetirement <= 15;

  if (useEqualPrincipal) {
    // תמהיל עם קרן שווה לקראת פנסיה
    tracks.push({
      id: 'track-1',
      name: 'קרן שווה - צמוד מדד',
      type: 'fixed_linked',
      amount: totalAmount * 0.5,
      percentage: 50,
      interestRate: DEFAULT_INTEREST_RATES.fixed_linked,
      years: Math.min(inputs.maxYears, yearsToRetirement + 5),
      amortizationType: 'equal_principal'
    });
    tracks.push({
      id: 'track-2',
      name: 'משתנה 3 שנים',
      type: 'variable_unlinked',
      amount: totalAmount * 0.3,
      percentage: 30,
      interestRate: DEFAULT_INTEREST_RATES.variable_unlinked,
      years: Math.min(inputs.maxYears, 20),
      variablePeriod: 3,
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-3',
      name: 'זכאות',
      type: 'eligibility',
      amount: totalAmount * 0.2,
      percentage: 20,
      interestRate: DEFAULT_INTEREST_RATES.eligibility,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
  } else {
    // תמהיל אגרסיבי סטנדרטי
    tracks.push({
      id: 'track-1',
      name: 'משתנה כל 5 שנים',
      type: 'variable_unlinked',
      amount: totalAmount * 0.35,
      percentage: 35,
      interestRate: DEFAULT_INTEREST_RATES.variable_unlinked,
      years: Math.min(inputs.maxYears, 30),
      variablePeriod: 5,
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-2',
      name: 'פריים',
      type: 'prime',
      amount: totalAmount * 0.35,
      percentage: 35,
      interestRate: DEFAULT_INTEREST_RATES.prime,
      years: Math.min(inputs.maxYears, 25),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-3',
      name: 'ריבית קבועה לטווח קצר',
      type: 'fixed_unlinked',
      amount: totalAmount * 0.15,
      percentage: 15,
      interestRate: DEFAULT_INTEREST_RATES.fixed_unlinked,
      years: Math.min(inputs.maxYears, 15),
      amortizationType: 'spitzer'
    });
    tracks.push({
      id: 'track-4',
      name: 'זכאות',
      type: 'eligibility',
      amount: totalAmount * 0.15,
      percentage: 15,
      interestRate: DEFAULT_INTEREST_RATES.eligibility,
      years: Math.min(inputs.maxYears, 20),
      amortizationType: 'spitzer'
    });
  }

  const mixName = useEqualPrincipal 
    ? 'תמהיל מותאם לפרישה - קרן שווה'
    : 'תמהיל אגרסיבי - פוטנציאל חיסכון';

  const mix: MortgageMix = {
    id: `optimized-aggressive-${Date.now()}`,
    name: mixName,
    totalAmount,
    tracks,
    createdAt: new Date()
  };

  let advantages: string[];
  let warnings: string[];
  let reasoning: string;

  if (useEqualPrincipal) {
    advantages = [
      'קרן שווה - תשלומים גבוהים בהתחלה, יורדים עם הזמן',
      'מתאים למי שצפוי ירידה בהכנסה לקראת פנסיה',
      'תשלום מואץ של הקרן בתקופה שההכנסה גבוהה',
      'פחות ריבית בסך הכל'
    ];
    
    warnings = [
      'תשלום חודשי גבוה בשנים הראשונות',
      'דורש יכולת פיננסית חזקה בהתחלה',
      'לא מתאים אם ההכנסה נמוכה עכשיו'
    ];

    reasoning = `תמהיל מותאם במיוחד למי שקרוב לפנסיה (${yearsToRetirement} שנים). `;
    reasoning += 'משתמש בקרן שווה - תשלומים גבוהים בהתחלה כשההכנסה גבוהה, יורדים לקראת הפנסיה. ';
    reasoning += 'אידיאלי למקסום התשלום בתקופת שיא ההכנסה.';
  } else {
    advantages = [
      'פוטנציאל חיסכון משמעותי בריבית',
      'ריביות התחלתיות נמוכות',
      'גמישות מקסימלית למחזור',
      'מתאים למי שצופה ירידה בריביות'
    ];
    
    warnings = [
      'חשיפה גבוהה לעליית ריביות',
      'תשלום חודשי עלול לעלות משמעותית',
      'דורש מעקב צמוד אחר השוק',
      'מומלץ רק למי שיכול לספוג עליות'
    ];

    reasoning = 'תמהיל אגרסיבי עם פוטנציאל חיסכון גבוה. ';
    
    if (inputs.riskTolerance >= 7) {
      reasoning += 'מתאים לרמת הסיכון הגבוהה שבחרת. ';
    }
    
    reasoning += 'משלב ריביות משתנות שיכולות להוזיל משמעותית, אך דורש יכולת לספוג עליות אפשריות.';
  }

  return {
    mix,
    score: 70 + (inputs.riskTolerance * 2),
    reasoning,
    advantages,
    warnings,
    riskLevel: 'high'
  };
}

