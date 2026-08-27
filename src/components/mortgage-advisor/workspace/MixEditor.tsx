'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Plus } from 'lucide-react';
import { DEFAULT_INTEREST_RATES, MIN_FIXED_UNLINKED_PERCENT, TRACK_TYPES } from '../types';
import type { MortgageTrack } from '../types';
import { allocatedAmount, remainingAmount } from '../engine';
import type { MixResult, TrackType } from '../engine';
import {
  meetsFixedUnlinkedRequirement,
  minAmountForTrack,
  minFixedUnlinkedAmount,
} from '../propertyContext';
import { TrackEditor } from './TrackEditor';
import {
  PrimeForwardChart,
  VariableForwardChart,
  previewPrimeForwardPoints,
  previewVariableForwardPoints,
} from './PrimeForwardChart';
import { formatShekel } from './primitives';
import { fallbackPrimeForecast } from '@/lib/prime-forward-curve';

interface MixEditorProps {
  result: MixResult;
  onUpdateTrack: (id: string, patch: Partial<MortgageTrack>) => void;
  onTrackAmountChange: (id: string, amount: number) => void;
  onRemoveTrack: (id: string) => void;
  onAddTrack: (type: TrackType) => void;
  onPrepay: (trackId: string) => void;
  onRefinance: (trackId: string) => void;
  onAmortization: (trackId: string) => void;
}

/**
 * פירוט התמהיל לעריכה — כל המסלולים, ומתחת למסלול התחתון הזמנה להשלים את
 * הסכום שטרם שובץ. כשהמשכנתא משובצת במלואה אין מה להוסיף, ולכן שורת הוספת
 * המסלול אינה מוצגת.
 */
export function MixEditor({
  result,
  onUpdateTrack,
  onTrackAmountChange,
  onRemoveTrack,
  onAddTrack,
  onPrepay,
  onRefinance,
  onAmortization,
}: MixEditorProps) {
  const [newType, setNewType] = useState<TrackType>('fixed_unlinked');

  const { mix } = result;
  const fixedShareOk = meetsFixedUnlinkedRequirement(mix);
  const remaining = remainingAmount(mix);
  const allocated = allocatedAmount(mix);

  const newPrimePreview = useMemo(() => {
    if (newType !== 'prime') return [];
    const forecast = mix.assumptions.primeForecast ?? fallbackPrimeForecast();
    return previewPrimeForwardPoints(
      DEFAULT_INTEREST_RATES.prime,
      mix.tracks[0]?.years ?? 25,
      forecast
    );
  }, [newType, mix.assumptions.primeForecast, mix.tracks]);

  const newVariablePreview = useMemo(() => {
    if (newType !== 'variable_unlinked') return [];
    const forecast = mix.assumptions.primeForecast ?? fallbackPrimeForecast();
    return previewVariableForwardPoints(
      DEFAULT_INTEREST_RATES.variable_unlinked,
      mix.tracks[0]?.years ?? 25,
      5,
      forecast
    );
  }, [newType, mix.assumptions.primeForecast, mix.tracks]);

  return (
    <div className="border-t border-slate-100 p-3 space-y-3">
      {!fixedShareOk && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-800 leading-relaxed">
            דרישת בנק ישראל: לפחות {MIN_FIXED_UNLINKED_PERCENT}% מהמשכנתא בריבית קבועה לא צמודה —{' '}
            {formatShekel(minFixedUnlinkedAmount(mix.totalAmount))}. הגדילו את המסלול הקבוע הלא צמוד
            כדי לעמוד בדרישה.
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        מסלולים
        <Badge variant="secondary" className="text-[10px]">
          {mix.tracks.length}
        </Badge>
        <span className="font-normal text-slate-400">
          {formatShekel(allocated)} מתוך {formatShekel(mix.totalAmount)}
        </span>
      </div>

      <div className="space-y-2">
        {result.tracks.map((trackResult) => (
          <TrackEditor
            key={trackResult.track.id}
            result={trackResult}
            totalAmount={mix.totalAmount}
            removable={mix.tracks.length > 1}
            minAmount={minAmountForTrack(mix, trackResult.track.id)}
            maxAmount={trackResult.track.amount + remaining}
            onUpdate={(patch) => onUpdateTrack(trackResult.track.id, patch)}
            onAmountChange={(amount) => onTrackAmountChange(trackResult.track.id, amount)}
            onRemove={() => onRemoveTrack(trackResult.track.id)}
            onPrepay={() => onPrepay(trackResult.track.id)}
            onRefinance={() => onRefinance(trackResult.track.id)}
            onAmortization={() => onAmortization(trackResult.track.id)}
          />
        ))}
      </div>

      {/* הוספת מסלול מוצעת רק כשיש סכום שטרם שובץ */}
      {remaining > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              הוסיפו מסלול כדי להשלים את הסכום — {formatShekel(remaining)} מסכום המשכנתא טרם שובצו
              במסלולים.
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={newType} onValueChange={(value) => setNewType(value as TrackType)}>
              <SelectTrigger className="h-8 w-[170px] bg-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRACK_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={() => onAddTrack(newType)}>
              <Plus className="h-3.5 w-3.5 ml-1" />
              הוסף מסלול על {formatShekel(remaining)}
            </Button>
          </div>
          {newType === 'prime' && (
            <PrimeForwardChart
              previewPoints={newPrimePreview}
              quotedRate={DEFAULT_INTEREST_RATES.prime}
              height={160}
            />
          )}
          {newType === 'variable_unlinked' && (
            <VariableForwardChart
              previewPoints={newVariablePreview}
              quotedRate={DEFAULT_INTEREST_RATES.variable_unlinked}
              height={160}
            />
          )}
        </div>
      )}
    </div>
  );
}
