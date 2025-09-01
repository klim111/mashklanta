'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Check, X, Calculator } from 'lucide-react';
import type { MortgageTrack } from './types';
import { TRACK_TYPES, DEFAULT_INTEREST_RATES } from './types';
import { formatCurrency, formatPercentage, calculateMonthlyPayment } from './mortgageCalculations';

interface MortgageTrackCardProps {
  track: MortgageTrack;
  totalMortgageAmount: number;
  onUpdate: (track: MortgageTrack) => void;
  onDelete: (id: string) => void;
  onShowDetails?: (track: MortgageTrack) => void;
}

export function MortgageTrackCard({ 
  track, 
  totalMortgageAmount,
  onUpdate, 
  onDelete, 
  onShowDetails 
}: MortgageTrackCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(track);

  const handleSave = () => {
    // חישוב מחדש של האחוז והסכום
    const updatedTrack = {
      ...editData,
      percentage: totalMortgageAmount > 0 ? (editData.amount / totalMortgageAmount) * 100 : 0,
      monthlyPayment: calculateMonthlyPayment(editData.amount, editData.interestRate, editData.years)
    };
    
    onUpdate(updatedTrack);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(track);
    setIsEditing(false);
  };

  const handleTypeChange = (newType: string) => {
    const trackType = newType as keyof typeof DEFAULT_INTEREST_RATES;
    setEditData({
      ...editData,
      type: trackType,
      interestRate: DEFAULT_INTEREST_RATES[trackType]
    });
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
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="text-lg font-semibold"
              placeholder="שם המסלול"
            />
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
            
            <div>
              <Label>ריבית שנתית (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={editData.interestRate}
                onChange={(e) => setEditData({ ...editData, interestRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>סכום (₪)</Label>
              <Input
                type="number"
                value={editData.amount}
                onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <Label>אחוז מהמשכנתא (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={editData.percentage.toFixed(1)}
                onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label>תקופה (שנים)</Label>
            <Input
              type="number"
              value={editData.years}
              onChange={(e) => setEditData({ ...editData, years: parseInt(e.target.value) || 0 })}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  const monthlyPayment = calculateMonthlyPayment(track.amount, track.interestRate, track.years);
  const totalPaid = monthlyPayment * track.years * 12;
  const totalInterest = totalPaid - track.amount;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${
              track.type === 'fixed' ? 'bg-blue-500' :
              track.type === 'variable' ? 'bg-green-500' :
              track.type === 'prime' ? 'bg-orange-500' :
              'bg-purple-500'
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
              onClick={() => setIsEditing(true)}
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
          <span className="font-medium">{formatPercentage(track.interestRate)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">תקופה:</span>
          <span className="font-medium">{track.years} שנים</span>
        </div>
        
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