'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, Calculator, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MortgageMix, MortgageTrack } from './types';
import { TRACK_TYPES, DEFAULT_INTEREST_RATES } from './types';
import { MortgageTrackCard } from './MortgageTrackCard';
import { formatCurrency, formatPercentage, calculateMortgageMix } from './mortgageCalculations';

interface MortgageMixBuilderProps {
  onSave: (mix: MortgageMix) => void;
  editingMix?: MortgageMix;
  onCancel?: () => void;
}

export function MortgageMixBuilder({ onSave, editingMix, onCancel }: MortgageMixBuilderProps) {
  const [mixName, setMixName] = useState(editingMix?.name || 'תמהיל חדש');
  const [totalAmount, setTotalAmount] = useState(editingMix?.totalAmount || 1000000);
  const [tracks, setTracks] = useState<MortgageTrack[]>(editingMix?.tracks || []);
  const [notes, setNotes] = useState(editingMix?.notes || '');

  const addTrack = () => {
    const remainingAmount = totalAmount - tracks.reduce((sum, track) => sum + track.amount, 0);
    const suggestedAmount = Math.max(100000, remainingAmount);
    
    const newTrack: MortgageTrack = {
      id: `track-${Date.now()}`,
      name: `מסלול ${tracks.length + 1}`,
      type: 'fixed',
      amount: suggestedAmount,
      percentage: totalAmount > 0 ? (suggestedAmount / totalAmount) * 100 : 0,
      interestRate: DEFAULT_INTEREST_RATES.fixed,
      years: 20
    };
    
    setTracks([...tracks, newTrack]);
  };

  const updateTrack = (updatedTrack: MortgageTrack) => {
    setTracks(tracks.map(track => 
      track.id === updatedTrack.id ? updatedTrack : track
    ));
  };

  const deleteTrack = (id: string) => {
    setTracks(tracks.filter(track => track.id !== id));
  };

  const handleSave = () => {
    const mix: MortgageMix = {
      id: editingMix?.id || `mix-${Date.now()}`,
      name: mixName,
      totalAmount,
      tracks,
      notes,
      createdAt: editingMix?.createdAt || new Date()
    };
    
    onSave(mix);
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

  return (
    <div className="space-y-6">
      {/* פרטי התמהיל הכללי */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            פרטי התמהיל
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mixName">שם התמהיל</Label>
              <Input
                id="mixName"
                value={mixName}
                onChange={(e) => setMixName(e.target.value)}
                placeholder="שם התמהיל"
              />
            </div>
            
            <div>
              <Label htmlFor="totalAmount">סך המשכנתא (₪)</Label>
              <Input
                id="totalAmount"
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
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

      {/* בדיקת תקינות */}
      {!isAmountValid && tracks.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>שים לב:</strong> סכום המסלולים ({formatCurrency(totalTracksAmount)}) 
            לא תואם לסך המשכנתא ({formatCurrency(totalAmount)}).
            הפרש: {formatCurrency(Math.abs(totalTracksAmount - totalAmount))}
          </AlertDescription>
        </Alert>
      )}

      {/* כפתור הוספת מסלול */}
      <div className="text-center">
        <Button onClick={addTrack} className="px-6 py-3">
          <Plus className="h-5 w-5 ml-2" />
          הוסף מסלול
        </Button>
      </div>

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <MortgageTrackCard
              key={track.id}
              track={track}
              totalMortgageAmount={totalAmount}
              onUpdate={updateTrack}
              onDelete={deleteTrack}
            />
          ))}
        </div>
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
          disabled={tracks.length === 0 || !mixName.trim()}
          className="px-8 py-3"
        >
          <Save className="h-5 w-5 ml-2" />
          {editingMix ? 'עדכן תמהיל' : 'שמור תמהיל'}
        </Button>
      </div>
    </div>
  );
}