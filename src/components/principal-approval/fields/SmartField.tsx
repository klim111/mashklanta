'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { EntityType, FieldDef, Option } from '@/lib/principal-approval/schema';
import { isFieldRequired, isFieldVisible } from '@/lib/principal-approval/schema';
import { digitsOnly } from '@/lib/principal-approval/format';
import { provenanceLabel } from '@/lib/principal-approval/access';
import { ACTIVE_BANKS } from '@/lib/banks/banks';
import { COUNTRIES } from '@/lib/principal-approval/countries';
import { useCase } from '../CaseContext';
import { FieldShell, inputClass } from './FieldShell';
import { NumericInput } from './NumericInput';
import { Combobox, MultiCombobox, type ComboboxOption } from './Combobox';
import { BranchSelect } from './BranchSelect';
import { ChildAgesInput, CountStepper } from './ChildAgesInput';

interface SmartFieldProps {
  field: FieldDef;
  entityType: EntityType;
  entityId: string;
  /** Options for `optionsSource: 'people'` (borrowers / guarantors of the case). */
  peopleOptions?: Option[];
}

export function SmartField({ field, entityType, entityId, peopleOptions = [] }: SmartFieldProps) {
  const {
    data,
    valuesOf,
    metaOf,
    errorOf,
    saveStateOf,
    canEdit,
    setField,
  } = useCase();

  const values = valuesOf(entityType, entityId);
  if (!isFieldVisible(field, values)) return null;

  const value = values[field.key];
  const meta = metaOf(entityType, entityId, field.key);
  const error = errorOf(entityType, entityId, field.key);
  const saveState = saveStateOf(entityType, entityId, field.key);
  const editable = canEdit(entityType, entityId, field.key);
  const readOnly = !editable;
  const required = isFieldRequired(field, values);
  const provenance = data ? provenanceLabel(data.viewer, meta) : null;
  const inputId = `${entityType}-${entityId}-${field.key}`;

  const readOnlyReason =
    readOnly && data?.viewer.role === 'advisor'
      ? 'השדה הוזן על ידי הלקוח. ניתן לערוך רק לאחר שהלקוח יעניק הרשאת עריכה.'
      : undefined;

  const update = (next: unknown) => setField(entityType, entityId, field.key, next);

  const shell = (children: React.ReactNode) => (
    <FieldShell
      label={field.label}
      required={required}
      help={field.help}
      error={error}
      saveState={saveState}
      provenance={provenance}
      meta={meta}
      readOnly={readOnly}
      readOnlyReason={readOnlyReason}
      span={field.span}
      htmlFor={inputId}
    >
      {children}
    </FieldShell>
  );

  switch (field.kind) {
    case 'money':
    case 'number':
    case 'percent':
    case 'integer': {
      if (field.key === 'childrenUnder21') {
        return shell(
          <CountStepper
            value={(value as number) ?? null}
            onChange={(n) => update(n)}
            readOnly={readOnly}
            min={field.min ?? 0}
            max={field.max ?? 20}
          />,
        );
      }
      return shell(
        <NumericInput
          id={inputId}
          value={(value as number) ?? null}
          onChange={(n) => update(n)}
          placeholder={field.placeholder}
          suffix={field.suffix ?? (field.kind === 'percent' ? '%' : undefined)}
          readOnly={readOnly}
          error={error}
          integer={field.kind === 'integer'}
        />,
      );
    }

    case 'boolean':
      return shell(
        <div className="flex gap-2">
          {[
            { label: 'כן', v: true },
            { label: 'לא', v: false },
          ].map((option) => (
            <button
              key={String(option.v)}
              type="button"
              disabled={readOnly}
              onClick={() => update(option.v)}
              className={cn(
                'h-10 flex-1 rounded-xl border text-sm font-medium transition-all',
                value === option.v
                  ? option.v
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'border-slate-300 bg-slate-100 text-slate-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                readOnly && 'cursor-not-allowed opacity-60',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>,
      );

    case 'select': {
      if (field.optionsSource === 'branches') {
        const bankCode = (values[field.dependsOn ?? 'bankCode'] as string) ?? null;
        return shell(
          <BranchSelect
            id={inputId}
            bankCode={bankCode}
            value={(value as string) ?? null}
            onChange={(v) => update(v)}
            readOnly={readOnly}
            error={error}
          />,
        );
      }

      let options: ComboboxOption[];
      if (field.optionsSource === 'banks') {
        options = ACTIVE_BANKS.map((b) => ({ value: b.code, label: `${b.name} (${b.code})` }));
      } else if (field.optionsSource === 'countries') {
        options = COUNTRIES.map((c) => ({ value: c.value, label: c.label }));
      } else if (field.optionsSource === 'people') {
        options = peopleOptions.map((p) => ({ value: p.value, label: p.label }));
      } else {
        options = (field.options ?? []).map((o) => ({ value: o.value, label: o.label }));
      }

      // Short lists render as pills — faster to scan than a drop-down.
      if (!field.optionsSource && options.length > 0 && options.length <= 5) {
        return shell(
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={readOnly}
                onClick={() => update(option.value)}
                className={cn(
                  'h-9 rounded-xl border px-3 text-[13px] font-medium transition-all',
                  value === option.value
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                  readOnly && 'cursor-not-allowed opacity-60',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>,
        );
      }

      return shell(
        <Combobox
          id={inputId}
          value={(value as string) ?? null}
          options={options}
          onChange={(v) => update(v)}
          readOnly={readOnly}
          error={error}
          placeholder={field.placeholder ?? 'בחר…'}
        />,
      );
    }

    case 'multiselect': {
      if (field.key === 'childrenAges') {
        const count = Number(values.childrenUnder21 ?? 0);
        return shell(
          <ChildAgesInput
            count={count}
            value={(value as number[]) ?? []}
            onChange={(next) => update(next)}
            readOnly={readOnly}
          />,
        );
      }
      const options: ComboboxOption[] =
        field.optionsSource === 'people'
          ? peopleOptions.map((p) => ({ value: p.value, label: p.label }))
          : field.optionsSource === 'countries'
            ? COUNTRIES.map((c) => ({ value: c.value, label: c.label }))
            : (field.options ?? []).map((o) => ({ value: o.value, label: o.label }));

      return shell(
        <MultiCombobox
          id={inputId}
          value={(value as string[]) ?? []}
          options={options}
          onChange={(next) => update(next)}
          readOnly={readOnly}
          error={error}
          placeholder={field.placeholder ?? 'בחר…'}
        />,
      );
    }

    case 'date':
    case 'pastDate':
    case 'futureDate':
      return shell(
        <input
          id={inputId}
          type="date"
          className={inputClass({ error, readOnly })}
          value={(value as string) ?? ''}
          readOnly={readOnly}
          disabled={readOnly}
          max={field.kind === 'pastDate' ? new Date().toISOString().slice(0, 10) : undefined}
          min={field.kind === 'futureDate' ? new Date().toISOString().slice(0, 10) : undefined}
          onChange={(e) => update(e.target.value || null)}
        />,
      );

    case 'israeliId':
      return shell(
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          dir="ltr"
          className={`${inputClass({ error, readOnly })} text-right tracking-widest`}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => update(digitsOnly(e.target.value, 9))}
        />,
      );

    case 'phone':
      return shell(
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          dir="ltr"
          className={`${inputClass({ error, readOnly })} text-right`}
          value={(value as string) ?? ''}
          placeholder={field.placeholder ?? '050-1234567'}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => update(e.target.value.replace(/[^\d+\-\s]/g, ''))}
        />,
      );

    case 'zip':
      return shell(
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          dir="ltr"
          className={`${inputClass({ error, readOnly })} text-right tracking-widest`}
          value={(value as string) ?? ''}
          placeholder={field.placeholder ?? '7 ספרות'}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => update(digitsOnly(e.target.value, 7))}
        />,
      );

    case 'bankAccount':
      return shell(
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          dir="ltr"
          className={`${inputClass({ error, readOnly })} text-right tracking-wider`}
          value={(value as string) ?? ''}
          placeholder={field.placeholder ?? 'מספר חשבון'}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => update(digitsOnly(e.target.value, 12))}
        />,
      );

    case 'email':
      return shell(
        <input
          id={inputId}
          type="email"
          dir="ltr"
          className={`${inputClass({ error, readOnly })} text-right`}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => update(e.target.value.trim())}
        />,
      );

    case 'textarea':
      return shell(
        <textarea
          id={inputId}
          rows={3}
          className={`${inputClass({ error, readOnly })} h-auto py-2 leading-relaxed`}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => update(e.target.value)}
        />,
      );

    case 'name':
    case 'text':
    default:
      return shell(
        <input
          id={inputId}
          type="text"
          className={inputClass({ error, readOnly })}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => update(e.target.value)}
        />,
      );
  }
}

/** Renders a whole field group in the standard three-column responsive grid. */
export function FieldGrid({
  fields,
  entityType,
  entityId,
  peopleOptions,
}: {
  fields: FieldDef[];
  entityType: EntityType;
  entityId: string;
  peopleOptions?: Option[];
}) {
  const rendered = useMemo(() => fields, [fields]);
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-3">
      {rendered.map((field) => (
        <SmartField
          key={field.key}
          field={field}
          entityType={entityType}
          entityId={entityId}
          peopleOptions={peopleOptions}
        />
      ))}
    </div>
  );
}
