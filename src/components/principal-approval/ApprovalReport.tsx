'use client';

import React, { useMemo } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import {
  BANK_ACCOUNT_FIELDS,
  BORROWER_FIELDS,
  CASE_FIELDS,
  FUNDING_SOURCE_FIELDS,
  GUARANTOR_FIELDS,
  INCOME_FIELDS,
  PREV_EMPLOYMENT_FIELDS,
  type EntityType,
  type FieldDef,
} from '@/lib/principal-approval/schema';
import { COUNTRIES } from '@/lib/principal-approval/countries';
import { bankLabel } from '@/lib/banks/banks';
import { formatCurrency, formatDate, formatNumber, yearsSince } from '@/lib/principal-approval/format';
import { validateFundingTotals } from '@/lib/principal-approval/validation';
import { useCase, CASE_ENTITY_ID } from './CaseContext';
import { usePeopleOptions } from './sections/PeopleSection';

function renderValue(def: FieldDef, raw: unknown, peopleLabels: Map<string, string>): string {
  if (raw === null || raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0)) return '—';

  switch (def.kind) {
    case 'boolean':
      return raw === true || raw === 'true' ? 'כן' : 'לא';
    case 'money':
      return formatCurrency(Number(raw));
    case 'number':
    case 'integer':
      return formatNumber(Number(raw));
    case 'percent':
      return `${formatNumber(Number(raw))}%`;
    case 'date':
    case 'pastDate':
    case 'futureDate':
      return formatDate(String(raw));
    case 'select': {
      if (def.optionsSource === 'banks') return bankLabel(String(raw));
      if (def.optionsSource === 'people') return peopleLabels.get(String(raw)) ?? String(raw);
      return def.options?.find((o) => o.value === raw)?.label ?? String(raw);
    }
    case 'multiselect': {
      const list = Array.isArray(raw) ? raw : [raw];
      if (def.optionsSource === 'countries') {
        return list.map((v) => COUNTRIES.find((c) => c.value === v)?.label ?? String(v)).join(', ');
      }
      if (def.optionsSource === 'people') {
        return list.map((v) => peopleLabels.get(String(v)) ?? String(v)).join(', ');
      }
      return list.join(', ');
    }
    default:
      return String(raw);
  }
}

