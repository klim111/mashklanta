'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface BankQuote {
  id: string;
  name: string;
  prime: string;
  kalatz: string;
  fixedLinked: string;
  variable5Linked: string;
  variable5NotLinked: string;
  notes: string;
}

const initialBanks: BankQuote[] = [
  {
    id: '1',
    name: 'בנק הפועלים',
    prime: '-0.75',
    kalatz: '3.5',
    fixedLinked: '4.2',
    variable5Linked: '3.8',
    variable5NotLinked: '4.5',
    notes: '',
  },
  {
    id: '2',
    name: 'בנק לאומי',
    prime: '-0.70',
    kalatz: '3.6',
    fixedLinked: '4.3',
    variable5Linked: '3.9',
    variable5NotLinked: '4.6',
    notes: '',
  },
  {
    id: '3',
    name: 'בנק דיסקונט',
    prime: '-0.80',
    kalatz: '3.4',
    fixedLinked: '4.1',
    variable5Linked: '3.7',
    variable5NotLinked: '4.4',
    notes: '',
  },
];

export function BankQuotesTable() {
  const [banks, setBanks] = useState(initialBanks);

  const handleInputChange = (bankId: string, field: keyof BankQuote, value: string) => {
    setBanks(prev => prev.map(bank => 
      bank.id === bankId ? { ...bank, [field]: value } : bank
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>הצעות מחיר מהבנקים</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky right-0 bg-background min-w-[120px]">בנק</TableHead>
              <TableHead className="min-w-[100px]">פריים (מרווח)</TableHead>
              <TableHead className="min-w-[100px]">קל״צ</TableHead>
              <TableHead className="min-w-[100px]">קבועה צמודה</TableHead>
              <TableHead className="min-w-[120px]">משתנה 5 צמודה</TableHead>
              <TableHead className="min-w-[130px]">משתנה 5 לא צמודה</TableHead>
              <TableHead className="min-w-[150px]">הערות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((bank) => (
              <TableRow key={bank.id}>
                <TableCell className="sticky right-0 bg-background font-medium">
                  {bank.name}
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={bank.prime}
                    onChange={(e) => handleInputChange(bank.id, 'prime', e.target.value)}
                    className="w-24 text-left"
                    dir="ltr"
                    placeholder="-0.75"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={bank.kalatz}
                    onChange={(e) => handleInputChange(bank.id, 'kalatz', e.target.value)}
                    className="w-24 text-left"
                    dir="ltr"
                    placeholder="3.5"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={bank.fixedLinked}
                    onChange={(e) => handleInputChange(bank.id, 'fixedLinked', e.target.value)}
                    className="w-24 text-left"
                    dir="ltr"
                    placeholder="4.2"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={bank.variable5Linked}
                    onChange={(e) => handleInputChange(bank.id, 'variable5Linked', e.target.value)}
                    className="w-24 text-left"
                    dir="ltr"
                    placeholder="3.8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={bank.variable5NotLinked}
                    onChange={(e) => handleInputChange(bank.id, 'variable5NotLinked', e.target.value)}
                    className="w-24 text-left"
                    dir="ltr"
                    placeholder="4.5"
                  />
                </TableCell>
                <TableCell>
                  <Textarea
                    value={bank.notes}
                    onChange={(e) => handleInputChange(bank.id, 'notes', e.target.value)}
                    className="min-w-[140px] h-10 py-2"
                    placeholder="הערות..."
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}