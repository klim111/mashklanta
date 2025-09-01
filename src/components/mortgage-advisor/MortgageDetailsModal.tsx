'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Download,
  X,
  BarChart3
} from 'lucide-react';
import type { MortgageMix } from './types';
import { calculateMortgageMix, formatCurrency, formatPercentage } from './mortgageCalculations';
import { TRACK_TYPES } from './types';

interface MortgageDetailsModalProps {
  mix: MortgageMix | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MortgageDetailsModal({ mix, isOpen, onClose }: MortgageDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('summary');

  if (!mix) return null;

  const calculation = calculateMortgageMix(mix);
  const { summary, trackCalculations } = calculation;

  const exportToCSV = () => {
    // יצוא נתונים לקובץ CSV
    const headers = ['מסלול', 'סוג', 'סכום', 'ריבית', 'תקופה', 'תשלום חודשי', 'סך הריבית'];
    const rows = trackCalculations.map(calc => [
      calc.track.name,
      TRACK_TYPES[calc.track.type],
      calc.track.amount.toString(),
      calc.track.interestRate.toString(),
      calc.track.years.toString(),
      calc.monthlyPayment.toFixed(2),
      calc.totalInterest.toFixed(2)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${mix.name}_פירוט.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              פירוט מלא: {mix.name}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 ml-2" />
                יצוא לאקסל
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">סיכום כללי</TabsTrigger>
            <TabsTrigger value="tracks">פירוט מסלולים</TabsTrigger>
            <TabsTrigger value="amortization">לוח סילוקין</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            {/* כרטיסי סיכום */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summary.totalMonthlyPayment)}
                  </div>
                  <div className="text-sm text-gray-600">תשלום חודשי</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatPercentage(summary.averageRate)}
                  </div>
                  <div className="text-sm text-gray-600">ריבית ממוצעת</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {summary.weightedAverageYears.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">שנים ממוצע</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.totalInterest)}
                  </div>
                  <div className="text-sm text-gray-600">סך הריבית</div>
                </CardContent>
              </Card>
            </div>

            {/* פרטים נוספים */}
            <Card>
              <CardHeader>
                <CardTitle>פרטים כלליים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">סך המשכנתא:</span>
                    <span className="font-semibold">{formatCurrency(mix.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">מספר מסלולים:</span>
                    <span className="font-semibold">{mix.tracks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">סך התשלום:</span>
                    <span className="font-semibold">{formatCurrency(summary.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">נוצר בתאריך:</span>
                    <span className="font-semibold">
                      {new Date(mix.createdAt).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                </div>
                
                {mix.notes && (
                  <div className="pt-3 border-t">
                    <span className="text-gray-600">הערות: </span>
                    <span className="font-medium">{mix.notes}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracks" className="space-y-4">
            {trackCalculations.map((trackCalc) => (
              <Card key={trackCalc.track.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        trackCalc.track.type === 'fixed' ? 'bg-blue-500' :
                        trackCalc.track.type === 'variable' ? 'bg-green-500' :
                        trackCalc.track.type === 'prime' ? 'bg-orange-500' :
                        'bg-purple-500'
                      }`} />
                      <span>{trackCalc.track.name}</span>
                    </div>
                    <Badge variant="secondary">
                      {TRACK_TYPES[trackCalc.track.type]}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">סכום:</span>
                      <div className="text-lg font-semibold">
                        {formatCurrency(trackCalc.track.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatPercentage(trackCalc.track.percentage, 1)} מהמשכנתא
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-600">ריבית שנתית:</span>
                      <div className="text-lg font-semibold text-green-600">
                        {formatPercentage(trackCalc.track.interestRate)}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-600">תקופה:</span>
                      <div className="text-lg font-semibold">
                        {trackCalc.track.years} שנים
                      </div>
                      <div className="text-xs text-gray-500">
                        {trackCalc.track.years * 12} תשלומים
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-600">תשלום חודשי:</span>
                      <div className="text-lg font-semibold text-blue-600">
                        {formatCurrency(trackCalc.monthlyPayment)}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-600">סך הריבית:</span>
                      <div className="text-lg font-semibold text-red-600">
                        {formatCurrency(trackCalc.totalInterest)}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-600">סך התשלום:</span>
                      <div className="text-lg font-semibold">
                        {formatCurrency(trackCalc.totalPaid)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="amortization" className="space-y-4">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                לוח סילוקין מפורט
              </h3>
              <p className="text-gray-500">
                לוח סילוקין מפורט יתווסף בגרסה הבאה
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}