'use client';

import React, { useMemo, useState } from 'react';
import { Award, CalendarClock, Landmark, TimerReset } from 'lucide-react';
import { UNIFORM_BASKETS } from '@/lib/mortgage-plan';
import { TRACK_TYPES } from '@/components/mortgage-advisor/types';
import {
  compareRatesByTrack,
  type ApprovalSummary,
} from '@/lib/principal-approval/plan-bridge';
import {
  APPROVAL_RATES_VALIDITY_DAYS,
  APPROVAL_VALIDITY_MONTHS,
} from '@/lib/principal-approval/schema';
import { formatCurrency, formatDate } from '@/lib/principal-approval/format';
import { cn } from '@/lib/utils';
import { approvalValidity } from './sections/BankApprovalsSection';

const trackLabel = (type: string) => (TRACK_TYPES as Record<string, string>)[type] ?? type;

/**
 * The per-bank half of the report: a tab per bank with its approval validity and
 * the rates it quoted for the three uniform baskets, then one table comparing
 * every track across banks and marking the cheapest.
 */
export function BankApprovalsReport({ approvals }: { approvals: ApprovalSummary[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = approvals.find((a) => a.entityId === activeId) ?? approvals[0] ?? null;
  const comparison = useMemo(() => compareRatesByTrack(approvals), [approvals]);
  const quoted = comparison.filter((row) => Object.keys(row.byBank).length > 0);
  const bankNames = useMemo(
    () => Array.from(new Set(approvals.map((a) => a.bankName).filter((b): b is string => Boolean(b)))),
    [approvals],
  );

  if (approvals.length === 0) {
    return (
      <section className="break-inside-avoid space-y-3">
        <h2 className="border-r-4 border-indigo-500 pr-3 text-[15px] font-bold text-slate-900">
          אישורים עקרוניים לפי בנק
        </h2>
        <p className="text-[12px] text-slate-400">טרם הוגשה בקשה לאישור עקרוני</p>
      </section>
    );
  }

  return (
    <section className="break-inside-avoid space-y-4">
      <h2 className="border-r-4 border-indigo-500 pr-3 text-[15px] font-bold text-slate-900">
        אישורים עקרוניים לפי בנק
      </h2>

      {/* Bank tabs — on paper every bank is printed in full instead. */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {approvals.map((approval, index) => {
          const isActive = active?.entityId === approval.entityId;
          return (
            <button
              key={approval.entityId}
              type="button"
              onClick={() => setActiveId(approval.entityId)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all',
                isActive
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              )}
            >
              <Landmark className="h-3.5 w-3.5" />
              {approval.bankName || `בנק ${index + 1}`}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                  isActive
                    ? 'bg-white/15 text-white'
                    : approval.approved
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500',
                )}
              >
                {approval.approved ? 'אושר' : 'ממתין'}
              </span>
            </button>
          );
        })}
      </div>

      {approvals.map((approval) => (
        <BankPanel
          key={approval.entityId}
          approval={approval}
          hidden={active?.entityId !== approval.entityId}
        />
      ))}

      {/* Cross-bank comparison */}
      {quoted.length > 0 && bankNames.length > 0 && (
        <div className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-slate-800">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            ריכוז הריביות לכל מסלול — איזה בנק זול יותר
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1.5 text-right font-medium">מסלול</th>
                  {bankNames.map((bank) => (
                    <th key={bank} className="py-1.5 text-right font-medium">
                      {bank}
                    </th>
                  ))}
                  <th className="py-1.5 text-right font-medium">הזול ביותר</th>
                </tr>
              </thead>
              <tbody>
                {quoted.map((row) => (
                  <tr key={row.trackType} className="border-b border-slate-100">
                    <td className="py-1.5 font-semibold text-slate-800">{trackLabel(row.trackType)}</td>
                    {bankNames.map((bank) => {
                      const rate = row.byBank[bank];
                      const isBest = rate !== undefined && bank === row.bestBank;
                      return (
                        <td
                          key={bank}
                          className={cn(
                            'py-1.5',
                            isBest ? 'font-bold text-emerald-700' : 'text-slate-600',
                          )}
                        >
                          {rate === undefined ? '—' : `${rate.toFixed(2)}%`}
                        </td>
                      );
                    })}
                    <td className="py-1.5 font-bold text-emerald-700">
                      {row.bestBank ? `${row.bestBank} · ${row.bestRate?.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            לכל בנק נלקחה הריבית הנמוכה ביותר שנקב למסלול, מבין הסלים שבהם הוא מופיע.
          </p>
        </div>
      )}
    </section>
  );
}

function BankPanel({ approval, hidden }: { approval: ApprovalSummary; hidden: boolean }) {
  const validity = approvalValidity(approval.approvedAt);

  return (
    <div
      className={cn(
        'break-inside-avoid rounded-xl border border-slate-200 bg-slate-50/50 p-4',
        // On screen only the selected bank shows; in print every bank is included.
        hidden && 'hidden print:block',
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-bold text-slate-800">{approval.bankName ?? 'בנק'}</h3>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            approval.approved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600',
          )}
        >
          {approval.approved ? 'אושר' : 'ממתין לתשובה'}
        </span>
      </div>

      <dl className="mb-3 grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
        <Fact label="תאריך ההגשה" value={formatDate(approval.submittedAt)} />
        <Fact label="תאריך האישור" value={formatDate(approval.approvedAt)} />
        <Fact
          label="הסכום שאושר"
          value={approval.approvedAmount === null ? '—' : formatCurrency(approval.approvedAmount)}
        />
        <Fact label="בנקאי מטפל" value={approval.bankerName ?? '—'} />
      </dl>

      {approval.approved && approval.approvedAt && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <ValidityLine
            icon={CalendarClock}
            label={`תוקף האישור (${APPROVAL_VALIDITY_MONTHS} חודשים)`}
            date={validity.approvalValidUntil}
            daysLeft={validity.approvalDaysLeft}
          />
          <ValidityLine
            icon={TimerReset}
            label={`תוקף הריביות (${APPROVAL_RATES_VALIDITY_DAYS} ימים)`}
            date={validity.ratesValidUntil}
            daysLeft={validity.ratesDaysLeft}
          />
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-3">
        {UNIFORM_BASKETS.map((basket) => {
          const rates = approval.basketRates[basket.id] ?? {};
          return (
            <div key={basket.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <h4 className="mb-2 text-[12px] font-bold text-slate-700">{basket.name}</h4>
              <ul className="space-y-1">
                {basket.tracks.map((track) => (
                  <li key={track.type} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="text-slate-500">{trackLabel(track.type)}</span>
                    <span className="font-semibold text-slate-800">
                      {rates[track.type] === undefined ? '—' : `${rates[track.type].toFixed(2)}%`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-dashed border-slate-200 pb-1.5">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-[13px] font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function ValidityLine({
  icon: Icon,
  label,
  date,
  daysLeft,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  date: string | null;
  daysLeft: number | null;
}) {
  const expired = daysLeft !== null && daysLeft < 0;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px]',
        expired ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50',
      )}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', expired ? 'text-rose-500' : 'text-emerald-500')} />
      <span className="text-slate-500">{label}:</span>
      <span className="font-bold text-slate-800">{formatDate(date)}</span>
      {daysLeft !== null && (
        <span className={cn('text-[11px]', expired ? 'text-rose-600' : 'text-emerald-600')}>
          {expired ? `פג לפני ${Math.abs(daysLeft)} ימים` : `נותרו ${daysLeft} ימים`}
        </span>
      )}
    </div>
  );
}
