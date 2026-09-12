'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Check, X, Calculator, TrendingUp } from 'lucide-react';
import type { MortgageTrack } from './types';
import { TRACK_TYPES, DEFAULT_INTEREST_RATES, AMORTIZATION_TYPES, VARIABLE_PERIODS } from './types';
import { formatCurrency, formatPercentage, calculateTrack } from './mortgageCalculations';
import { formatDuration } from './engine';
import { clampTermMonths, monthsToYears, yearsToMonths } from '@/lib/mortgage-plan';
import {
  DEFAULT_PAYMENT_DAY,
  clampPaymentDay,
  endDateFromMonths,
  formatPaymentDate,
  remainingPayments,
  toDateInputValue,
  trackRemainingMonths,
} from '@/lib/refinance';
import { useCPI } from '@/hooks/useCPI';
import { useCurrencyRates } from '@/hooks/useCurrencyRates';

interface MortgageTrackCardProps {
  track: MortgageTrack;
  totalMortgageAmount: number;
  onUpdate: (track: MortgageTrack) => void;
  onDelete: (id: string) => void;
  onShowDetails?: (track: MortgageTrack) => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
  /**
   * מקור התקופה של המסלול:
   * - `months` (ברירת מחדל) — הלקוח מזין מספר חודשים, כמו במשכנתא חדשה.
   * - `end-date` — הלקוח מזין את התאריך המדויק של התשלום האחרון ואת יום החיוב
   *   בחודש, והתקופה נגזרת מהזמן שנותר בפועל. זה המצב במיחזור.
   */
  termMode?: 'months' | 'end-date';
}

