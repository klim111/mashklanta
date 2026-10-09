'use client';

import React from 'react';
import { formatILS } from '@/lib/currency';

/**
 * שורת תרחיש: מצב קיים או תרחיש, עם ההפרש מהמצב הקיים בכל סעיף. משמשת את
 * טאב האיחוד ואת טאב האסטרטגיה בדאשבורד. בלי נתונים (stats ריק) השורה מוצגת
 * עם תיבות ריקות — עד שהלקוח מזין את מה שחסר.
 */

export interface ScenarioStats {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  principal: number;
  months: number;
}

export function ScenarioRow({
  title,
  subtitle,
  stats,
  baseline,
  tone,
}: {
  title: string;
  subtitle?: string;
  stats: ScenarioStats | null;
  baseline?: ScenarioStats;
  tone: 'current' | 'scenario' | 'best';
}) {
  const tones = {
    current: 'border-slate-200 bg-white',
    scenario: 'border-emerald-300 bg-emerald-50',
    best: 'border-violet-300 bg-violet-50',
  } as const;
  const titleTones = {
    current: 'text-slate-900',
    scenario: 'text-emerald-900',
    best: 'text-violet-900',
  } as const;

  return (
    <div className={`rounded-xl border p-2.5 ${tones[tone]}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(150px,1.2fr)_repeat(5,1fr)] lg:items-center">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <p className={`text-sm font-bold leading-tight ${titleTones[tone]}`}>{title}</p>
          {subtitle && <p className="text-2xs text-slate-500">{subtitle}</p>}
        </div>
        <DeltaCell label="החזר חודשי" value={stats?.monthlyPayment ?? null} baseline={baseline?.monthlyPayment} emphasized />
        <DeltaCell label="סך ריבית" value={stats?.totalInterest ?? null} baseline={baseline?.totalInterest} />
        <DeltaCell label="סך תשלום" value={stats?.totalPaid ?? null} baseline={baseline?.totalPaid} />
        <DeltaCell label="קרן" value={stats?.principal ?? null} baseline={baseline?.principal} />
        <DeltaCell
          label="סיום"
          value={stats?.months ?? null}
          baseline={baseline?.months}
          format="months"
        />
      </div>
    </div>
  );
}

function DeltaCell({
  label,
  value,
  baseline,
  format = 'currency',
  emphasized = false,
}: {
  label: string;
  value: number | null;
  baseline?: number;
  format?: 'currency' | 'months';
  emphasized?: boolean;
}) {
  const delta = typeof baseline === 'number' && value !== null ? value - baseline : undefined;
  const threshold = format === 'months' ? 0.5 : 1;
  const hasDelta = typeof delta === 'number' && Math.abs(delta) > threshold;
  const improved = (delta ?? 0) < 0;
  const deltaText = !hasDelta
    ? null
    : format === 'months'
      ? `${improved ? '−' : '+'}${Math.abs(Math.round(delta as number))} ח׳`
      : `${improved ? '−' : '+'}${formatILS(Math.abs(delta as number))}`;

  return (
    <div className="min-w-0">
      <p className="text-2xs text-slate-500">{label}</p>
      <p
        className={`truncate font-bold leading-tight ${
          emphasized ? 'text-info text-blue-700' : 'text-sm text-slate-900'
        }`}
      >
        {value === null ? '—' : format === 'months' ? `${Math.round(value)} ח׳` : formatILS(value)}
      </p>
      {deltaText && (
        <p className={`text-2xs font-bold ${improved ? 'text-emerald-600' : 'text-rose-600'}`}>
          {deltaText}
        </p>
      )}
    </div>
  );
}

