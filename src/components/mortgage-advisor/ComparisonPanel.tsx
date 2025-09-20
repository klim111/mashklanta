'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Calculator,
  Award,
  AlertCircle,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import type { MortgageMix } from './types';
import { 
  formatCurrency, 
  formatPercentage, 
  compareMortgageMixes,
  calculateMortgageMix 
} from './mortgageCalculations';
import { TRACK_TYPES } from './types';
import { useCPI } from '@/hooks/useCPI';

interface ComparisonPanelProps {
  mixes: MortgageMix[];
  selectedIds: string[];
  onClearSelection: () => void;
}

export function ComparisonPanel({ mixes, selectedIds, onClearSelection }: ComparisonPanelProps) {
  const [activeView, setActiveView] = useState<'summary' | 'detailed' | 'charts'>('summary');
  const { cpiData, loading: cpiLoading } = useCPI();
  
  const selectedMixes = mixes.filter(mix => selectedIds.includes(mix.id));

  if (selectedMixes.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          לא נבחרו תמהילים להשוואה
        </h3>
        <p className="text-gray-500 mb-6">
          בחר לפחות 2 תמהילים כדי לראות השוואה מפורטת
        </p>
      </div>
    );
  }

  if (selectedMixes.length === 1) {
    const mix = selectedMixes[0];
    const calculation = calculateMortgageMix(mix);
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">פרטי התמהיל: {mix.name}</h2>
          <Button variant="outline" onClick={onClearSelection}>
            <X className="h-4 w-4 ml-2" />
            נקה בחירה
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>סיכום כללי</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(calculation.summary.totalMonthlyPayment)}
                </div>
                <div className="text-sm text-gray-600">תשלום חודשי</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatPercentage(calculation.summary.averageRate)}
                </div>
                <div className="text-sm text-gray-600">ריבית ממוצעת</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {calculation.summary.weightedAverageYears.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">שנים ממוצע</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(calculation.summary.totalInterest)}
                </div>
                <div className="text-sm text-gray-600">סך הריבית</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>פירוט מסלולים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calculation.trackCalculations.map((trackCalc) => (
                <div key={trackCalc.track.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        trackCalc.track.type === 'fixed' ? 'bg-blue-500' :
                        trackCalc.track.type === 'variable' ? 'bg-green-500' :
                        trackCalc.track.type === 'prime' ? 'bg-orange-500' :
                        'bg-purple-500'
                      }`} />
                      <span className="font-semibold">{trackCalc.track.name}</span>
                      <Badge variant="secondary">{TRACK_TYPES[trackCalc.track.type]}</Badge>
                    </div>
                    <span className="text-lg font-bold">
                      {formatCurrency(trackCalc.monthlyPayment)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">סכום: </span>
                      <span className="font-medium">{formatCurrency(trackCalc.track.amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">ריבית: </span>
                      <div className="inline-block">
                        <span className="font-medium">{formatPercentage(trackCalc.track.interestRate)}</span>
                        {trackCalc.track.type === 'madad' && cpiData && (
                          <div className="text-xs text-purple-600 inline-block mr-2">
                            (מדד: {cpiData.value.toFixed(1)})
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">תקופה: </span>
                      <span className="font-medium">{trackCalc.track.years} שנים</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // השוואה בין מספר תמהילים
  const comparison = compareMortgageMixes(selectedMixes);
  const { calculations, bestByMonthly, bestByTotal, bestByInterest } = comparison;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          השוואת תמהילים ({selectedMixes.length})
        </h2>
        <Button variant="outline" onClick={onClearSelection}>
          <X className="h-4 w-4 ml-2" />
          נקה בחירה
        </Button>
      </div>

      <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            סיכום
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            השוואה מפורטת
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            גרפים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {/* המלצות */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Award className="h-5 w-5" />
                  הטוב ביותר לתשלום חודשי
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {formatCurrency(bestByMonthly.summary.totalMonthlyPayment)}
                </div>
                <div className="text-sm text-green-700 font-medium">
                  {bestByMonthly.mix.name}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Award className="h-5 w-5" />
                  הטוב ביותר לסך התשלום
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {formatCurrency(bestByTotal.summary.totalPaid)}
                </div>
                <div className="text-sm text-blue-700 font-medium">
                  {bestByTotal.mix.name}
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Award className="h-5 w-5" />
                  הטוב ביותר לריבית
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {formatCurrency(bestByInterest.summary.totalInterest)}
                </div>
                <div className="text-sm text-purple-700 font-medium">
                  {bestByInterest.mix.name}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* טבלת השוואה מהירה */}
          <Card>
            <CardHeader>
              <CardTitle>השוואה מהירה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-2">תמהיל</th>
                      <th className="text-right p-2">תשלום חודשי</th>
                      <th className="text-right p-2">ריבית ממוצעת</th>
                      <th className="text-right p-2">סך הריבית</th>
                      <th className="text-right p-2">סך התשלום</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.map((calc) => (
                      <tr key={calc.mix.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{calc.mix.name}</td>
                        <td className="p-2">
                          {formatCurrency(calc.summary.totalMonthlyPayment)}
                          {calc.mix.id === bestByMonthly.mix.id && (
                            <Badge className="mr-2 bg-green-100 text-green-800">הטוב ביותר</Badge>
                          )}
                        </td>
                        <td className="p-2">{formatPercentage(calc.summary.averageRate)}</td>
                        <td className="p-2">
                          {formatCurrency(calc.summary.totalInterest)}
                          {calc.mix.id === bestByInterest.mix.id && (
                            <Badge className="mr-2 bg-purple-100 text-purple-800">הטוב ביותר</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          {formatCurrency(calc.summary.totalPaid)}
                          {calc.mix.id === bestByTotal.mix.id && (
                            <Badge className="mr-2 bg-blue-100 text-blue-800">הטוב ביותר</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          {calculations.map((calc) => (
            <Card key={calc.mix.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{calc.mix.name}</span>
                  <div className="flex gap-2">
                    {calc.mix.id === bestByMonthly.mix.id && (
                      <Badge className="bg-green-100 text-green-800">הטוב ביותר - תשלום חודשי</Badge>
                    )}
                    {calc.mix.id === bestByTotal.mix.id && (
                      <Badge className="bg-blue-100 text-blue-800">הטוב ביותר - סך התשלום</Badge>
                    )}
                    {calc.mix.id === bestByInterest.mix.id && (
                      <Badge className="bg-purple-100 text-purple-800">הטוב ביותר - ריבית</Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(calc.summary.totalMonthlyPayment)}
                    </div>
                    <div className="text-xs text-gray-600">תשלום חודשי</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {formatPercentage(calc.summary.averageRate)}
                    </div>
                    <div className="text-xs text-gray-600">ריבית ממוצעת</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {calc.summary.weightedAverageYears.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600">שנים ממוצע</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(calc.summary.totalInterest)}
                    </div>
                    <div className="text-xs text-gray-600">סך הריבית</div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>מסלולים:</strong> {calc.mix.tracks.length} מסלולים, 
                  סך המשכנתא: {formatCurrency(calc.mix.totalAmount)}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          {/* גרף תשלום חודשי */}
          <Card>
            <CardHeader>
              <CardTitle>השוואת תשלום חודשי</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calculations.map(calc => ({
                    name: calc.mix.name,
                    monthlyPayment: calc.summary.totalMonthlyPayment,
                    totalInterest: calc.summary.totalInterest,
                    totalPaid: calc.summary.totalPaid
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        formatCurrency(value as number), 
                        name === 'monthlyPayment' ? 'תשלום חודשי' :
                        name === 'totalInterest' ? 'סך הריבית' :
                        'סך התשלום'
                      ]}
                      labelStyle={{ direction: 'rtl' }}
                    />
                    <Bar 
                      dataKey="monthlyPayment" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* גרף סך הריבית */}
          <Card>
            <CardHeader>
              <CardTitle>השוואת סך הריבית</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calculations.map(calc => ({
                    name: calc.mix.name,
                    totalInterest: calc.summary.totalInterest,
                    averageRate: calc.summary.averageRate * 100
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'totalInterest' ? formatCurrency(value as number) : `${(value as number).toFixed(2)}%`,
                        name === 'totalInterest' ? 'סך הריבית' : 'ריבית ממוצעת'
                      ]}
                      labelStyle={{ direction: 'rtl' }}
                    />
                    <Bar 
                      dataKey="totalInterest" 
                      fill="#ef4444" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* גרף פיזור מסלולים */}
          <Card>
            <CardHeader>
              <CardTitle>פיזור מסלולים לפי סוג</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {calculations.map((calc) => {
                  const trackTypes = calc.mix.tracks.reduce((acc, track) => {
                    acc[track.type] = (acc[track.type] || 0) + track.amount;
                    return acc;
                  }, {} as Record<string, number>);

                  const pieData = Object.entries(trackTypes).map(([type, amount]) => ({
                    name: TRACK_TYPES[type as keyof typeof TRACK_TYPES],
                    value: amount,
                    percentage: ((amount / calc.mix.totalAmount) * 100).toFixed(1)
                  }));

                  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

                  return (
                    <div key={calc.mix.id} className="space-y-4">
                      <h4 className="font-semibold text-center">{calc.mix.name}</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percentage }) => `${name}: ${percentage}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => formatCurrency(value as number)}
                              labelStyle={{ direction: 'rtl' }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* גרף השוואת עלויות לאורך זמן */}
          <Card>
            <CardHeader>
              <CardTitle>השוואת עלויות לאורך זמן</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={Array.from({ length: 25 }, (_, year) => {
                    const dataPoint: any = { year: year + 1 };
                    calculations.forEach((calc, index) => {
                      const remainingYears = Math.max(0, calc.summary.weightedAverageYears - year);
                      const remainingAmount = calc.mix.totalAmount * (remainingYears / calc.summary.weightedAverageYears);
                      const monthlyPayment = calc.summary.totalMonthlyPayment;
                      dataPoint[`mix${index}`] = remainingAmount > 0 ? remainingAmount : 0;
                      dataPoint[`mix${index}Name`] = calc.mix.name;
                    });
                    return dataPoint;
                  })}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'שנה', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      label={{ value: 'יתרה (₪)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        formatCurrency(value as number),
                        calculations[parseInt(name.replace('mix', ''))]?.mix.name || ''
                      ]}
                      labelStyle={{ direction: 'rtl' }}
                    />
                    {calculations.map((_, index) => (
                      <Line 
                        key={index}
                        type="monotone" 
                        dataKey={`mix${index}`} 
                        stroke={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}