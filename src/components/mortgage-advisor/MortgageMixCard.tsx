'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Check, X, Copy, Calculator, TrendingUp, PieChart } from 'lucide-react';
import type { MortgageMix } from './types';
import { formatCurrency, formatPercentage, calculateMortgageMix } from './mortgageCalculations';
import { TRACK_TYPES } from './types';

interface MortgageMixCardProps {
  mix: MortgageMix;
  onUpdate: (mix: MortgageMix) => void;
  onDelete: (id: string) => void;
  onDuplicate: (mix: MortgageMix) => void;
  onShowDetails?: (mix: MortgageMix) => void;
  onAnalyzeScenarios?: (mix: MortgageMix) => void;
  onToggleSelect?: (id: string) => void;
  isSelected?: boolean;
}

export function MortgageMixCard({ 
  mix, 
  onUpdate, 
  onDelete, 
  onDuplicate,
  onShowDetails,
  onAnalyzeScenarios,
  onToggleSelect,
  isSelected = false
}: MortgageMixCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: mix.name, notes: mix.notes || '' });

  const handleSave = () => {
    onUpdate({
      ...mix,
      name: editData.name,
      notes: editData.notes
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({ name: mix.name, notes: mix.notes || '' });
    setIsEditing(false);
  };

  const calculation = calculateMortgageMix(mix);
  const { summary } = calculation;

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 border-2 ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="text-lg font-semibold"
                placeholder="שם התמהיל"
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div 
                className={`flex items-center gap-2 ${onToggleSelect ? 'cursor-pointer' : ''}`}
                onClick={() => onToggleSelect?.(mix.id)}
              >
                <PieChart className="h-5 w-5 text-blue-600" />
                <span className="text-lg">{mix.name}</span>
                {isSelected && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    נבחר
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                {onShowDetails && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onShowDetails(mix)}
                    className="text-blue-600 hover:text-blue-800"
                    title="פירוט מלא"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                )}
                {onAnalyzeScenarios && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onAnalyzeScenarios(mix)}
                    className="text-purple-600 hover:text-purple-800"
                    title="ניתוח תרחישים"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => onDuplicate(mix)}
                  className="text-green-600 hover:text-green-800"
                >
                  <Copy className="h-4 w-4" />
                </Button>
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
                  onClick={() => onDelete(mix.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* פרטי התמהיל הכללי */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">סך המשכנתא:</span>
            <span className="font-bold text-lg">{formatCurrency(mix.totalAmount)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">מספר מסלולים:</span>
            <span className="font-medium">{mix.tracks.length}</span>
          </div>
        </div>

        {/* סיכום חישובים */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">תשלום חודשי:</span>
            <span className="font-bold text-blue-600 text-lg">
              {formatCurrency(summary.totalMonthlyPayment)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">ריבית ממוצעת:</span>
            <span className="font-medium">{formatPercentage(summary.averageRate)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">תקופה ממוצעת:</span>
            <span className="font-medium">{summary.weightedAverageYears.toFixed(1)} שנים</span>
          </div>
        </div>

        {/* רשימת מסלולים */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">מסלולי המשכנתא:</h4>
          <div className="space-y-1">
            {mix.tracks.map((track) => (
              <div key={track.id} className="flex justify-between items-center text-sm p-2 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    track.type === 'fixed' ? 'bg-blue-500' :
                    track.type === 'variable' ? 'bg-green-500' :
                    track.type === 'prime' ? 'bg-orange-500' :
                    'bg-purple-500'
                  }`} />
                  <span className="font-medium">{TRACK_TYPES[track.type]}</span>
                </div>
                <div className="text-left">
                  <div>{formatCurrency(track.amount)}</div>
                  <div className="text-xs text-gray-500">
                    {formatPercentage(track.percentage, 1)} • {formatPercentage(track.interestRate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* הערות */}
        {isEditing ? (
          <div>
            <Input
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              placeholder="הערות על התמהיל..."
              className="text-sm"
            />
          </div>
        ) : mix.notes && (
          <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
            <strong>הערות:</strong> {mix.notes}
          </div>
        )}

        {/* מידע נוסף */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <div className="flex justify-between">
            <span>נוצר: {new Date(mix.createdAt).toLocaleDateString('he-IL')}</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              <span>סך הריבית: {formatCurrency(summary.totalInterest)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}