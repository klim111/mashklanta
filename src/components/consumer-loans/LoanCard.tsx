'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Copy, Calculator, Edit3, Check, X } from 'lucide-react';
import type { Loan } from './types';
import { calculateLoanSummary } from './loanMath';
import { formatILS, formatPercent } from '@/lib/currency';

interface LoanCardProps {
  loan: Loan;
  onUpdate: (loan: Loan) => void;
  onDelete: (id: string) => void;
  onDuplicate: (loan: Loan) => void;
  onShowAmortization: (loan: Loan) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function LoanCard({
  loan,
  onUpdate,
  onDelete,
  onDuplicate,
  onShowAmortization,
  isSelected = false,
  onToggleSelect,
}: LoanCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: loan.name,
    principal: loan.principal.toString(),
    apr: loan.apr.toString(),
    months: loan.months.toString(),
  });

  const summary = calculateLoanSummary(loan);

  const handleSave = () => {
    const updatedLoan: Loan = {
      ...loan,
      name: editForm.name,
      principal: parseFloat(editForm.principal) || 0,
      apr: parseFloat(editForm.apr) || 0,
      months: parseInt(editForm.months) || 0,
    };
    onUpdate(updatedLoan);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      name: loan.name,
      principal: loan.principal.toString(),
      apr: loan.apr.toString(),
      months: loan.months.toString(),
    });
    setIsEditing(false);
  };

  return (
    <Card 
      className={`p-6 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'
      }`}
      dir="rtl"
    >
      <div className="space-y-4">
        {/* כותרת וכפתורי פעולה */}
        <div className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex-1 ml-4">
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="text-lg font-semibold"
                placeholder="שם ההלוואה"
              />
            </div>
          ) : (
            <h3 
              className={`text-lg font-semibold cursor-pointer ${
                onToggleSelect ? 'hover:text-blue-600' : ''
              }`}
              onClick={() => onToggleSelect?.(loan.id)}
            >
              {loan.name}
            </h3>
          )}
          
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} className="text-green-600">
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDuplicate(loan)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDelete(loan.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* פרטי ההלוואה */}
        {isEditing ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor={`principal-${loan.id}`}>קרן (₪)</Label>
              <Input
                id={`principal-${loan.id}`}
                type="number"
                value={editForm.principal}
                onChange={(e) => setEditForm(prev => ({ ...prev, principal: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor={`apr-${loan.id}`}>ריבית שנתית (%)</Label>
              <Input
                id={`apr-${loan.id}`}
                type="number"
                step="0.1"
                value={editForm.apr}
                onChange={(e) => setEditForm(prev => ({ ...prev, apr: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor={`months-${loan.id}`}>תקופה (חודשים)</Label>
              <Input
                id={`months-${loan.id}`}
                type="number"
                value={editForm.months}
                onChange={(e) => setEditForm(prev => ({ ...prev, months: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">קרן</div>
              <div className="font-semibold">{formatILS(loan.principal)}</div>
            </div>
            <div>
              <div className="text-gray-600">ריבית שנתית</div>
              <div className="font-semibold">{formatPercent(loan.apr)}</div>
            </div>
            <div>
              <div className="text-gray-600">תקופה</div>
              <div className="font-semibold">{loan.months} חודשים</div>
            </div>
          </div>
        )}

        {/* תוצאות חישובים */}
        {!isEditing && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600">החזר חודשי</div>
                <div className="font-bold text-lg text-blue-600">
                  {formatILS(summary.monthlyPayment)}
                </div>
              </div>
              <div>
                <div className="text-gray-600">סך ריבית</div>
                <div className="font-semibold text-red-600">
                  {formatILS(summary.totalInterest)}
                </div>
              </div>
              <div>
                <div className="text-gray-600">סך תשלומים</div>
                <div className="font-semibold">
                  {formatILS(summary.totalPaid)}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onShowAmortization(loan)}
                className="w-full"
              >
                <Calculator className="h-4 w-4 ml-2" />
                טבלת סילוקין
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}