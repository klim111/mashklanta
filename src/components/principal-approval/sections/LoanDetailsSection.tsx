'use client';

import React from 'react';
import { Building2, MapPinned } from 'lucide-react';
import { CASE_FIELDS, completeness } from '@/lib/principal-approval/schema';
import { useCase, CASE_ENTITY_ID } from '../CaseContext';
import { FieldGrid } from '../fields/SmartField';
import { SectionHeader } from './SectionShell';

const TIMING_KEYS = ['loanTimeframe', 'borrowersRelation', 'hasEligibility', 'eligibilityAmount', 'eligibilityCertificateDate', 'totalEquity'];

export function LoanDetailsSection() {
  const { valuesOf, entities } = useCase();
  const values = valuesOf('case', CASE_ENTITY_ID);
  const c = completeness('case', values);

  const timingFields = CASE_FIELDS.filter((f) => TIMING_KEYS.includes(f.key));
  const propertyFields = CASE_FIELDS.filter((f) => !TIMING_KEYS.includes(f.key));

  // Surface the workplace/property city comparison as a live hint.
  const propertyCity = String(values.propertyCity ?? '').trim();
  const employerCities = entities('income')
    .map((income) => String(valuesOf('income', income.id).employerCity ?? '').trim())
    .filter(Boolean);
  const cityMatch = propertyCity !== '' && employerCities.some((c2) => c2 === propertyCity);

  return (
    <section className="space-y-6">
      <SectionHeader
        title="פרטי ההלוואה והנכס"
        subtitle="לוח זמנים, זכאות, הון עצמי ופרטי הנכס הנרכש"
        icon={Building2}
        progress={{ filled: c.filled, total: c.total }}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-800">לוח זמנים, זכאות והון עצמי</h3>
        <FieldGrid fields={timingFields} entityType="case" entityId={CASE_ENTITY_ID} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-800">הנכס</h3>
        <FieldGrid fields={propertyFields} entityType="case" entityId={CASE_ENTITY_ID} />

        {propertyCity && employerCities.length > 0 && (
          <p
            className={`mt-4 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] ${
              cityMatch ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
            }`}
          >
            <MapPinned className="h-3.5 w-3.5 shrink-0" />
            {cityMatch
              ? `עיר הנכס (${propertyCity}) זהה לעיר מקום התעסוקה — יש לוודא שהתשובה על "הדירה נקנתה במקום התעסוקה" היא כן.`
              : `עיר הנכס (${propertyCity}) שונה מערי מקום התעסוקה שהוזנו (${employerCities.join(', ')}).`}
          </p>
        )}
      </div>
    </section>
  );
}
