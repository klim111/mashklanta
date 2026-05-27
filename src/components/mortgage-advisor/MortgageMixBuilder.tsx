'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, Calculator } from 'lucide-react';
import type { MortgageMix, MortgageTrack, MortgageBank } from './types';
import { TRACK_TYPES, DEFAULT_INTEREST_RATES, MORTGAGE_BANKS } from './types';
import { MortgageTrackCard } from './MortgageTrackCard';
import { formatCurrency, formatPercentage, calculateMortgageMix } from './mortgageCalculations';

const CUSTOM_MIX_NAME_PREFIX = 'תמהיל מותאם אישית';

export function getNextCustomMixName(existingMixes: MortgageMix[]): string {
  const pattern = new RegExp(`^${CUSTOM_MIX_NAME_PREFIX}\\s+(\\d+)$`);
  let maxNum = 0;
  for (const mix of existingMixes) {
    const match = mix.name.match(pattern);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  return `${CUSTOM_MIX_NAME_PREFIX} ${maxNum + 1}`;
}

interface MortgageMixBuilderProps {
  onSave: (mix: MortgageMix) => void;
  editingMix?: MortgageMix;
  onCancel?: () => void;
  existingMixes?: MortgageMix[];
}

export function MortgageMixBuilder({ onSave, editingMix, onCancel, existingMixes = [] }: MortgageMixBuilderProps) {
  const defaultMixName = editingMix?.name ?? getNextCustomMixName(existingMixes);
  const [mixName, setMixName] = useState(defaultMixName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [bank, setBank] = useState<MortgageBank | ''>(editingMix?.bank ?? '');
  const [totalAmount, setTotalAmount] = useState(editingMix?.totalAmount || 1000000);
  const [tracks, setTracks] = useState<MortgageTrack[]>(editingMix?.tracks || []);
  const [notes, setNotes] = useState(editingMix?.notes || '');
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);

  // פתיחת כל המסלולים במוד עריכה כאשר עורכים תמהיל קיים
  useEffect(() => {
    if (editingMix && editingMix.tracks.length > 0) {
      // פתיחת המסלול הראשון במוד עריכה
      setEditingTrackId(editingMix.tracks[0].id);
    } else {
      // איפוס מוד העריכה עבור תמהיל חדש
      setEditingTrackId(null);
    }
  }, [editingMix]);

  const addTrack = (preferredAmount?: number) => {
    const remainingAmount = totalAmount - tracks.reduce((sum, track) => sum + track.amount, 0);
    const suggestedAmount =
      preferredAmount !== undefined
        ? Math.max(1, preferredAmount)
        : Math.max(100000, remainingAmount);
    
    const newTrack: MortgageTrack = {
      id: `track-${Date.now()}`,
      name: `מסלול ${tracks.length + 1}`,
      type: 'fixed_unlinked',
      amount: suggestedAmount,
      percentage: totalAmount > 0 ? (suggestedAmount / totalAmount) * 100 : 0,
      interestRate: DEFAULT_INTEREST_RATES.fixed_unlinked,
      years: 20,
      amortizationType: 'spitzer'
    };
    
    setTracks([...tracks, newTrack]);
    setEditingTrackId(newTrack.id); // פתיחת המסלול החדש במוד עריכה
  };

  const updateTrack = (updatedTrack: MortgageTrack) => {
    setTracks(tracks.map(track => 
      track.id === updatedTrack.id ? updatedTrack : track
    ));
    setEditingTrackId(null); // סגירת מוד העריכה לאחר השמירה
  };

  const deleteTrack = (id: string) => {
    setTracks(tracks.filter(track => track.id !== id));
    if (editingTrackId === id) {
      setEditingTrackId(null); // סגירת מוד העריכה אם מוחקים את המסלול הנערך
    }
  };

  const handleSave = () => {
    const mix: MortgageMix = {
      id: editingMix?.id || `mix-${Date.now()}`,
      name: mixName,
      bank: bank || undefined,
      totalAmount,
      tracks,
      notes,
      createdAt: editingMix?.createdAt || new Date()
    };
    
    onSave(mix);
  };

  const commitMixNameEdit = () => {
    setMixName((prev) => prev.trim() || defaultMixName);
    setIsEditingName(false);
  };

  // חישובים לבדיקת תקינות
  const totalTracksAmount = tracks.reduce((sum, track) => sum + track.amount, 0);
  const isAmountValid = Math.abs(totalTracksAmount - totalAmount) < 1000; // טולרנס של 1000 ש"ח
  const calculation = tracks.length > 0 ? calculateMortgageMix({
    id: 'temp',
    name: mixName,
    totalAmount,
    tracks,
    createdAt: new Date()
  }) : null;
  const amountDifference = totalAmount - totalTracksAmount;
  const remainingToComplete = Math.max(0, Math.round(amountDifference));
  const excessToReduce = Math.max(0, Math.round(-amountDifference));
  const showCompletionCta = !isAmountValid && remainingToComplete > 0;
  const showReductionCta = !isAmountValid && excessToReduce > 0;

  const reduceLastTrackByExcess = () => {
    if (tracks.length === 0 || excessToReduce <= 0) return;
    const lastTrack = tracks[tracks.length - 1];
    const nextAmount = Math.max(1, lastTrack.amount - excessToReduce);
    const updatedLastTrack: MortgageTrack = {
      ...lastTrack,
      amount: nextAmount,
      percentage: totalAmount > 0 ? (nextAmount / totalAmount) * 100 : 0,
    };
    updateTrack(updatedLastTrack);
  };

  return (
    <div className="space-y-6">
      {/* פרטי התמהיל הכללי */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-2">
            {isEditingName ? (
              <Input
                id="mixName"
                value={mixName}
                onChange={(e) => setMixName(e.target.value)}
                onBlur={commitMixNameEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitMixNameEdit();
                  if (e.key === 'Escape') {
                    setMixName(editingMix?.name ?? defaultMixName);
                    setIsEditingName(false);
                  }
                }}
                className="max-w-md text-center text-xl font-bold"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="text-2xl font-bold text-gray-900 hover:text-blue-600 underline-offset-4 hover:underline transition-colors"
                title="לחץ לשינוי שם התמהיל"
              >
                {mixName}
              </button>
            )}
            <p className="text-sm text-gray-500">לחץ על השם לשינוי</p>
          </div>
          {editingMix && (
            <p className="text-sm text-blue-600 mt-2 text-center">
              📝 מצב עריכה - כל המסלולים זמינים לעריכה
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank">בנק</Label>
              <Select value={bank} onValueChange={(value) => setBank(value as MortgageBank)}>
                <SelectTrigger
                  id="bank"
                  dir="rtl"
                  className="[&>span:first-of-type]:flex-1 [&>span:first-of-type]:text-right"
                >
                  <SelectValue placeholder="בחר בנק" />
                </SelectTrigger>
                <SelectContent dir="rtl" className="text-right">
                  {MORTGAGE_BANKS.map((bankOption) => (
                    <SelectItem
                      key={bankOption}
                      value={bankOption}
                      className="pr-8 pl-2 text-right [&>span:first-child]:right-2 [&>span:first-child]:left-auto"
                    >
                      {bankOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="totalAmount">סך המשכנתא (₪)</Label>
              <FormattedNumberValueInput
                id="totalAmount"
                value={totalAmount}
                onValueChange={setTotalAmount}
                placeholder="סך המשכנתא"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">הערות</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות על התמהיל..."
            />
          </div>
        </CardContent>
      </Card>

      {/* רשימת מסלולים */}
      {tracks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              אין מסלולים בתמהיל
            </h3>
            <p className="text-gray-500 mb-6">
              התחל על ידי הוספת המסלול הראשון שלך
            </p>
            <Button onClick={addTrack} className="px-6 py-3">
              <Plus className="h-5 w-5 ml-2" />
              הוסף מסלול ראשון
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track, index) => (
              <React.Fragment key={track.id}>
                <MortgageTrackCard
                  track={track}
                  totalMortgageAmount={totalAmount}
                  onUpdate={updateTrack}
                  onDelete={deleteTrack}
                  isEditing={editingTrackId === track.id}
                  onStartEditing={() => setEditingTrackId(track.id)}
                />

                {showCompletionCta && index === tracks.length - 1 && (
                  <Card className="border-2 border-dashed border-blue-300 bg-blue-50/80">
                    <CardContent className="h-full flex items-center justify-center p-6">
                      <Button onClick={() => addTrack(remainingToComplete)} className="px-6 py-3 text-base">
                        <Plus className="h-5 w-5 ml-2" />
                        הוסף מסלול להשלמת {formatCurrency(remainingToComplete)} לגובה ההלוואה
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {showReductionCta && index === tracks.length - 1 && (
                  <Card className="border-2 border-dashed border-amber-300 bg-amber-50/80">
                    <CardContent className="h-full flex items-center justify-center p-6">
                      <Button
                        onClick={reduceLastTrackByExcess}
                        variant="outline"
                        className="px-6 py-3 text-base border-amber-400 text-amber-800 hover:bg-amber-100"
                      >
                        הפחת מהמסלול האחרון {formatCurrency(excessToReduce)} כדי להגיע לגובה ההלוואה
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </React.Fragment>
            ))}
          </div>
        </>
      )}

      {/* סיכום התמהיל */}
      {calculation && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">סיכום התמהיל</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculation.summary.totalMonthlyPayment)}
                </div>
                <div className="text-sm text-gray-600">תשלום חודשי</div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">
                  {formatPercentage(calculation.summary.averageRate)}
                </div>
                <div className="text-sm text-gray-600">ריבית ממוצעת</div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">
                  {calculation.summary.weightedAverageYears.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">שנים ממוצע</div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(calculation.summary.totalInterest)}
                </div>
                <div className="text-sm text-gray-600">סך הריבית</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* כפתורי פעולה */}
      <div className="flex justify-center gap-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            ביטול
          </Button>
        )}
        <Button 
          onClick={handleSave}
          disabled={tracks.length === 0 || !mixName.trim() || !isAmountValid}
          className="px-8 py-3"
        >
          <Save className="h-5 w-5 ml-2" />
          {editingMix ? 'עדכן תמהיל' : 'שמור תמהיל'}
        </Button>
      </div>
    </div>
  );
}