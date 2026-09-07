'use client';

import React, { useMemo } from 'react';
import { HandCoins, Users } from 'lucide-react';
import {
  BORROWER_FIELDS,
  GUARANTOR_FIELDS,
  completeness,
  type EntityType,
  type Option,
} from '@/lib/principal-approval/schema';
import { useCase } from '../CaseContext';
import { FieldGrid } from '../fields/SmartField';
import { IncomeBlock } from './IncomeBlock';
import { AddButton, EntityCard, SectionHeader } from './SectionShell';

export function usePeopleOptions(): Option[] {
  const { entities, valuesOf } = useCase();
  return useMemo(() => {
    const build = (type: EntityType, prefix: string) =>
      entities(type).map((entity, index) => {
        const values = valuesOf(type, entity.id);
        const name = [values.firstName, values.lastName].filter(Boolean).join(' ').trim();
        return { value: entity.id, label: name || `${prefix} ${index + 1}` };
      });
    return [...build('borrower', 'לווה'), ...build('guarantor', 'ערב')];
  }, [entities, valuesOf]);
}

/**
 * Borrowers or guarantors — identical field set, with the guarantor variant
 * adding the relationship to the borrower.
 */
export function PeopleSection({ kind }: { kind: 'borrower' | 'guarantor' }) {
  const { entities, valuesOf, addEntity, removeEntity } = useCase();
  const peopleOptions = usePeopleOptions();
  const people = entities(kind);
  const fields = kind === 'borrower' ? BORROWER_FIELDS : GUARANTOR_FIELDS;

  const totals = people.reduce(
    (acc, person) => {
      const c = completeness(kind, valuesOf(kind, person.id));
      return { filled: acc.filled + c.filled, total: acc.total + c.total };
    },
    { filled: 0, total: 0 },
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        title={kind === 'borrower' ? 'פרטי הלווים' : 'ערבים'}
        subtitle={
          kind === 'borrower'
            ? 'פרטים אישיים, מצב משפחתי ותעסוקתי, והכנסות לכל לווה'
            : 'לכל ערב נאספים אותם פרטים כמו ללווה, בתוספת הקרבה ללווה'
        }
        icon={kind === 'borrower' ? Users : HandCoins}
        progress={totals.total > 0 ? totals : undefined}
        action={
          <AddButton
            label={kind === 'borrower' ? 'הוספת לווה' : 'הוספת ערב'}
            onClick={() => void addEntity(kind)}
          />
        }
      />

      {people.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          {kind === 'borrower' ? 'טרם הוזנו לווים' : 'לא הוגדרו ערבים לתיק זה'}
        </p>
      )}

      <div className="space-y-6">
        {people.map((person, index) => {
          const values = valuesOf(kind, person.id);
          const name = [values.firstName, values.lastName].filter(Boolean).join(' ').trim();
          const c = completeness(kind, values);
          return (
            <EntityCard
              key={person.id}
              title={`${kind === 'borrower' ? 'לווה' : 'ערב'} ${index + 1}${name ? ` · ${name}` : ''}`}
              badge={
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    c.ratio === 1
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                  }`}
                >
                  {c.filled}/{c.total} שדות חובה
                </span>
              }
              onRemove={
                kind === 'guarantor' || index > 0 ? () => void removeEntity(person.id) : undefined
              }
            >
              <FieldGrid
                fields={fields}
                entityType={kind}
                entityId={person.id}
                peopleOptions={peopleOptions.filter((p) => p.value !== person.id)}
              />

              <div className="mt-6 border-t border-dashed border-slate-200 pt-5">
                <IncomeBlock
                  personId={person.id}
                  personLabel={name || `${kind === 'borrower' ? 'לווה' : 'ערב'} ${index + 1}`}
                />
              </div>
            </EntityCard>
          );
        })}
      </div>
    </section>
  );
}
