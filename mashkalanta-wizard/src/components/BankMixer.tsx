'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const tracks = [
  { id: 'prime', label: 'פריים', amount: '₪ 300,000' },
  { id: 'kalatz', label: 'קל״צ', amount: '₪ 200,000' },
  { id: 'fixed', label: 'קבועה צמודה', amount: '₪ 400,000' },
  { id: 'variable5', label: 'משתנה 5 שנים', amount: '₪ 300,000' },
  { id: 'variable', label: 'משתנה לא צמודה', amount: '₪ 300,000' },
];

const banks = [
  { id: 'hapoalim', label: 'בנק הפועלים' },
  { id: 'leumi', label: 'בנק לאומי' },
  { id: 'discount', label: 'בנק דיסקונט' },
];

export function BankMixer() {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const handleSelectionChange = (trackId: string, bankId: string) => {
    setSelections(prev => ({ ...prev, [trackId]: bankId }));
  };

  const monthlyPayment = 8500; // Stub value

  return (
    <Card>
      <CardHeader>
        <CardTitle>בחירת בנק לכל מסלול</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {tracks.map((track) => (
            <div key={track.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <Label htmlFor={`bank-${track.id}`}>
                  {track.label}
                </Label>
                <p className="text-sm text-muted-foreground">{track.amount}</p>
              </div>
              
              <Select
                value={selections[track.id] || ''}
                onValueChange={(value) => handleSelectionChange(track.id, value)}
              >
                <SelectTrigger id={`bank-${track.id}`} className="sm:col-span-2">
                  <SelectValue placeholder="בחר בנק..." />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t">
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">החזר חודשי משוער (דמה):</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  ₪ {monthlyPayment.toLocaleString('he-IL')}
                </span>
                <Badge variant="outline" className="text-xs">
                  לחודש
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * זהו חישוב דמה בלבד. החישוב האמיתי יתבצע לאחר הזנת כל הנתונים
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}