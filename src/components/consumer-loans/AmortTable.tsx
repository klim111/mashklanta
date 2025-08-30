'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, X } from 'lucide-react';
import type { Loan, AmortRow } from './types';
import { buildAmortSchedule } from './loanMath';
import { formatILS, formatNumber } from '@/lib/currency';

interface AmortTableProps {
  loan: Loan;
  onClose: () => void;
}

export function AmortTable({ loan, onClose }: AmortTableProps) {
  const [prepayAmount, setPrepayAmount] = useState('');
  const [prepayMonth, setPrepayMonth] = useState('1');
  const [showPrepayment, setShowPrepayment] = useState(false);

  // חישוב טבלת הסילוקין
  const schedule = buildAmortSchedule({
    principal: loan.principal,
    apr: loan.apr,
    months: loan.months,
    prepayAmount: showPrepayment ? parseFloat(prepayAmount) || 0 : 0,
    prepayMonth: showPrepayment ? parseInt(prepayMonth) || 1 : 0,
    mode: 'reduce',
  });

  const exportToCSV = () => {
    const headers = ['חודש', 'יתרה תחילת חודש', 'תשלום', 'ריבית', 'קרן', 'יתרה סוף חודש'];
    const csvContent = [
      headers.join(','),
      ...schedule.rows.map(row => [
        row.m,
        row.balStart.toFixed(2),
        row.pay.toFixed(2),
        row.interest.toFixed(2),
        row.principal.toFixed(2),
        row.balEnd.toFixed(2),
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `טבלת_סילוקין_${loan.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <Card className="max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6">
          {/* כותרת */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">טבלת סילוקין - {loan.name}</h2>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* פרטי ההלוואה */}
          <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">קרן</div>
              <div className="font-semibold">{formatILS(loan.principal)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">ריבית שנתית</div>
              <div className="font-semibold">{loan.apr}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">תקופה</div>
              <div className="font-semibold">{loan.months} חודשים</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">תשלום חודשי</div>
              <div className="font-semibold text-blue-600">{formatILS(schedule.paymentInitial)}</div>
            </div>
          </div>

          {/* אזור פרעון מוקדם */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <input
                type="checkbox"
                id="prepayment"
                checked={showPrepayment}
                onChange={(e) => setShowPrepayment(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="prepayment" className="font-medium">
                הוספת פרעון מוקדם
              </Label>
            </div>
            
            {showPrepayment && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div>
                  <Label htmlFor="prepay-amount">סכום פרעון (₪)</Label>
                  <Input
                    id="prepay-amount"
                    type="number"
                    value={prepayAmount}
                    onChange={(e) => setPrepayAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="prepay-month">חודש הפרעון</Label>
                  <Input
                    id="prepay-month"
                    type="number"
                    min="1"
                    max={loan.months}
                    value={prepayMonth}
                    onChange={(e) => setPrepayMonth(e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* סיכום תוצאות */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">סך ריבית</div>
              <div className="font-bold text-red-600">{formatILS(schedule.totalInterest)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">סך תשלומים</div>
              <div className="font-bold">{formatILS(schedule.totalPaid)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">חודשים בפועל</div>
              <div className="font-bold">{schedule.monthsActual}</div>
            </div>
          </div>

          {/* כפתור ייצוא */}
          <div className="flex justify-end mb-4">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 ml-2" />
              ייצוא ל-CSV
            </Button>
          </div>

          {/* טבלת הסילוקין */}
          <div className="overflow-auto max-h-96 border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-3 text-right">חודש</th>
                  <th className="p-3 text-right">יתרה תחילת חודש</th>
                  <th className="p-3 text-right">תשלום</th>
                  <th className="p-3 text-right">ריבית</th>
                  <th className="p-3 text-right">קרן</th>
                  <th className="p-3 text-right">יתרה סוף חודש</th>
                </tr>
              </thead>
              <tbody>
                {schedule.rows.map((row) => (
                  <tr 
                    key={row.m} 
                    className={`border-b hover:bg-gray-50 ${
                      row.m === parseInt(prepayMonth) && showPrepayment ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="p-3 font-medium">{row.m}</td>
                    <td className="p-3">{formatILS(row.balStart)}</td>
                    <td className="p-3 font-semibold">{formatILS(row.pay)}</td>
                    <td className="p-3 text-red-600">{formatILS(row.interest)}</td>
                    <td className="p-3 text-green-600">{formatILS(row.principal)}</td>
                    <td className="p-3">{formatILS(row.balEnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}