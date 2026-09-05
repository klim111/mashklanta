'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  BarChart3,
  Percent,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { TRACK_TYPES } from '../types';
import { isIndexLinked, isRateVariable } from '../scenarioCalculations';
import { formatPercentage } from '../mortgageCalculations';
import type { WorkspaceMix, TrackType } from '../engine';
import { usesInflationForecast } from '../engine';
import { SliderField } from './primitives';

const RATE_DELTA = { min: -3, max: 3, step: 0.25 };
const INFLATION = { min: -2, max: 6, step: 0.25, base: 2 };

interface RiskPanelProps {
  mix: WorkspaceMix;
  scenarioActive: boolean;
  onRateDeltaChange: (type: TrackType, delta: number) => void;
  onInflationChange: (value: number) => void;
  onResetAssumptions: () => void;
  onHide: () => void;
}

/**
 * סרגל ניתוח הסיכונים: הזזת הריבית לכל סוג מסלול רגיש והמדד השנתי, כדי לראות
 * כמה התמהיל חשוף לשינויים. מוצג רק כשהיועץ מבקש אותו מתפריט ההגדרות.
 */
export function RiskPanel({
  mix,
  scenarioActive,
  onRateDeltaChange,
  onInflationChange,
  onResetAssumptions,
  onHide,
}: RiskPanelProps) {
  const rateTypes = useMemo(() => {
    const seen: TrackType[] = [];
    mix.tracks.forEach((t) => {
      if (isRateVariable(t.type) && !seen.includes(t.type)) seen.push(t.type);
    });
    return seen;
  }, [mix.tracks]);

  const hasIndexed = useMemo(() => mix.tracks.some((t) => isIndexLinked(t.type)), [mix.tracks]);

  const applyPreset = (rateDelta: number, inflation: number) => {
    rateTypes.forEach((type) => onRateDeltaChange(type, rateDelta));
    onInflationChange(inflation);
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-blue-600" />
              סרגל ניתוח סיכונים
            </CardTitle>
            {scenarioActive && (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
                תרחיש פעיל — הגרפים משווים לבסיס
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => applyPreset(-1.5, 0)}
            >
              <Sparkles className="h-3.5 w-3.5 ml-1" />
              אופטימי
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onResetAssumptions}>
              <RotateCcw className="h-3.5 w-3.5 ml-1" />
              בסיס
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => applyPreset(2, 5)}
            >
              <AlertTriangle className="h-3.5 w-3.5 ml-1" />
              פסימי
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onHide} title="הסתר סרגל">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {rateTypes.length === 0 && !hasIndexed ? (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            כל המסלולים בתמהיל קבועים ולא צמודים — התמהיל מוגן משינויי ריבית ומדד.
          </p>
        ) : (
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {rateTypes.map((type) => {
              const delta = mix.assumptions.rateDeltas[type] ?? 0;
              return (
                <SliderField
                  key={type}
                  label={`שינוי ריבית — ${TRACK_TYPES[type]}`}
                  icon={<Percent className="h-3.5 w-3.5 text-blue-600" />}
                  value={delta}
                  onChange={(value) => onRateDeltaChange(type, value)}
                  min={RATE_DELTA.min}
                  max={RATE_DELTA.max}
                  step={RATE_DELTA.step}
                  display={`${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`}
                  minLabel={`ירידה ${RATE_DELTA.min}%`}
                  maxLabel={`עלייה +${RATE_DELTA.max}%`}
                  valueClassName={delta > 0 ? 'text-red-600' : delta < 0 ? 'text-emerald-600' : 'text-slate-800'}
                />
              );
            })}

            {hasIndexed && (
              <SliderField
                label="אינפלציה שנתית (מדד)"
                icon={<BarChart3 className="h-3.5 w-3.5 text-violet-600" />}
                value={mix.assumptions.annualInflation}
                onChange={onInflationChange}
                min={INFLATION.min}
                max={INFLATION.max}
                step={INFLATION.step}
                display={
                  usesInflationForecast(mix.assumptions)
                    ? 'תחזית בנק ישראל'
                    : formatPercentage(mix.assumptions.annualInflation)
                }
                minLabel={`מדד יורד ${INFLATION.min}%`}
                maxLabel={`מדד עולה +${INFLATION.max}%`}
                valueClassName={
                  mix.assumptions.annualInflation > INFLATION.base
                    ? 'text-red-600'
                    : mix.assumptions.annualInflation < INFLATION.base
                      ? 'text-emerald-600'
                      : 'text-slate-800'
                }
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
