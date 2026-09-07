'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { HandCoins, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const noun = kind === 'borrower' ? 'לווה' : 'ערב';

  // Each person gets their own tab rather than a stack of long cards.
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = people.find((person) => person.id === activeId) ?? people[0] ?? null;

  useEffect(() => {
    if (people.length > 0 && !people.some((person) => person.id === activeId)) {
      setActiveId(people[0].id);
    }
  }, [people, activeId]);

  /** The tab is named after the person as soon as they have a name. */
  const tabLabel = (personId: string, index: number) => {
    const values = valuesOf(kind, personId);
    const name = [values.firstName, values.lastName].filter(Boolean).join(' ').trim();
    return name || `${noun} ${index + 1}`;
  };

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
            onClick={async () => {
              const created = await addEntity(kind);
              if (created) setActiveId(created.id);
            }}
          />
        }
      />

      {people.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          {kind === 'borrower' ? 'טרם הוזנו לווים' : 'לא הוגדרו ערבים לתיק זה'}
        </p>
      )}

      {people.length > 0 && (
        <>
          {/* Tab per person — the label follows the name they type. */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            {people.map((person, index) => {
              const c = completeness(kind, valuesOf(kind, person.id));
              const isActive = active?.id === person.id;
              const removable = kind === 'guarantor' || index > 0;
              return (
                <div key={person.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveId(person.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all',
                      isActive
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700',
                      removable && 'pl-8',
                    )}
                  >
                    <span className="max-w-[180px] truncate">{tabLabel(person.id, index)}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                        isActive
                          ? 'bg-white/15 text-white'
                          : c.ratio === 1
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700',
                      )}
                    >
                      {c.filled}/{c.total}
                    </span>
                  </button>
                  {removable && (
                    <button
                      type="button"
                      aria-label={`הסרת ${tabLabel(person.id, index)}`}
                      onClick={() => void removeEntity(person.id)}
                      className={cn(
                        'absolute inset-y-0 left-2 my-auto flex h-5 w-5 items-center justify-center rounded-md transition-colors',
                        isActive ? 'text-white/60 hover:bg-white/15' : 'text-slate-300 hover:bg-rose-50 hover:text-rose-600',
                      )}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {active && (
            <EntityCard
              key={active.id}
              title={tabLabel(active.id, people.findIndex((p) => p.id === active.id))}
            >
              <FieldGrid
                fields={fields}
                entityType={kind}
                entityId={active.id}
                peopleOptions={peopleOptions.filter((p) => p.value !== active.id)}
              />

              <div className="mt-6 border-t border-dashed border-slate-200 pt-5">
                <IncomeBlock
                  personId={active.id}
                  personLabel={tabLabel(active.id, people.findIndex((p) => p.id === active.id))}
                />
              </div>
            </EntityCard>
          )}
        </>
      )}
    </section>
  );
}
