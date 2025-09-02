'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface Field {
  id: string;
  label: string;
  type?: 'number' | 'slider';
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
}

interface MiniCalcProps {
  title: string;
  fields: Field[];
  calculateResult?: (values: Record<string, number>) => number;
  resultLabel?: string;
}

export function MiniCalc({ 
  title, 
  fields, 
  calculateResult,
  resultLabel = 'תוצאה (דמה)'
}: MiniCalcProps) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    fields.forEach(field => {
      initial[field.id] = field.defaultValue || 0;
    });
    return initial;
  });

  const [result, setResult] = useState(0);

  useEffect(() => {
    if (calculateResult) {
      setResult(calculateResult(values));
    } else {
      // Default stub calculation - just sum all values
      const sum = Object.values(values).reduce((acc, val) => acc + val, 0);
      setResult(sum);
    }
  }, [values, calculateResult]);

  const handleChange = (fieldId: string, value: number) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.suffix && <span className="text-muted-foreground mr-1">({field.suffix})</span>}
            </Label>
            
            {field.type === 'slider' ? (
              <div className="flex items-center gap-4">
                <Slider
                  id={field.id}
                  min={field.min || 0}
                  max={field.max || 100}
                  step={field.step || 1}
                  value={[values[field.id]]}
                  onValueChange={([value]) => handleChange(field.id, value)}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-left">
                  {values[field.id]}%
                </span>
              </div>
            ) : (
              <Input
                id={field.id}
                type="number"
                value={values[field.id]}
                onChange={(e) => handleChange(field.id, parseFloat(e.target.value) || 0)}
                className="text-left"
                dir="ltr"
              />
            )}
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">{resultLabel}:</span>
            <span className="text-xl font-bold text-primary">
              ₪ {result.toLocaleString('he-IL')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}