'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { DEAL_TYPES } from '@/components/mortgage-advisor/types';

export interface ClientDetailsValues {
  phone: string | null;
  household: 'SINGLE' | 'COUPLE';
  age: number | null;
  partnerName: string | null;
  partnerAge: number | null;
  income: number | null;
  partnerIncome: number | null;
  expenses: number | null;
  existingLoans: number | null;
  propertyValue: number | null;
  propertyAddress: string | null;
  mortgageAmount: number | null;
  dealType: keyof typeof DEAL_TYPES | null;
  notes: string | null;
}

/** קבוצות השדות בטופס — כדי ששלב בתהליך יבקש רק את מה שרלוונטי לו */
export type ClientDetailsSection = 'household' | 'income' | 'deal' | 'notes';

const ALL_SECTIONS: ClientDetailsSection[] = ['household', 'income', 'deal', 'notes'];

interface ClientDetailsFormProps {
  values: ClientDetailsValues;
  onSubmit: (values: Partial<ClientDetailsValues>) => Promise<void>;
  onCancel?: () => void;
  /** אילו קבוצות שדות להציג. ברירת המחדל — כולן */
  sections?: ClientDetailsSection[];
  submitLabel?: string;
  /** מוצג אחרי שמירה מוצלחת, כשהטופס נשאר פתוח בתוך שלב */
  confirmOnSave?: boolean;
}

/**
 * טופס פרטי הלקוח. אלה הנתונים שמאכלסים את כרטיסי הסיכום בראש הדף — הרכב משק
 * הבית, ההכנסות שמהן נגזר התזרים, ופרטי העסקה.
 */
export function ClientDetailsForm({
  values,
  onSubmit,
  onCancel,
  sections = ALL_SECTIONS,
  submitLabel = 'שמור פרטים',
  confirmOnSave = false,
}: ClientDetailsFormProps) {
  const [draft, setDraft] = useState<ClientDetailsValues>(values);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const shows = (section: ClientDetailsSection) => sections.includes(section);

  const set = <K extends keyof ClientDetailsValues>(key: K, value: ClientDetailsValues[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    await onSubmit(draft);
    setBusy(false);
    if (confirmOnSave) setSaved(true);
  };

  const couple = draft.household === 'COUPLE';

  return (
    <form onSubmit={submit} className="space-y-4">
      {shows('household') && (
      <Section title="משק הבית">
        <Field label="הרכב">
          <div className="flex gap-1.5">
            {(['SINGLE', 'COUPLE'] as const).map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={draft.household === option ? 'default' : 'outline'}
                className="h-9 flex-1 text-xs"
                onClick={() => set('household', option)}
              >
                {option === 'SINGLE' ? 'יחיד' : 'זוג'}
              </Button>
            ))}
          </div>
        </Field>
        <Field label="גיל">
          <NumberField value={draft.age} onChange={(value) => set('age', value)} max={120} />
        </Field>
        {couple && (
          <>
            <Field label="שם בן/בת הזוג">
              <Input
                value={draft.partnerName ?? ''}
                onChange={(event) => set('partnerName', event.target.value)}
                className="h-9 text-sm"
              />
            </Field>
            <Field label="גיל בן/בת הזוג">
              <NumberField
                value={draft.partnerAge}
                onChange={(value) => set('partnerAge', value)}
                max={120}
              />
            </Field>
          </>
        )}
        <Field label="טלפון">
          <Input
            value={draft.phone ?? ''}
            onChange={(event) => set('phone', event.target.value)}
            className="h-9 text-sm"
          />
        </Field>
      </Section>
      )}

      {shows('income') && (
      <Section title="הכנסות והוצאות חודשיות">
        <Field label="הכנסה">
          <MoneyField value={draft.income} onChange={(value) => set('income', value)} />
        </Field>
        {couple && (
          <Field label="הכנסת בן/בת הזוג">
            <MoneyField
              value={draft.partnerIncome}
              onChange={(value) => set('partnerIncome', value)}
            />
          </Field>
        )}
        <Field label="הוצאות">
          <MoneyField value={draft.expenses} onChange={(value) => set('expenses', value)} />
        </Field>
        <Field label="החזרי הלוואות קיימות">
          <MoneyField
            value={draft.existingLoans}
            onChange={(value) => set('existingLoans', value)}
          />
        </Field>
      </Section>
      )}

      {shows('deal') && (
      <Section title="העסקה">
        <Field label="כתובת הנכס">
          <Input
            value={draft.propertyAddress ?? ''}
            onChange={(event) => set('propertyAddress', event.target.value)}
            placeholder="לא חובה"
            className="h-9 text-sm"
          />
        </Field>
        <Field label="עלות הנכס">
          <MoneyField value={draft.propertyValue} onChange={(value) => set('propertyValue', value)} />
        </Field>
        <Field label="גובה המשכנתא">
          <MoneyField
            value={draft.mortgageAmount}
            onChange={(value) => set('mortgageAmount', value)}
          />
        </Field>
        <Field label="סוג העסקה">
          <select
            value={draft.dealType ?? ''}
            onChange={(event) =>
              set('dealType', (event.target.value || null) as keyof typeof DEAL_TYPES | null)
            }
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
          >
            <option value="">לא נקבע</option>
            {Object.entries(DEAL_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </Section>
      )}

      {shows('notes') && (
        <div>
          <p className="text-[11px] font-semibold text-slate-500 mb-1">הערות</p>
          <textarea
            value={draft.notes ?? ''}
            onChange={(event) => set('notes', event.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-200 p-2 text-sm"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="h-9" disabled={busy}>
          {busy ? 'שומר...' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" className="h-9" onClick={onCancel}>
            ביטול
          </Button>
        )}
        {saved && !busy && <span className="text-xs font-semibold text-emerald-600">נשמר</span>}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-2">{title}</p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function MoneyField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <FormattedNumberValueInput
      value={value}
      onValueChange={(next) => onChange(next > 0 ? next : null)}
      className="h-9 text-sm"
      placeholder="₪"
    />
  );
}

function NumberField({
  value,
  onChange,
  max,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
}) {
  return (
    <Input
      type="number"
      min={0}
      max={max}
      value={value ?? ''}
      onChange={(event) => {
        const next = Number(event.target.value);
        onChange(event.target.value === '' || !Number.isFinite(next) ? null : next);
      }}
      className="h-9 text-sm"
    />
  );
}
