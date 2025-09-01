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
  BarChart3,
  LineChart,
  TrendingDown,
  PieChart
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import type { MortgageMix } from './types';
import { 
  calculateMortgageMix, 
  formatCurrency, 
  formatPercentage,
  generateMonthlyPaymentChart,
  generateDebtBalanceChart,
  generateAverageInterestChart,
  generatePaymentBreakdownChart
} from './mortgageCalculations';
import { TRACK_TYPES } from './types';
import { useCPI } from '@/hooks/useCPI';

interface MortgageDetailsModalProps {
  mix: MortgageMix | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MortgageDetailsModal({ mix, isOpen, onClose }: MortgageDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const { cpiData, loading: cpiLoading } = useCPI();

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">סיכום כללי</TabsTrigger>
            <TabsTrigger value="tracks">פירוט מסלולים</TabsTrigger>
            <TabsTrigger value="amortization">לוח סילוקין</TabsTrigger>
            <TabsTrigger value="charts">גרפים</TabsTrigger>
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
                      {trackCalc.track.type === 'madad' && cpiData && (
                        <div className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3" />
                          מדד נוכחי: {cpiData.value.toFixed(1)} 
                          <span className={`text-xs ${cpiData.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({cpiData.changePercentage >= 0 ? '+' : ''}{cpiData.changePercentage.toFixed(2)}%)
                          </span>
                        </div>
                      )}
                      {trackCalc.track.type === 'madad' && cpiLoading && (
                        <div className="text-xs text-gray-500 mt-1">טוען נתוני מדד...</div>
                      )}
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
            {trackCalculations.map((trackCalc) => (
              <Card key={trackCalc.track.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${
                      trackCalc.track.type === 'fixed' ? 'bg-blue-500' :
                      trackCalc.track.type === 'variable' ? 'bg-green-500' :
                      trackCalc.track.type === 'prime' ? 'bg-orange-500' :
                      'bg-purple-500'
                    }`} />
                    לוח סילוקין - {trackCalc.track.name}
                    <Badge variant="secondary">
                      {TRACK_TYPES[trackCalc.track.type]}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(trackCalc.track.amount)}
                      </div>
                      <div className="text-xs text-gray-600">סכום המסלול</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {formatPercentage(trackCalc.track.interestRate)}
                      </div>
                      <div className="text-xs text-gray-600">ריבית שנתית</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {trackCalc.track.years} שנים
                      </div>
                      <div className="text-xs text-gray-600">תקופה</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(trackCalc.monthlyPayment)}
                      </div>
                      <div className="text-xs text-gray-600">תשלום חודשי</div>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b-2">
                        <tr>
                          <th className="text-right p-2 font-semibold">חודש</th>
                          <th className="text-right p-2 font-semibold">יתרת פתיחה</th>
                          <th className="text-right p-2 font-semibold">תשלום</th>
                          <th className="text-right p-2 font-semibold">ריבית</th>
                          <th className="text-right p-2 font-semibold">קרן</th>
                          <th className="text-right p-2 font-semibold">יתרת סגירה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trackCalc.amortSchedule.map((row, index) => (
                          <tr key={index} className={`border-b hover:bg-gray-50 ${
                            index % 12 === 11 ? 'bg-blue-50 border-blue-200' : ''
                          }`}>
                            <td className="p-2 font-medium">
                              {row.month}
                              {index % 12 === 11 && (
                                <span className="text-xs text-blue-600 mr-1">
                                  (שנה {Math.floor(index / 12) + 1})
                                </span>
                              )}
                            </td>
                            <td className="p-2">{formatCurrency(row.balanceStart)}</td>
                            <td className="p-2 font-medium">{formatCurrency(row.payment)}</td>
                            <td className="p-2 text-red-600">{formatCurrency(row.interest)}</td>
                            <td className="p-2 text-green-600">{formatCurrency(row.principal)}</td>
                            <td className="p-2 font-medium">{formatCurrency(row.balanceEnd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* גרף החזר חודשי */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-blue-600" />
                    החזר חודשי לאורך זמן
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateMonthlyPaymentChart(trackCalculations)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="year" 
                          label={{ value: 'שנה', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `₪${(value/1000).toFixed(0)}K`}
                          label={{ value: 'תשלום חודשי', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'תשלום חודשי']}
                          labelFormatter={(label) => `שנה ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalPayment" 
                          stroke="#2563eb" 
                          strokeWidth={3}
                          name="סך התשלום"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* גרף יתרת חוב */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    יתרת חוב לאורך זמן
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={generateDebtBalanceChart(trackCalculations)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="year" 
                          label={{ value: 'שנה', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `₪${(value/1000000).toFixed(1)}M`}
                          label={{ value: 'יתרת חוב', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'יתרת חוב']}
                          labelFormatter={(label) => `שנה ${label}`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="totalBalance" 
                          stroke="#dc2626" 
                          fill="#fecaca" 
                          strokeWidth={2}
                          name="יתרת חוב"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* גרף ריבית ממוצעת */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    ריבית ממוצעת לאורך זמן
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateAverageInterestChart(trackCalculations)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="year" 
                          label={{ value: 'שנה', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value.toFixed(1)}%`}
                          label={{ value: 'ריבית ממוצעת', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'ריבית ממוצעת']}
                          labelFormatter={(label) => `שנה ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="averageInterestRate" 
                          stroke="#16a34a" 
                          strokeWidth={3}
                          name="ריבית ממוצעת"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* גרף חלוקת תשלום */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-purple-600" />
                    חלוקת תשלום - קרן מול ריבית
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={generatePaymentBreakdownChart(trackCalculations)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="year" 
                          label={{ value: 'שנה', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value.toFixed(0)}%`}
                          label={{ value: 'אחוז מהתשלום', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`, 
                            name === 'interestPercentage' ? 'ריבית' : 'קרן'
                          ]}
                          labelFormatter={(label) => `שנה ${label}`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="interestPercentage" 
                          stackId="1"
                          stroke="#dc2626" 
                          fill="#fecaca" 
                          name="ריבית"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="principalPercentage" 
                          stackId="1"
                          stroke="#16a34a" 
                          fill="#bbf7d0" 
                          name="קרן"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}