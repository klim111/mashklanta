'use client';

import React from 'react';
import { Landmark } from 'lucide-react';
import { BANK_ACCOUNT_FIELDS, completeness } from '@/lib/principal-approval/schema';
import { bankLabel } from '@/lib/banks/banks';
import { useCase } from '../CaseContext';
import { FieldGrid } from '../fields/SmartField';
import { usePeopleOptions } from './PeopleSection';
import { AddButton, EntityCard, SectionHeader } from './SectionShell';

export function BankAccountsSection() {
  const { entities, valuesOf, addEntity, removeEntity } = useCase();
  const peopleOptions = usePeopleOptions();
  const accounts = entities('bankAccount');

  const totals = accounts.reduce(
    (acc, account) => {
      const c = completeness('bankAccount', valuesOf('bankAccount', account.id));
      return { filled: acc.filled + c.filled, total: acc.total + c.total };
    },
    { filled: 0, total: 0 },
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        title="חשבונות בנק"
        subtitle="בנק, סניף ומספר חשבון — עם שיוך לבעלי החשבון מבין הלווים והערבים"
        icon={Landmark}
        progress={totals.total > 0 ? totals : undefined}
        action={<AddButton label="הוספת חשבון" onClick={() => void addEntity('bankAccount')} />}
      />

      {accounts.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          טרם הוזנו חשבונות בנק
        </p>
      )}

      <div className="space-y-5">
        {accounts.map((account, index) => {
          const values = valuesOf('bankAccount', account.id);
          const owners = ((values.ownerIds as string[]) ?? [])
            .map((id) => peopleOptions.find((p) => p.value === id)?.label)
            .filter(Boolean);
          return (
            <EntityCard
              key={account.id}
              title={`חשבון ${index + 1}`}
              badge={
                values.bankCode ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {bankLabel(values.bankCode as string)}
                    {owners.length > 0 && ` · ${owners.join(', ')}`}
                  </span>
                ) : undefined
              }
              onRemove={accounts.length > 1 ? () => void removeEntity(account.id) : undefined}
            >
              <FieldGrid
                fields={BANK_ACCOUNT_FIELDS}
                entityType="bankAccount"
                entityId={account.id}
                peopleOptions={peopleOptions}
              />
            </EntityCard>
          );
        })}
      </div>
    </section>
  );
}
