'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, PiggyBank, Scale, TriangleAlert } from 'lucide-react';
import {
  FUNDING_SOURCE_FIELDS,
  FUNDING_SOURCE_OPTIONS,
  completeness,
} from '@/lib/principal-approval/schema';
import { validateFundingTotals } from '@/lib/principal-approval/validation';
import { formatCurrency } from '@/lib/principal-approval/format';
import { useCase, CASE_ENTITY_ID } from '../CaseContext';
import { FieldGrid } from '../fields/SmartField';
import { AddButton, EntityCard, SectionHeader } from './SectionShell';

/**
 * Funding sources, reconciled live against the declared total equity — the sum
 * of the sources must equal the equity figure entered for all borrowers.
 */
export function FundingSection() {
  const { entities, valuesOf, addEntity, removeEntity } = useCase();
  const sources = entities('fundingSource');
  const caseValues = valuesOf('case', CASE_ENTITY_ID);
  const declaredEquity = (caseValues.totalEquity as number | null) ?? null;

  const reconciliation = useMemo(() => {
    const amounts = sources.map((source) => ({
      amount: (valuesOf('fundingSource', source.id).amount as number | null) ?? null,
    }));
    return validateFundingTotals(amounts, declaredEquity);
  }, [sources, valuesOf, declaredEquity]);

  const totals = sources.reduce(
    (acc, source) => {
      const c = completeness('fundingSource', valuesOf('fundingSource', source.id));
      return { filled: acc.filled + c.filled, total: acc.total + c.total };
    },
    { filled: 0, total: 0 },
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        title="מקורות מימון"
        subtitle="פירוט ההון העצמי לפי מקור — הסכום חייב להשתוות להון העצמי שהוזן"
        icon={PiggyBank}
        progress={totals.total > 0 ? totals : undefined}
        action={<AddButton label="הוספת מקור מימון" onClick={() => void addEntity('fundingSource')} />}
      />

      {/* Live reconciliation strip */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${
          reconciliation.valid
            ? 'border-emerald-200 bg-emerald-50/60'
            : 'border-amber-200 bg-amber-50/60'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              reconciliation.valid ? 'bg-emerald-500' : 'bg-amber-500'
            } text-white`}
          >
            {reconciliation.valid ? <CheckCircle2 className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-[13px] font-bold text-slate-800">
              סך מקורות המימון: {formatCurrency(reconciliation.sum)}
            </p>
            <p className="text-[12px] text-slate-500">
              הון עצמי שהוזן: {declaredEquity === null ? '— טרם הוזן' : formatCurrency(declaredEquity)}
            </p>
          </div>
        </div>

        {reconciliation.valid ? (
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white">
            הסכומים תואמים
          </span>
        ) : (
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-800">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            {reconciliation.error}
          </p>
        )}
      </div>

      <div className="space-y-5">
        {sources.map((source, index) => {
          const values = valuesOf('fundingSource', source.id);
          const typeLabel = FUNDING_SOURCE_OPTIONS.find((o) => o.value === values.sourceType)?.label;
          return (
            <EntityCard
              key={source.id}
              title={`מקור מימון ${index + 1}`}
              badge={
                typeLabel ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {typeLabel}
                    {values.amount ? ` · ${formatCurrency(values.amount as number)}` : ''}
                  </span>
                ) : undefined
              }
              onRemove={sources.length > 1 ? () => void removeEntity(source.id) : undefined}
            >
              <FieldGrid
                fields={FUNDING_SOURCE_FIELDS}
                entityType="fundingSource"
                entityId={source.id}
              />
            </EntityCard>
          );
        })}
      </div>
    </section>
  );
}