export function MortgageTrackCard({ 
  track, 
  totalMortgageAmount,
  onUpdate, 
  onDelete, 
  onShowDetails,
  isEditing: externalIsEditing = false,
  onStartEditing,
  termMode = 'months'
}: MortgageTrackCardProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editData, setEditData] = useState(track);
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [isCustomName, setIsCustomName] = useState(false);
  
  // שימוש בעריכה חיצונית או פנימית
  const isEditing = externalIsEditing || internalIsEditing;
  const byEndDate = termMode === 'end-date';
  const paymentDay = clampPaymentDay(editData.paymentDay ?? DEFAULT_PAYMENT_DAY);
  /** ברירת המחדל של תאריך הסיום נגזרת מהתקופה שכבר יש למסלול */
  const endDateValue =
    editData.endDate ||
    toDateInputValue(endDateFromMonths(yearsToMonths(editData.years || 0) || 1, paymentDay));
  const remaining = remainingPayments({ endDate: endDateValue, paymentDay });

  /** שינוי תאריך הסיום או יום החיוב גוזר מחדש את התקופה שנותרה */
  const applyDates = (nextEndDate: string, nextPaymentDay: number) => {
    const day = clampPaymentDay(nextPaymentDay);
    const months = remainingPayments({ endDate: nextEndDate, paymentDay: day }).months;
    setEditData((prev) => ({
      ...prev,
      endDate: nextEndDate,
      paymentDay: day,
      years: months > 0 ? months / 12 : prev.years,
    }));
  };

  const { cpiData, loading: cpiLoading } = useCPI();
  const { currencyRates, loading: currencyLoading } = useCurrencyRates();
  const buildAutoTrackName = (data: MortgageTrack) => {
    const rawTrackTypeLabel = TRACK_TYPES[data.type] || 'מסלול';
    const trackTypeLabel = rawTrackTypeLabel.replace(/^ריבית\s+/, '');
    const amountLabel = formatCurrency(data.amount || 0);
    const yearsLabel = formatDuration(yearsToMonths(data.years || 0));
    const interestLabel = `${(data.interestRate || 0).toFixed(2)}%`;
    const amortizationLabel = AMORTIZATION_TYPES[data.amortizationType || 'spitzer'];
    return `${trackTypeLabel} - ${amountLabel} - ${yearsLabel} - ${interestLabel} - ${amortizationLabel}`;
  };

  const autoTrackName = useMemo(() => {
    return buildAutoTrackName(editData);
  }, [
    editData.type,
    editData.amount,
    editData.years,
    editData.interestRate,
    editData.amortizationType,
    editData.percentage,
    editData.variablePeriod,
    editData.cpiIndex,
    editData.exchangeRate,
    editData.currency,
  ]);

  useEffect(() => {
    setEditData(track);
    // Always start in auto-name mode; only explicit manual edit locks the name.
    setIsCustomName(false);
    setIsNameEditing(false);
  }, [track]);

  useEffect(() => {
    if (!isCustomName) {
      setEditData((prev) => ({ ...prev, name: autoTrackName }));
    }
  }, [autoTrackName, isCustomName]);

  const handleSave = () => {
    const calculationPreview = calculateTrack(editData);
    // חישוב מחדש של האחוז והסכום
    const updatedTrack = {
      ...editData,
      percentage: totalMortgageAmount > 0 ? (editData.amount / totalMortgageAmount) * 100 : 0,
      monthlyPayment: calculationPreview.monthlyPayment,
      totalInterest: calculationPreview.totalInterest,
      totalPaid: calculationPreview.totalPaid,
    };
    
    onUpdate(updatedTrack);
    if (externalIsEditing) {
      // אם זה עריכה חיצונית, הקריאה ל-onUpdate תסגור את העריכה
    } else {
      setInternalIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditData(track);
    setIsNameEditing(false);
    if (externalIsEditing) {
      // אם זה עריכה חיצונית, לא ניתן לבטל
      onUpdate(track);
    } else {
      setInternalIsEditing(false);
    }
  };

  const commitNameEdit = () => {
    const trimmed = editData.name.trim();
    const resolvedName = trimmed || autoTrackName;
    setEditData((prev) => ({ ...prev, name: resolvedName }));
    setIsCustomName(resolvedName !== autoTrackName);
    setIsNameEditing(false);
  };

  const handleTypeChange = (newType: string) => {
    const trackType = newType as keyof typeof DEFAULT_INTEREST_RATES;
    const updatedData: MortgageTrack = {
      ...editData,
      type: trackType,
      interestRate: DEFAULT_INTEREST_RATES[trackType]
    };

    // הוספת שדות לפי סוג הריבית
    if (trackType.includes('linked') || trackType === 'makam') {
      updatedData.cpiIndex = cpiData?.value || 100;
    }

    if (trackType.includes('variable')) {
      updatedData.variablePeriod = 1; // ברירת מחדל
    }

    if (trackType === 'dollar') {
      updatedData.currency = 'USD';
      updatedData.exchangeRate = currencyRates?.usd || 3.65;
    }

    if (trackType === 'euro') {
      updatedData.currency = 'EUR';
      updatedData.exchangeRate = currencyRates?.eur || 3.95;
    }

    setEditData(updatedData);
  };

  const handleAmountChange = (amount: number) => {
    setEditData({
      ...editData,
      amount,
      percentage: totalMortgageAmount > 0 ? (amount / totalMortgageAmount) * 100 : 0
    });
  };

  const handlePercentageChange = (percentage: number) => {
    const amount = (percentage / 100) * totalMortgageAmount;
    setEditData({
      ...editData,
      percentage,
      amount
    });
  };

  if (isEditing) {
    return (
      <Card className="border-2 border-blue-200 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex-1">
              {isNameEditing ? (
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  onBlur={commitNameEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNameEdit();
                    if (e.key === 'Escape') {
                      setEditData((prev) => ({ ...prev, name: isCustomName ? track.name : autoTrackName }));
                      setIsNameEditing(false);
                    }
                  }}
                  className="text-lg font-semibold"
                  placeholder="שם המסלול"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsNameEditing(true)}
                  className="w-full text-right text-lg font-semibold hover:text-blue-600 hover:underline underline-offset-4"
                  title="לחץ לעריכת שם המסלול"
                >
                  {editData.name || autoTrackName}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>לוח סילוקין</Label>
              <Select 
                value={editData.amortizationType || 'spitzer'} 
                onValueChange={(value) => setEditData({ ...editData, amortizationType: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AMORTIZATION_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>סוג מסלול</Label>
              <Select value={editData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRACK_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ריבית שנתית (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={editData.interestRate}
                onChange={(e) => setEditData({ ...editData, interestRate: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>סכום (₪)</Label>
              <FormattedNumberValueInput
                value={editData.amount}
                onValueChange={handleAmountChange}
              />
            </div>
          </div>

          {byEndDate && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 space-y-3">
              <p className="text-xs font-semibold text-blue-900">
                מועדי התשלומים — מהם נגזרת התקופה שנותרה למסלול
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`end-date-${editData.id}`}>תאריך התשלום האחרון</Label>
                  <Input
                    id={`end-date-${editData.id}`}
                    type="date"
                    value={endDateValue}
                    onChange={(e) => applyDates(e.target.value, paymentDay)}
                  />
                </div>
                <div>
                  <Label htmlFor={`payment-day-${editData.id}`}>יום החיוב בחודש</Label>
                  <Input
                    id={`payment-day-${editData.id}`}
                    type="number"
                    min={1}
                    max={28}
                    value={paymentDay}
                    onChange={(e) => applyDates(endDateValue, parseInt(e.target.value, 10) || DEFAULT_PAYMENT_DAY)}
                  />
                </div>
              </div>
              <p className="text-xs text-blue-800">
                נותרו <span className="font-bold">{formatDuration(remaining.months)}</span> ({remaining.months} תשלומים)
                {' · '}התשלום הקרוב {formatPaymentDate(remaining.nextPaymentDate)}
                {' · '}האחרון {formatPaymentDate(remaining.lastPaymentDate)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {!byEndDate && (
              <div>
                <Label>תקופה (חודשים)</Label>
                <FormattedNumberValueInput
                  value={yearsToMonths(editData.years)}
                  onValueChange={(value) =>
                    setEditData({ ...editData, years: monthsToYears(clampTermMonths(value)) })
                  }
                />
              </div>
            )}

            <div>
              <Label>אחוז מימון (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={editData.percentage.toFixed(1)}
                onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* שדות נוספים לפי סוג הריבית */}
          {editData.type.includes('variable') && (
            <div>
              <Label>תקופת משתנה</Label>
              <Select 
                value={editData.variablePeriod?.toString() || '1'} 
                onValueChange={(value) => setEditData({ ...editData, variablePeriod: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VARIABLE_PERIODS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(editData.type === 'dollar' || editData.type === 'euro') && (
            <div>
              <Label>שער {editData.type === 'dollar' ? 'דולר' : 'יורו'}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={editData.exchangeRate || (editData.type === 'dollar' ? currencyRates?.usd : currencyRates?.eur) || 0}
                  onChange={(e) => setEditData({ ...editData, exchangeRate: parseFloat(e.target.value) || 0 })}
                />
                {currencyLoading ? (
                  <span className="text-xs text-gray-500">טוען שער...</span>
                ) : currencyRates && (
                  <div className="text-xs text-blue-600">
                    עדכני: {editData.type === 'dollar' ? currencyRates.usd : currencyRates.eur}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const trackCalculation = calculateTrack(track);
  const monthlyPayment = trackCalculation.monthlyPayment;
  const totalInterest = trackCalculation.totalInterest;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${
              track.type === 'fixed_unlinked' ? 'bg-blue-500' :
              track.type === 'fixed_linked' ? 'bg-blue-400' :
              track.type === 'prime' ? 'bg-orange-500' :
              track.type === 'variable_unlinked' ? 'bg-green-500' :
              track.type === 'variable_linked' ? 'bg-green-400' :
              track.type === 'makam' ? 'bg-purple-500' :
              track.type === 'dollar' ? 'bg-yellow-500' :
              track.type === 'euro' ? 'bg-gray-500' :
              track.type === 'eligibility' ? 'bg-pink-500' :
              track.type === 'five_year_plan' ? 'bg-indigo-500' :
              track.type === 'grant' ? 'bg-teal-500' :
              'bg-gray-400'
            }`} />
            <span>{track.name}</span>
          </div>
          <div className="flex gap-1">
            {onShowDetails && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onShowDetails(track)}
                className="text-blue-600 hover:text-blue-800"
              >
                <Calculator className="h-4 w-4" />
              </Button>
            )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => onStartEditing ? onStartEditing() : setInternalIsEditing(true)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Edit className="h-4 w-4" />
                </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onDelete(track.id)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">סוג:</span>
          <span className="font-medium">{TRACK_TYPES[track.type]}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">סכום:</span>
          <span className="font-medium">{formatCurrency(track.amount)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">אחוז:</span>
          <span className="font-medium">{formatPercentage(track.percentage, 1)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">ריבית:</span>
          <div className="text-left">
            <span className="font-medium">{formatPercentage(track.interestRate)}</span>
            {(track.type.includes('linked') || track.type === 'makam') && cpiData && (
              <div className="text-xs text-purple-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                מדד: {cpiData.value.toFixed(1)} 
                <span className={`text-xs ${cpiData.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({cpiData.changePercentage >= 0 ? '+' : ''}{cpiData.changePercentage.toFixed(2)}%)
                </span>
              </div>
            )}
            {(track.type.includes('linked') || track.type === 'makam') && cpiLoading && (
              <div className="text-xs text-gray-500">טוען מדד...</div>
            )}
            {track.type.includes('variable') && track.variablePeriod && (
              <div className="text-xs text-green-600">
                משתנה: {VARIABLE_PERIODS[track.variablePeriod as keyof typeof VARIABLE_PERIODS]}
              </div>
            )}
            {(track.type === 'dollar' || track.type === 'euro') && track.exchangeRate && (
              <div className="text-xs text-blue-600">
                שער: {track.exchangeRate.toFixed(3)} ₪
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{byEndDate ? 'נותר לתשלום:' : 'תקופה:'}</span>
          <div className="text-left">
            <span className="font-medium">
              {formatDuration(byEndDate ? trackRemainingMonths(track) : yearsToMonths(track.years))}
            </span>
            {byEndDate && track.endDate && (
              <div className="text-xs text-blue-600">
                עד {formatPaymentDate(remainingPayments({ endDate: track.endDate, paymentDay: track.paymentDay }).lastPaymentDate)}
                {' · '}חיוב ב-{clampPaymentDay(track.paymentDay ?? DEFAULT_PAYMENT_DAY)} לחודש
              </div>
            )}
          </div>
        </div>
        
        {track.amortizationType && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">לוח סילוקין:</span>
            <span className="font-medium">{AMORTIZATION_TYPES[track.amortizationType]}</span>
          </div>
        )}
        
        <div className="border-t pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">תשלום חודשי:</span>
            <span className="font-bold text-blue-600">{formatCurrency(monthlyPayment)}</span>
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">סך הריבית:</span>
            <span className="text-xs text-gray-700">{formatCurrency(totalInterest)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}