function DataGrid({
  fields,
  values,
  peopleLabels,
}: {
  fields: FieldDef[];
  values: Record<string, unknown>;
  peopleLabels: Map<string, string>;
}) {
  const filled = fields.filter((f) => {
    const v = values[f.key];
    return !(v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0));
  });
  if (filled.length === 0) {
    return <p className="text-[12px] text-slate-400">לא הוזנו נתונים</p>;
  }
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3">
      {filled.map((field) => (
        <div key={field.key} className="break-inside-avoid border-b border-dashed border-slate-100 pb-1.5">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{field.label}</dt>
          <dd className="text-[13px] font-semibold text-slate-800">
            {renderValue(field, values[field.key], peopleLabels)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid space-y-3">
      <h2 className="border-r-4 border-indigo-500 pr-3 text-[15px] font-bold text-slate-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/**
 * Prints just the report sheet.
 *
 * The body class scopes the print stylesheet to this report — the global print
 * rules are shared with the rate-request letter (`.rr-print-root`), so hiding
 * "everything else" must never be in force outside this dialog.
 */
function printReport() {
  const body = document.body;
  body.classList.add('printing-approval-report');
  const cleanup = () => {
    body.classList.remove('printing-approval-report');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  try {
    window.print();
  } finally {
    // Safari/Firefox fire afterprint reliably; this is the belt-and-braces path
    // for browsers where the dialog is modal and afterprint never arrives.
    setTimeout(cleanup, 1000);
  }
}

/**
 * Print-ready summary of everything collected in the approval flow.
 * "הורדה כ-PDF" uses the browser print pipeline (Save as PDF), so no extra
 * dependency or server round-trip is needed and the output honours the RTL
 * print stylesheet in `globals.css`.
 */
export function ApprovalReport() {
  const { data, valuesOf, entities } = useCase();
  const peopleOptions = usePeopleOptions();
  const peopleLabels = useMemo(
    () => new Map(peopleOptions.map((p) => [p.value, p.label])),
    [peopleOptions],
  );

  const caseValues = valuesOf('case', CASE_ENTITY_ID);
  const borrowers = entities('borrower');
  const guarantors = entities('guarantor');
  const accounts = entities('bankAccount');
  const fundingSources = entities('fundingSource');

  const totalMonthlyIncome = useMemo(
    () =>
      entities('income').reduce(
        (sum, income) => sum + Number(valuesOf('income', income.id).monthlyAmount ?? 0),
        0,
      ),
    [entities, valuesOf],
  );

  const reconciliation = useMemo(
    () =>
      validateFundingTotals(
        fundingSources.map((s) => ({ amount: (valuesOf('fundingSource', s.id).amount as number) ?? null })),
        (caseValues.totalEquity as number) ?? null,
      ),
    [fundingSources, valuesOf, caseValues.totalEquity],
  );

  if (!data) return null;

  const generatedAt = new Date().toLocaleString('he-IL', { dateStyle: 'long', timeStyle: 'short' });
  const clientName = data.client.name ?? data.client.email ?? '—';
  const propertyPrice = (caseValues.propertyPrice as number) ?? null;
  const totalEquity = (caseValues.totalEquity as number) ?? null;
  const requestedLoan =
    propertyPrice !== null && totalEquity !== null ? Math.max(propertyPrice - totalEquity, 0) : null;
  const ltv =
    propertyPrice && requestedLoan !== null && propertyPrice > 0
      ? Math.round((requestedLoan / propertyPrice) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900">דוח אישור עקרוני</h2>
          <p className="text-[13px] text-slate-500">סיכום מלא של כל הנתונים שנאספו, מוכן להגשה לבנק</p>
        </div>
        <button
          type="button"
          onClick={printReport}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:shadow-xl"
        >
          <Download className="h-4 w-4" />
          הורדת הדוח כ-PDF
        </button>
      </div>

      <article id="approval-report" className="report-sheet space-y-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Letterhead */}
        <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">בקשה לאישור עקרוני למשכנתא</h1>
              <p className="text-[13px] text-slate-500">
                {clientName} · הופק בתאריך {generatedAt}
              </p>
            </div>
          </div>
          <div className="text-left text-[11px] text-slate-400">
            <p>מספר תיק: {data.id.slice(-8).toUpperCase()}</p>
            {data.advisor && <p>יועץ מטפל: {data.advisor.name ?? data.advisor.email}</p>}
          </div>
        </header>

        {/* Headline figures */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'מחיר הנכס', value: formatCurrency(propertyPrice) },
            { label: 'הון עצמי', value: formatCurrency(totalEquity) },
            { label: 'סכום משכנתא מבוקש', value: formatCurrency(requestedLoan) },
            { label: 'שיעור מימון', value: ltv === null ? '—' : `${ltv}%` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{stat.label}</p>
              <p className="mt-0.5 text-[15px] font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <ReportSection title="פרטי הלווים">
          {borrowers.map((borrower, index) => {
            const values = valuesOf('borrower', borrower.id);
            const age = yearsSince(values.birthDate as string);
            const name = [values.firstName, values.lastName].filter(Boolean).join(' ');
            return (
              <div key={borrower.id} className="break-inside-avoid rounded-xl border border-slate-150 bg-slate-50/50 p-4">
                <h3 className="mb-3 text-[13px] font-bold text-slate-800">
                  לווה {index + 1}
                  {name && ` · ${name}`}
                  {age !== null && <span className="mr-2 font-normal text-slate-500">(גיל {age})</span>}
                </h3>
                <DataGrid fields={BORROWER_FIELDS} values={values} peopleLabels={peopleLabels} />

                {entities('income', borrower.id).map((income, incomeIndex) => {
                  const incomeValues = valuesOf('income', income.id);
                  const previous = entities('prevEmployment', income.id);
                  return (
                    <div key={income.id} className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                      <h4 className="mb-2 text-[12px] font-bold text-slate-700">הכנסה {incomeIndex + 1}</h4>
                      <DataGrid fields={INCOME_FIELDS} values={incomeValues} peopleLabels={peopleLabels} />
                      {previous.map((prev, prevIndex) => (
                        <div key={prev.id} className="mt-3 rounded-lg bg-amber-50/60 p-3">
                          <h5 className="mb-2 text-[11px] font-bold text-amber-800">
                            מקום עבודה קודם {prevIndex + 1}
                          </h5>
                          <DataGrid
                            fields={PREV_EMPLOYMENT_FIELDS}
                            values={valuesOf('prevEmployment', prev.id)}
                            peopleLabels={peopleLabels}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
          <p className="text-[13px] font-semibold text-slate-700">
            סך ההכנסות החודשיות של כל הלווים והערבים: {formatCurrency(totalMonthlyIncome)}
          </p>
        </ReportSection>

        <ReportSection title="חשבונות בנק">
          <div className="space-y-2">
            {accounts.length === 0 && <p className="text-[12px] text-slate-400">לא הוזנו חשבונות</p>}
            {accounts.map((account, index) => (
              <div key={account.id} className="break-inside-avoid rounded-xl border border-slate-150 bg-slate-50/50 p-4">
                <h3 className="mb-2 text-[13px] font-bold text-slate-800">חשבון {index + 1}</h3>
                <DataGrid
                  fields={BANK_ACCOUNT_FIELDS}
                  values={valuesOf('bankAccount', account.id)}
                  peopleLabels={peopleLabels}
                />
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="פרטי ההלוואה והנכס">
          <DataGrid fields={CASE_FIELDS} values={caseValues} peopleLabels={peopleLabels} />
        </ReportSection>

        <ReportSection title="מקורות מימון">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-1.5 text-right font-medium">מקור</th>
                <th className="py-1.5 text-right font-medium">סכום</th>
                <th className="py-1.5 text-right font-medium">מועד זמינות</th>
                <th className="py-1.5 text-right font-medium">פירוט</th>
              </tr>
            </thead>
            <tbody>
              {fundingSources.map((source) => {
                const values = valuesOf('fundingSource', source.id);
                const typeField = FUNDING_SOURCE_FIELDS.find((f) => f.key === 'sourceType')!;
                return (
                  <tr key={source.id} className="border-b border-slate-100">
                    <td className="py-1.5 font-semibold text-slate-800">
                      {renderValue(typeField, values.sourceType, peopleLabels)}
                    </td>
                    <td className="py-1.5 text-slate-700">{formatCurrency((values.amount as number) ?? null)}</td>
                    <td className="py-1.5 text-slate-500">{formatDate(values.expectedDate as string)}</td>
                    <td className="py-1.5 text-slate-500">{(values.details as string) || '—'}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-900">
                <td className="py-2 font-bold text-slate-900">סה"כ מקורות מימון</td>
                <td className="py-2 font-bold text-slate-900">{formatCurrency(reconciliation.sum)}</td>
                <td colSpan={2} className="py-2 text-slate-500">
                  {reconciliation.valid
                    ? 'תואם להון העצמי שהוזן'
                    : `אינו תואם להון העצמי שהוזן (${formatCurrency(totalEquity)})`}
                </td>
              </tr>
            </tbody>
          </table>
        </ReportSection>

        {guarantors.length > 0 && (
          <ReportSection title="ערבים">
            {guarantors.map((guarantor, index) => {
              const values = valuesOf('guarantor', guarantor.id);
              const name = [values.firstName, values.lastName].filter(Boolean).join(' ');
              return (
                <div key={guarantor.id} className="break-inside-avoid rounded-xl border border-slate-150 bg-slate-50/50 p-4">
                  <h3 className="mb-3 text-[13px] font-bold text-slate-800">
                    ערב {index + 1}
                    {name && ` · ${name}`}
                  </h3>
                  <DataGrid fields={GUARANTOR_FIELDS} values={values} peopleLabels={peopleLabels} />
                  {entities('income', guarantor.id).map((income, incomeIndex) => (
                    <div key={income.id} className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                      <h4 className="mb-2 text-[12px] font-bold text-slate-700">הכנסה {incomeIndex + 1}</h4>
                      <DataGrid
                        fields={INCOME_FIELDS}
                        values={valuesOf('income', income.id)}
                        peopleLabels={peopleLabels}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </ReportSection>
        )}

        <footer className="border-t border-slate-200 pt-4 text-[10px] leading-relaxed text-slate-400">
          <p>
            הדוח הופק אוטומטית מתוך הנתונים שהוזנו במערכת ומשקף את המידע נכון למועד ההפקה. אין בדוח זה משום
            אישור עקרוני או התחייבות של גורם מממן כלשהו.
          </p>
          <p className="mt-1 flex items-center gap-1">
            <Printer className="h-2.5 w-2.5" />
            להורדה כקובץ PDF יש לבחור "שמירה כ-PDF" בחלון ההדפסה.
          </p>
        </footer>
      </article>
    </div>
  );
}
