'use client';

import React from 'react';
import { BadgeCheck, CalendarClock, Landmark, TimerReset } from 'lucide-react';
import {
  APPROVAL_RATES_VALIDITY_DAYS,
  APPROVAL_VALIDITY_MONTHS,
  BANK_APPROVAL_FIELDS,
  completeness,
} from '@/lib/principal-approval/schema';
import { addDays, addMonths, daysUntil, formatCurrency, formatDate } from '@/lib/principal-approval/format';
import { cn } from '@/lib/utils';
import { carriedApproval, toApprovalSummary } from '@/lib/principal-approval/plan-bridge';
import { useCase } from '../CaseContext';
import { FieldGrid } from '../fields/SmartField';
import { AddButton, EntityCard, SectionHeader } from './SectionShell';

/**
 * Validity dates are never asked for: an approval is good for three months from
 * the day it was given, and the rates inside it for 24 days. Both are derived
 * here so the two places that show them can never drift apart.
 */
export function approvalValidity(approvedAt: unknown): {
  approvalValidUntil: string | null;
  ratesValidUntil: string | null;
  approvalDaysLeft: number | null;
  ratesDaysLeft: number | null;
} {
  const iso = typeof approvedAt === 'string' && approvedAt !== '' ? approvedAt : null;
  const approvalValidUntil = addMonths(iso, APPROVAL_VALIDITY_MONTHS);
  const ratesValidUntil = addDays(iso, APPROVAL_RATES_VALIDITY_DAYS);
  return {
    approvalValidUntil,
    ratesValidUntil,
    approvalDaysLeft: daysUntil(approvalValidUntil),
    ratesDaysLeft: daysUntil(ratesValidUntil),
  };
}

function ValidityChip({
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
  const soon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2',
        expired
          ? 'border-rose-200 bg-rose-50'
          : soon
            ? 'border-amber-200 bg-amber-50'
            : 'border-emerald-200 bg-emerald-50',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          expired ? 'text-rose-500' : soon ? 'text-amber-500' : 'text-emerald-500',
        )}
      />
      <div>
        <p className="text-[10px] font-medium text-slate-500">{label}</p>
        <p className="text-[13px] font-bold text-slate-800">
          {formatDate(date)}
          {daysLeft !== null && (
            <span
              className={cn(
                'mr-1.5 text-[11px] font-medium',
                expired ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-emerald-600',
              )}
            >
              {expired ? `פג לפני ${Math.abs(daysLeft)} ימים` : `נותרו ${daysLeft} ימים`}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * One principal approval per bank. The same request usually goes to several
 * banks, and each answers with its own amount and its own rates for the three
 * uniform baskets — which is what the comparison in the report is built on.
 */
export function BankApprovalsSection() {
  const { entities, valuesOf, addEntity, removeEntity } = useCase();
  const approvals = entities('bankApproval');

  // The plan carries one bank forward into the mix stage — say which, out loud.
  const carried = carriedApproval(
    approvals.map((approval) => toApprovalSummary(approval.id, valuesOf('bankApproval', approval.id))),
  );

  const totals = approvals.reduce(
    (acc, approval) => {
      const c = completeness('bankApproval', valuesOf('bankApproval', approval.id));
      return { filled: acc.filled + c.filled, total: acc.total + c.total };
    },
    { filled: 0, total: 0 },
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        title="אישור עקרוני לפי בנק"
        subtitle="לכל בנק שאליו הוגשה הבקשה — הסכום שאושר והריביות לשלושת הסלים האחידים"
        icon={Landmark}
        progress={totals.total > 0 ? totals : undefined}
        action={<AddButton label="הוספת בנק" onClick={() => void addEntity('bankApproval')} />}
      />

      {approvals.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          טרם הוגשה בקשה לאישור עקרוני. יש להוסיף את הבנק הראשון שאליו הוגשה הבקשה.
        </p>
      )}

      {carried?.bankName && (
        <p className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-2.5 text-[12px] text-indigo-900">
          הריביות של <strong>{carried.bankName}</strong> הן אלה שימשיכו לשלב בניית התמהיל. כדי להמשיך
          עם בנק אחר, יש לסמן אותו כמאושר לפני האחרים.
        </p>
      )}

      <div className="space-y-5">
        {approvals.map((approval, index) => {
          const values = valuesOf('bankApproval', approval.id);
          const approved = values.approved === true;
          const validity = approvalValidity(values.approvedAt);
          return (
            <EntityCard
              key={approval.id}
              title={typeof values.bankName === 'string' && values.bankName !== ''
                ? values.bankName
                : `אישור עקרוני ${index + 1}`}
              badge={
                approved ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    <BadgeCheck className="h-2.5 w-2.5" />
                    אושר{' '}
                    {typeof values.approvedAmount === 'number'
                      ? formatCurrency(values.approvedAmount)
                      : ''}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    ממתין לתשובה
                  </span>
                )
              }
              onRemove={() => void removeEntity(approval.id)}
            >
              <FieldGrid
                fields={BANK_APPROVAL_FIELDS}
                entityType="bankApproval"
                entityId={approval.id}
              />

              {approved && Boolean(values.approvedAt) && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <ValidityChip
                    icon={CalendarClock}
                    label={`תוקף האישור (${APPROVAL_VALIDITY_MONTHS} חודשים)`}
                    date={validity.approvalValidUntil}
                    daysLeft={validity.approvalDaysLeft}
                  />
                  <ValidityChip
                    icon={TimerReset}
                    label={`תוקף הריביות (${APPROVAL_RATES_VALIDITY_DAYS} ימים)`}
                    date={validity.ratesValidUntil}
                    daysLeft={validity.ratesDaysLeft}
                  />
                </div>
              )}
            </EntityCard>
          );
        })}
      </div>
    </section>
  );
}
