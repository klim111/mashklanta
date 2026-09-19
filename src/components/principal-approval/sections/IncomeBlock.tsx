'use client';

import React from 'react';
import { Briefcase, History, TriangleAlert } from 'lucide-react';
import {
  INCOME_FIELDS,
  PREV_EMPLOYMENT_FIELDS,
  PREV_EMPLOYMENT_THRESHOLD_MONTHS,
} from '@/lib/principal-approval/schema';
import { monthsSince } from '@/lib/principal-approval/format';
import { useCase } from '../CaseContext';
import { FieldGrid } from '../fields/SmartField';
import { AddButton, EntityCard } from './SectionShell';

/**
 * All income rows of a single borrower / guarantor.
 * When the seniority at the current employer is under a year, a previous
 * employment block is required and is opened automatically.
 */
export function IncomeBlock({ personId, personLabel }: { personId: string; personLabel: string }) {
  const { entities, valuesOf, addEntity, removeEntity } = useCase();
  const incomes = entities('income', personId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
          <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
          מקורות ההכנסה של {personLabel}
        </p>
        <AddButton label="הוספת מקור הכנסה" onClick={() => void addEntity('income', personId)} />
      </div>

      {incomes.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
          טרם הוזנו מקורות הכנסה
        </p>
      )}

      {incomes.map((income, index) => {
        const values = valuesOf('income', income.id);
        const months = monthsSince(values.employmentStartDate as string | null);
        const needsPrevious =
          months !== null && months < PREV_EMPLOYMENT_THRESHOLD_MONTHS;
        const prevEmployments = entities('prevEmployment', income.id);

        return (
          <EntityCard
            key={income.id}
            tone="muted"
            title={`הכנסה ${index + 1}`}
            badge={
              months !== null ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                  ותק: {months} חודשים
                </span>
              ) : undefined
            }
            onRemove={incomes.length > 1 ? () => void removeEntity(income.id) : undefined}
          >
            <FieldGrid fields={INCOME_FIELDS} entityType="income" entityId={income.id} />

            {needsPrevious && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-800">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    ותק אצל המעסיק נמוך משנה — נדרש פירוט מקום עבודה קודם
                  </p>
                  <AddButton
                    label="הוספת מקום עבודה קודם"
                    onClick={() => void addEntity('prevEmployment', income.id)}
                  />
                </div>

                {prevEmployments.length === 0 && (
                  <p className="text-xs text-amber-700">
                    יש להוסיף לפחות מקום עבודה קודם אחד עם כל פרטי התעסוקה.
                  </p>
                )}

                <div className="space-y-4">
                  {prevEmployments.map((prev, prevIndex) => (
                    <div key={prev.id} className="rounded-xl border border-amber-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                          <History className="h-3.5 w-3.5 text-amber-500" />
                          מקום עבודה קודם {prevIndex + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => void removeEntity(prev.id)}
                          className="text-[11px] font-medium text-slate-400 hover:text-rose-600"
                        >
                          הסרה
                        </button>
                      </div>
                      <FieldGrid
                        fields={PREV_EMPLOYMENT_FIELDS}
                        entityType="prevEmployment"
                        entityId={prev.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </EntityCard>
        );
      })}
    </div>
  );
}
