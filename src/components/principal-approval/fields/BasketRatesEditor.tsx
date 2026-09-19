'use client';

import React from 'react';
import { Percent } from 'lucide-react';
import { UNIFORM_BASKETS } from '@/lib/mortgage-plan';
import { TRACK_TYPES } from '@/components/mortgage-advisor/types';
import { NumericInput } from '@/components/ui/numeric-input';
import { cn } from '@/lib/utils';

export type BasketRates = Record<string, Record<string, number | null>>;

/**
 * The rates a bank quoted for each of the three uniform baskets.
 * Each basket lists every track it contains exactly once, so the grid is
 * basket × track — the same shape the planning flow already stores.
 */
export function BasketRatesEditor({
  value,
  onChange,
  readOnly,
}: {
  value: BasketRates;
  onChange: (next: BasketRates) => void;
  readOnly?: boolean;
}) {
  const rates = value ?? {};

  const setRate = (basketId: string, trackType: string, rate: number | null) => {
    const next: BasketRates = { ...rates, [basketId]: { ...(rates[basketId] ?? {}) } };
    if (rate === null) delete next[basketId][trackType];
    else next[basketId][trackType] = rate;
    onChange(next);
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {UNIFORM_BASKETS.map((basket) => {
        const filled = basket.tracks.filter(
          (track) => typeof rates[basket.id]?.[track.type] === 'number',
        ).length;
        return (
          <div key={basket.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[13px] font-bold text-slate-800">{basket.name}</h4>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    filled === basket.tracks.length
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {filled}/{basket.tracks.length}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{basket.description}</p>
            </div>

            <div className="space-y-2">
              {basket.tracks.map((track) => (
                <div key={track.type} className="flex items-center justify-between gap-2">
                  <label className="text-[12px] text-slate-600">
                    {TRACK_TYPES[track.type] ?? track.type}
                    <span className="mr-1 text-[10px] text-slate-400">
                      {Math.round(track.share * 100)}%
                    </span>
                  </label>
                  <div className="relative w-24">
                    <NumericInput
                      value={rates[basket.id]?.[track.type] ?? null}
                      onChange={(next) => setRate(basket.id, track.type, next)}
                      max={20}
                      readOnly={readOnly}
                      disabled={readOnly}
                      placeholder="0.00"
                      className={cn(
                        'h-9 w-full rounded-lg border border-slate-200 bg-white px-2 pl-6 text-sm shadow-sm',
                        'focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-50',
                        readOnly && 'bg-slate-50 text-slate-500',
                      )}
                    />
                    <Percent className="pointer-events-none absolute inset-y-0 left-2 my-auto h-3 w-3 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
