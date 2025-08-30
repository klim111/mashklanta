'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { Loan } from './types';
import { calculateLoanSummary, buildAmortSchedule } from './loanMath';
import { formatILS } from '@/lib/currency';

interface ComparePanelProps {
  loans: Loan[];
  selectedIds: string[];
  onClearSelection: () => void;
}

export function ComparePanel({ loans, selectedIds, onClearSelection }: ComparePanelProps) {
  const [showAmortChart, setShowAmortChart] = useState(false);
  const selectedLoans = loans.filter(loan => selectedIds.includes(loan.id));
  
  if (selectedLoans.length < 2) {
    return (
      <Card className="p-6" dir="rtl">
        <h3 className="text-xl font-bold mb-4">השוואת הלוואות</h3>
        <p className="text-gray-600">
          בחר לפחות 2 הלוואות להשוואה על ידי לחיצה על שמן
        </p>
      </Card>
    );
  }

  const comparisons = selectedLoans.map(loan => {
    const summary = calculateLoanSummary(loan);
    return {
      name: loan.name,
      loan,
      summary,
    };
  });

  // נתונים לגרף עמודות
  const chartData = comparisons.map(comp => ({
    name: comp.name,
    'החזר חודשי': Math.round(comp.summary.monthlyPayment),
    'סך ריבית': Math.round(comp.summary.totalInterest),
    'סך תשלומים': Math.round(comp.summary.totalPaid),
  }));

  // נתונים לגרף לוח סילוקין משווה
  const getAmortComparisonData = () => {
    if (selectedLoans.length !== 2) return [];
    
    const schedules = selectedLoans.map(loan => ({
      loan,
      schedule: buildAmortSchedule({
        principal: loan.principal,
        apr: loan.apr,
        months: loan.months,
      })
    }));

    const maxMonths = Math.max(...schedules.map(s => s.schedule.monthsActual));
    const data = [];

    for (let month = 1; month <= maxMonths; month++) {
      const dataPoint: any = { month };
      
      schedules.forEach(({ loan, schedule }) => {
        const row = schedule.rows.find(r => r.m === month);
        if (row) {
          dataPoint[`${loan.name} - יתרה`] = Math.round(row.balEnd);
        } else {
          dataPoint[`${loan.name} - יתרה`] = 0;
        }
      });
      
      data.push(dataPoint);
    }

    return data;
  };

  const amortComparisonData = getAmortComparisonData();
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

  return (
    <Card className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">השוואת הלוואות ({selectedLoans.length})</h3>
        <div className="flex gap-2">
          {selectedLoans.length === 2 && (
            <Button 
              variant="outline" 
              onClick={() => setShowAmortChart(!showAmortChart)}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {showAmortChart ? 'הסתר גרף סילוקין' : 'הצג גרף סילוקין'}
            </Button>
          )}
          <Button variant="outline" onClick={onClearSelection}>
            נקה בחירה
          </Button>
        </div>
      </div>

      {/* טבלת השוואה */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-right font-semibold">הלוואה</th>
              <th className="p-3 text-right font-semibold">קרן</th>
              <th className="p-3 text-right font-semibold">ריבית</th>
              <th className="p-3 text-right font-semibold">תקופה</th>
              <th className="p-3 text-right font-semibold">החזר חודשי</th>
              <th className="p-3 text-right font-semibold">סך ריבית</th>
              <th className="p-3 text-right font-semibold">סך תשלומים</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((comp, index) => (
              <tr key={comp.loan.id} className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                <td className="p-3 font-medium">{comp.name}</td>
                <td className="p-3">{formatILS(comp.loan.principal)}</td>
                <td className="p-3">{comp.loan.apr}%</td>
                <td className="p-3">{comp.loan.months} חודשים</td>
                <td className="p-3 font-semibold text-blue-600">
                  {formatILS(comp.summary.monthlyPayment)}
                </td>
                <td className="p-3 font-semibold text-red-600">
                  {formatILS(comp.summary.totalInterest)}
                </td>
                <td className="p-3 font-semibold">
                  {formatILS(comp.summary.totalPaid)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* גרף השוואה מתקדם */}
      <div className="space-y-6">
        <div className="h-80">
          <h4 className="text-lg font-semibold mb-4">השוואה ויזואלית - היבטים כלליים</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [formatILS(value), name]}
                labelStyle={{ direction: 'rtl' }}
              />
              <Legend />
              <Bar dataKey="החזר חודשי" fill="#3b82f6" name="החזר חודשי" />
              <Bar dataKey="סך ריבית" fill="#ef4444" name="סך ריבית" />
              <Bar dataKey="סך תשלומים" fill="#10b981" name="סך תשלומים" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* גרף השוואת לוח סילוקין */}
        {showAmortChart && selectedLoans.length === 2 && (
          <div className="h-96 border-t pt-6">
            <h4 className="text-lg font-semibold mb-4">השוואת קצב החזר - לוח סילוקין</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={amortComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  label={{ value: 'חודש', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                  label={{ value: 'יתרה (₪)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [formatILS(value), name]}
                  labelFormatter={(month) => `חודש ${month}`}
                  labelStyle={{ direction: 'rtl' }}
                />
                <Legend />
                {selectedLoans.map((loan, index) => (
                  <Line 
                    key={loan.id}
                    type="monotone" 
                    dataKey={`${loan.name} - יתרה`}
                    stroke={colors[index % colors.length]} 
                    strokeWidth={3}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* סיכום מהיר */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold mb-2">סיכום השוואה:</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600">החזר חודשי הנמוך ביותר</div>
            <div className="font-semibold">
              {(() => {
                const lowest = comparisons.reduce((prev, curr) => 
                  curr.summary.monthlyPayment < prev.summary.monthlyPayment ? curr : prev
                );
                return `${lowest.name}: ${formatILS(lowest.summary.monthlyPayment)}`;
              })()}
            </div>
          </div>
          <div>
            <div className="text-gray-600">ריבית הנמוכה ביותר</div>
            <div className="font-semibold">
              {(() => {
                const lowest = comparisons.reduce((prev, curr) => 
                  curr.summary.totalInterest < prev.summary.totalInterest ? curr : prev
                );
                return `${lowest.name}: ${formatILS(lowest.summary.totalInterest)}`;
              })()}
            </div>
          </div>
          <div>
            <div className="text-gray-600">תקופה הקצרה ביותר</div>
            <div className="font-semibold">
              {(() => {
                const shortest = comparisons.reduce((prev, curr) => 
                  curr.loan.months < prev.loan.months ? curr : prev
                );
                return `${shortest.name}: ${shortest.loan.months} חודשים`;
              })()}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}