'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { AlertTriangle, CheckCircle2, Target, Wand2, X } from 'lucide-react';
import {
  GOAL_DESCRIPTIONS,
  GOAL_LABELS,
  evaluateCap,
  formatDuration,
} from '../engine';
import type { MixResult, OptimizationConstraints, OptimizationGoal, OptimizationOutcome } from '../engine';
import { SliderField, TermMonthsSlider, formatShekel } from './primitives';

const GOAL_ORDER: OptimizationGoal[] = [
  'lower_monthly',
  'faster_payoff',
  'lower_total_interest',
  'faster_equity',
  'balanced',
];

const CAP = { min: 2_000, max: 40_000, step: 100 };

interface GoalsPanelProps {
  result: MixResult;
  constraints: OptimizationConstraints;
  lastOptimization: OptimizationOutcome | null;
  onConstraintsChange: (patch: Partial<OptimizationConstraints>) => void;
  onOptimize: (goal: OptimizationGoal) => void;
  onPreview: (goal: OptimizationGoal) => OptimizationOutcome;
  onHide: () => void;
}

export function GoalsPanel({
  result,
  constraints,
  lastOptimization,
  onConstraintsChange,
  onOptimize,
  onPreview,
  onHide,
}: GoalsPanelProps) {
  const [hovered, setHovered] = useState<OptimizationGoal | null>(null);
  const cap = constraints.maxMonthlyPayment;
  const capStatus = useMemo(() => evaluateCap(result.summary, cap), [result.summary, cap]);

  const preview = useMemo(() => (hovered ? onPreview(hovered) : null), [hovered, onPreview]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            סכום ההחזר החודשי ומטרות
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onHide} title="הסתר">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">תקרת החזר חודשי (₪)</Label>
            <FormattedNumberValueInput
              className="h-9"
              value={cap || ''}
              placeholder="ללא הגבלה"
              onValueChange={(value) => onConstraintsChange({ maxMonthlyPayment: value > 0 ? value : undefined })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <TermMonthsSlider
              label="תקופה מקסימלית"
              years={constraints.maxYears ?? 30}
              onChange={(years) => onConstraintsChange({ maxYears: years })}
            />
          </div>
        </div>

        {cap ? (
          <SliderField
            label="תקרת החזר חודשי"
            value={Math.min(CAP.max, Math.max(CAP.min, cap))}
            onChange={(value) => onConstraintsChange({ maxMonthlyPayment: value })}
            min={CAP.min}
            max={CAP.max}
            step={CAP.step}
            display={formatShekel(cap)}
            minLabel={formatShekel(CAP.min)}
            maxLabel={formatShekel(CAP.max)}
          />
        ) : (
          <p className="text-[11px] text-slate-500">
            הזינו תקרת החזר חודשי כדי שהמטרות יעבדו בתוך המסגרת שהלקוח יכול לעמוד בה.
          </p>
        )}

        {capStatus && (
          <div
            className={`flex items-start gap-2 rounded-lg border p-2.5 ${
              capStatus.withinCap ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}
          >
            {capStatus.withinCap ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="text-[11px] leading-relaxed">
              <p className={capStatus.withinCap ? 'text-emerald-800' : 'text-red-800'}>
                ההחזר ההתחלתי {formatShekel(result.summary.monthlyPayment)}
                {capStatus.withinCap
                  ? ` — בתוך התקרה, עם מרווח של ${formatShekel(-capStatus.gap)}.`
                  : ` — חורג מהתקרה ב-${formatShekel(capStatus.gap)}.`}
              </p>
              {!capStatus.peakWithinCap && (
                <p className="text-amber-700 mt-1">
                  שיא ההחזר לאורך התקופה מגיע ל-{formatShekel(result.summary.peakMonthlyPayment)} בגלל הצמדה או
                  עליית ריבית, ולכן חורג מהתקרה בהמשך הדרך.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-600">בחרו מטרה — התמהיל יתעדכן מיד</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {GOAL_ORDER.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => onOptimize(goal)}
                onMouseEnter={() => setHovered(goal)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(goal)}
                onBlur={() => setHovered(null)}
                className="text-right rounded-xl border border-slate-200 bg-white p-3 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Wand2 className="h-3.5 w-3.5 text-blue-600" />
                  {GOAL_LABELS[goal]}
                </p>
                <p className="text-[10px] text-slate-500 leading-snug mt-1">{GOAL_DESCRIPTIONS[goal]}</p>
                {hovered === goal && preview && (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-600 space-y-0.5">
                    {preview.feasible ? (
                      <>
                        <p>החזר חודשי: {formatShekel(preview.after.monthlyPayment)}</p>
                        <p>סך ריבית: {formatShekel(preview.after.totalInterest)}</p>
                        <p>משך: {formatDuration(preview.after.months)}</p>
                      </>
                    ) : (
                      <p className="text-red-600">לא ניתן לעמוד בתקרה עם ההרכב הנוכחי</p>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {lastOptimization && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1">
            <p className="text-xs font-semibold text-blue-900">
              הוחל: {GOAL_LABELS[lastOptimization.goal]}
            </p>
            {lastOptimization.changes.length === 0 ? (
              <p className="text-[11px] text-blue-800">התמהיל כבר עמד במטרה — לא נדרש שינוי.</p>
            ) : (
              <ul className="text-[11px] text-blue-800 space-y-0.5 list-disc pr-4">
                {lastOptimization.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-blue-900 pt-1">
              החזר חודשי {formatShekel(lastOptimization.before.monthlyPayment)} →{' '}
              {formatShekel(lastOptimization.after.monthlyPayment)} · סך ריבית{' '}
              {formatShekel(lastOptimization.before.totalInterest)} →{' '}
              {formatShekel(lastOptimization.after.totalInterest)}
            </p>
            {!lastOptimization.feasible && (
              <p className="text-[11px] text-red-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                גם לאחר השינוי ההחזר חורג מהתקרה. שקלו להקטין את סכום המשכנתא או להאריך תקופה.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
