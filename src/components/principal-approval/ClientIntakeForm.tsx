'use client';

/**
 * טופס פרטי הלקוח — טופס אחד, רציף, בלי טאבים.
 *
 * הוא מציג את חמשת החלקים הראשונים של תיק האישור העקרוני זה מתחת לזה: הלווים
 * וההכנסות, ההלוואה והנכס, מקורות המימון, חשבונות הבנק והערבים. תיק המסמכים
 * והאישורים לפי בנק לא נכללים — זה טופס לאיסוף מידע בלבד.
 *
 * כל שדה נשמר ברגע ההקלדה לאותו תיק שהשלב "אישור עקרוני" עובד עליו. השלמות
 * מידע מופיעות רק כשנבחר משהו שמצדיק אותן (ראו `visibleWhen` בסכמה), ואת
 * הערבים אפשר לסמן כ"לא רלוונטי". בסוף הטופס הלקוח לוחץ "שדר ליועץ", והיועץ
 * רואה את הדוח המסכם בתיק הלקוח.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgePercent,
  Building2,
  CheckCircle2,
  RefreshCw,
  Cloud,
  CloudOff,
  HandCoins,
  Loader2,
  Send,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CASE_FIELDS,
  GUARANTORS_RELEVANCE_OPTIONS,
  BORROWER_FIELDS,
  GUARANTOR_FIELDS,
  REFINANCE_GOAL_OPTIONS,
  completeness,
  type EntityType,
} from '@/lib/principal-approval/schema';
import { CaseProvider, useCase, CASE_ENTITY_ID } from './CaseContext';
import { ConflictResolver } from './ConflictResolver';
import { FieldGrid } from './fields/SmartField';
import { IncomeBlock } from './sections/IncomeBlock';
import { FundingSection } from './sections/FundingSection';
import { BankAccountsSection } from './sections/BankAccountsSection';
import { usePeopleOptions } from './sections/PeopleSection';
import { AddButton, EntityCard, SectionHeader } from './sections/SectionShell';
import { LocalCaseProvider, clearLocalCase } from './LocalCaseProvider';
import { LeadFileUpload, useLeadFiles } from '@/components/consult/LeadFileUpload';

/**
 * איזה טופס זה:
 * - `intake` — טופס פרטי הלקוח שהיועץ שולח ללקוח (/client-details-form)
 * - `TENDER` — "הגישו בקשות לכל הבנקים" מהעמוד הראשי (/tender-request)
 * - `REFINANCE_CHECK` — בדיקת מיחזור מהעמוד הראשי (/refinance-request)
 */
export type IntakeMode = 'intake' | 'TENDER' | 'REFINANCE_CHECK';

interface IntakeOptions {
  mode: IntakeMode;
  /** מבקר שלא מחובר — הטופס נשמר בדפדפן ונשלח בבת אחת */
  local: boolean;
  storageKey: string;
  files: ReturnType<typeof useLeadFiles>;
}

const IntakeOptionsContext = createContext<IntakeOptions | null>(null);

function useIntakeOptions(): IntakeOptions {
  const options = useContext(IntakeOptionsContext);
  if (!options) throw new Error('useIntakeOptions must be used inside ClientIntakeForm');
  return options;
}

const TITLES: Record<IntakeMode, { title: string; intro: string }> = {
  intake: {
    title: 'טופס פרטי הלקוח',
    intro: 'ממלאים פעם אחת את כל הפרטים לבקשת המשכנתא. כל שדה נשמר מיד, כך שאפשר לצאת ולחזור. בסוף הטופס לוחצים "שדר ליועץ".',
  },
  TENDER: {
    title: 'הגישו בקשות לכל הבנקים עם משכלנתא',
    intro: 'ממלאים פעם אחת את הפרטים, ומשכלנתא עושה מכרז ריביות מול כל הבנקים ודואגת להשיג לכם את הריביות הטובות ביותר.',
  },
  REFINANCE_CHECK: {
    title: 'בדיקת מיחזור משכנתא עם משכלנתא',
    intro: 'ממלאים פעם אחת את הפרטים ומצרפים דוח יתרות עדכני, ומשכלנתא בודקת מול כל הבנקים אם ואיך כדאי למחזר.',
  },
};

/** "הבדיקה בחינם" — מופיע בראש טופסי הבקשה ובעמוד הראשי */
export function FreeCheckNote({ mode }: { mode: 'TENDER' | 'REFINANCE_CHECK' }) {
  return (
    <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-base font-bold text-emerald-900 ring-1 ring-emerald-200">
      הבדיקה בחינם!{' '}
      <span className="font-medium">
        {mode === 'TENDER'
          ? 'משלמים רק אחרי שהשגנו לכם את הריביות.'
          : 'משלמים רק אם הושגו התנאים שביקשתם.'}
      </span>
    </p>
  );
}

/** שדות התיק שמוצגים במקום אחר בטופס, ולא בחלק "ההלוואה והנכס" */
const CASE_KEYS_ELSEWHERE = ['borrowersRelation', 'hasGuarantors', 'refinanceGoal'];
const LOAN_FIELDS = CASE_FIELDS.filter((field) => !CASE_KEYS_ELSEWHERE.includes(field.key));
const BORROWERS_RELATION_FIELDS = CASE_FIELDS.filter((field) => field.key === 'borrowersRelation');

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'long', timeStyle: 'short' });
}

function SaveStatus() {
  const { pendingCount, lastSavedAt } = useCase();
  if (pendingCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        שומר…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
      <Cloud className="h-3.5 w-3.5" />
      {lastSavedAt
        ? `נשמר ${lastSavedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
        : 'כל שדה נשמר אוטומטית'}
    </span>
  );
}

/** מה חסר בטופס — רק שדות חובה שמוצגים כרגע */
function useIntakeProgress() {
  const { data, valuesOf, entities } = useCase();
  const { mode, files } = useIntakeOptions();
  const filesReady = files.refs.length > 0;
  return useMemo(() => {
    const sections: { title: string; filled: number; total: number }[] = [];
    const sum = (title: string, rows: { type: EntityType; id: string }[], extra = { filled: 0, total: 0 }) => {
      let filled = extra.filled;
      let total = extra.total;
      rows.forEach(({ type, id }) => {
        const c = completeness(type, valuesOf(type, id));
        filled += c.filled;
        total += c.total;
      });
      sections.push({ title, filled, total });
    };
    if (!data) return { sections, filled: 0, total: 0 };

    const people = (type: 'borrower' | 'guarantor') =>
      entities(type).flatMap((person) => [
        { type, id: person.id } as { type: EntityType; id: string },
        ...entities('income', person.id).flatMap((income) => [
          { type: 'income' as EntityType, id: income.id },
          ...entities('prevEmployment', income.id).map((prev) => ({ type: 'prevEmployment' as EntityType, id: prev.id })),
        ]),
      ]);

    if (mode === 'REFINANCE_CHECK') {
      const goal = valuesOf('case', CASE_ENTITY_ID).refinanceGoal;
      sections.push({
        title: 'מטרת המיחזור ודוח היתרות',
        filled: (goal ? 1 : 0) + (filesReady ? 1 : 0),
        total: 2,
      });
    }
    sum('הלווים וההכנסות', people('borrower'));
    sum('ההלוואה והנכס', [{ type: 'case', id: CASE_ENTITY_ID }]);
    sum('מקורות המימון', entities('fundingSource').map((row) => ({ type: 'fundingSource' as EntityType, id: row.id })));
    sum('חשבונות הבנק', entities('bankAccount').map((row) => ({ type: 'bankAccount' as EntityType, id: row.id })));

    const guarantorsAnswer = valuesOf('case', CASE_ENTITY_ID).hasGuarantors;
    sum(
      'ערבים',
      guarantorsAnswer === 'yes' ? people('guarantor') : [],
      { filled: guarantorsAnswer ? 1 : 0, total: 1 },
    );

    const filled = sections.reduce((acc, s) => acc + s.filled, 0);
    const total = sections.reduce((acc, s) => acc + s.total, 0);
    return { sections, filled, total };
  }, [data, valuesOf, entities, mode, filesReady]);
}

function personName(values: Record<string, unknown>): string {
  return [values.firstName, values.lastName].filter(Boolean).join(' ').trim();
}

/** לווה או ערב אחד, עם מקורות ההכנסה שלו — הכל בכרטיס אחד, בלי טאבים */
function PersonCard({
  kind,
  personId,
  index,
  removable,
}: {
  kind: 'borrower' | 'guarantor';
  personId: string;
  index: number;
  removable: boolean;
}) {
  const { valuesOf, removeEntity } = useCase();
  const peopleOptions = usePeopleOptions();
  const noun = kind === 'borrower' ? 'לווה' : 'ערב';
  const name = personName(valuesOf(kind, personId));
  const label = name || `${noun} ${index + 1}`;

  return (
    <EntityCard
      title={name ? `${noun} ${index + 1} · ${name}` : `${noun} ${index + 1}`}
      onRemove={removable ? () => void removeEntity(personId) : undefined}
      removeLabel={`הסרת ה${noun}`}
    >
      <FieldGrid
        fields={kind === 'borrower' ? BORROWER_FIELDS : GUARANTOR_FIELDS}
        entityType={kind}
        entityId={personId}
        peopleOptions={peopleOptions.filter((option) => option.value !== personId)}
      />
      <div className="mt-6 border-t border-dashed border-slate-200 pt-5">
        <IncomeBlock personId={personId} personLabel={label} allowRemoveLast />
      </div>
    </EntityCard>
  );
}

function SectionNumber({ n }: { n: number }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-base font-black text-white">
      {n}
    </span>
  );
}

function FormSection({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <SectionNumber n={n} />
        <div className="min-w-0 flex-1 space-y-6">{children}</div>
      </div>
    </section>
  );
}

/** בדיקת מיחזור: בראש הטופס — מה המטרה, ודוח היתרות העדכני */
function RefinancePart() {
  const { valuesOf, setField } = useCase();
  const { files } = useIntakeOptions();
  const goal = valuesOf('case', CASE_ENTITY_ID).refinanceGoal as string | undefined;
  return (
    <section className="rounded-3xl border-2 border-violet-200 bg-white p-5 shadow-sm sm:p-7">
      <SectionHeader
        title="המיחזור שלכם"
        subtitle="מה המטרה במיחזור, ודוח יתרות עדכני מהבנק שבו המשכנתא היום"
        icon={RefreshCw}
      />
      <div className="mt-5 space-y-2">
        <p className="text-sm font-medium text-slate-700">
          מה המטרה שלכם במיחזור? <span className="text-rose-500">*</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {REFINANCE_GOAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setField('case', CASE_ENTITY_ID, 'refinanceGoal', option.value)}
              className={cn(
                'h-10 rounded-xl border px-4 text-sm font-semibold transition-all',
                goal === option.value
                  ? 'border-violet-300 bg-violet-50 text-violet-800 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <LeadFileUpload
          title="דוח יתרות עדכני *"
          hint="PDF או תמונה, עד 15MB. את הדוח מורידים מאתר הבנק או מבקשים בסניף. הוא נשמר בתיק המסמכים שלכם."
          state={files}
        />
      </div>
    </section>
  );
}

function BorrowersPart() {
  const { entities, addEntity } = useCase();
  const borrowers = entities('borrower');
  return (
    <FormSection n={1}>
      <SectionHeader
        title="הלווים וההכנסות"
        subtitle="פרטים אישיים, מצב משפחתי ותעסוקתי, וכל מקורות ההכנסה של כל לווה"
        icon={Users}
      />
      {borrowers.map((borrower, index) => (
        <PersonCard key={borrower.id} kind="borrower" personId={borrower.id} index={index} removable={index > 0} />
      ))}
      {borrowers.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <FieldGrid fields={BORROWERS_RELATION_FIELDS} entityType="case" entityId={CASE_ENTITY_ID} />
        </div>
      )}
      <AddButton label="הוספת לווה נוסף" onClick={() => void addEntity('borrower')} />
    </FormSection>
  );
}

function LoanPart() {
  return (
    <FormSection n={2}>
      <SectionHeader
        title="ההלוואה והנכס"
        subtitle="לוח זמנים, זכאות, הון עצמי ופרטי הנכס"
        icon={Building2}
      />
      <FieldGrid fields={LOAN_FIELDS} entityType="case" entityId={CASE_ENTITY_ID} />
    </FormSection>
  );
}

function GuarantorsPart() {
  const { entities, addEntity, valuesOf, setField, canEdit } = useCase();
  const answer = valuesOf('case', CASE_ENTITY_ID).hasGuarantors as string | undefined;
  const guarantors = entities('guarantor');
  const editable = canEdit('case', CASE_ENTITY_ID, 'hasGuarantors');

  const choose = async (value: string) => {
    setField('case', CASE_ENTITY_ID, 'hasGuarantors', value);
    // "יש ערבים" פותח מיד כרטיס לערב הראשון
    if (value === 'yes' && guarantors.length === 0) await addEntity('guarantor');
  };

  return (
    <FormSection n={5}>
      <SectionHeader
        title="ערבים"
        subtitle="לכל ערב נאספים אותם פרטים כמו ללווה, בתוספת הקרבה ללווה"
        icon={HandCoins}
      />
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">
          האם יש ערבים לבקשה? <span className="text-rose-500">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {GUARANTORS_RELEVANCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={!editable}
              onClick={() => void choose(option.value)}
              className={cn(
                'h-10 min-w-[8rem] rounded-xl border px-4 text-sm font-semibold transition-all',
                answer === option.value
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                !editable && 'cursor-not-allowed opacity-60',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {answer === 'not_relevant' && (
        <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
          סומן שאין ערבים לבקשה — אין צורך למלא את החלק הזה.
        </p>
      )}

      {answer === 'yes' && (
        <>
          {guarantors.map((guarantor, index) => (
            <PersonCard key={guarantor.id} kind="guarantor" personId={guarantor.id} index={index} removable />
          ))}
          <AddButton
            label={guarantors.length === 0 ? 'הוספת ערב' : 'הוספת ערב נוסף'}
            onClick={() => void addEntity('guarantor')}
          />
        </>
      )}
    </FormSection>
  );
}

/** הטופס כפי שנשלח לשרת ממבקר שלא מחובר */
function payloadOf(data: NonNullable<ReturnType<typeof useCase>['data']>) {
  return {
    caseValues: data.caseValues,
    entities: (Object.values(data.entities).flat()).map((entity) => ({
      id: entity.id,
      type: entity.type,
      parentId: entity.parentId,
      values: entity.values,
    })),
  };
}

function SubmitPart({ onSent }: { onSent: (at: string) => void }) {
  const { data, refresh } = useCase();
  const { mode, local, storageKey, files } = useIntakeOptions();
  const progress = useIntakeProgress();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);
  if (!data) return null;

  const isClient = data.viewer.role === 'client';
  const missing = progress.total - progress.filled;
  const submittedAt = sentAt ?? data.intakeSubmittedAt;
  const request = mode !== 'intake';
  const refinanceMissing =
    mode === 'REFINANCE_CHECK' && (!data.caseValues.refinanceGoal || files.refs.length === 0);

  const submit = async () => {
    if (refinanceMissing) {
      setError('לבדיקת מיחזור צריך לבחור מטרה ולצרף דוח יתרות עדכני (בראש הטופס)');
      setConfirming(false);
      return;
    }
    if (files.uploading) {
      setError('דוח היתרות עדיין עולה — רגע אחד ונסו שוב');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = request
        ? await fetch('/api/intake-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kind: mode,
              files: files.refs,
              ...(local ? { payload: payloadOf(data) } : {}),
            }),
          })
        : await fetch(`/api/principal-approval/case/${data.id}/intake-submit`, { method: 'POST' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'השידור נכשל');
      setConfirming(false);
      setSentAt(body?.submittedAt ?? new Date().toISOString());
      if (local) {
        clearLocalCase(storageKey);
        onSent(body?.submittedAt ?? new Date().toISOString());
        return;
      }
      if (request) onSent(body?.submittedAt ?? new Date().toISOString());
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? 'השידור נכשל');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border-2 border-blue-200 bg-blue-50/50 p-6 sm:p-8">
      <h2 className="text-subtitle font-bold text-slate-900">סיום הטופס</h2>

      {missing > 0 ? (
        <div className="mt-3 space-y-1">
          <p className="text-sm text-slate-700">
            חסרים עוד {missing} שדות חובה:
          </p>
          <ul className="list-inside list-disc text-sm text-slate-600">
            {progress.sections
              .filter((section) => section.total > section.filled)
              .map((section) => (
                <li key={section.title}>
                  {section.title} — {section.total - section.filled}
                </li>
              ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          כל שדות החובה מולאו.
        </p>
      )}

      {submittedAt && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          הטופס שודר ליועץ ב-{formatWhen(submittedAt)}. אפשר לעדכן פרטים ולשדר שוב.
        </p>
      )}

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {isClient ? (
        confirming ? (
          <div className="mt-5 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              עוד לא כל שדות החובה מולאו. אפשר לחזור ולהשלים, או לשדר כבר עכשיו ולהשלים אחר כך.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                לשדר בכל זאת
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 hover:border-slate-300"
              >
                חזרה להשלמה
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (missing > 0 ? setConfirming(true) : void submit())}
            disabled={busy}
            className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 text-lg font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            {submittedAt ? 'שדר שוב ליועץ' : 'שדר ליועץ'}
          </button>
        )
      ) : (
        <p className="mt-5 text-sm text-slate-500">
          הכפתור "שדר ליועץ" מופיע ללקוח בסוף הטופס.
        </p>
      )}
    </section>
  );
}

function SentScreen({ mode, at }: { mode: IntakeMode; at: string }) {
  return (
    <div className="intake-form mx-auto max-w-2xl px-4 py-16" dir="rtl">
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-center text-title font-black text-slate-900">הבקשה נשלחה</h1>
        <p className="mt-3 text-center text-base leading-relaxed text-slate-600">
          {mode === 'REFINANCE_CHECK'
            ? 'קיבלנו את הפרטים ואת דוח היתרות. נבדוק את המיחזור מול כל הבנקים ונחזור אליכם.'
            : 'קיבלנו את הפרטים. נצא למכרז ריביות מול כל הבנקים ונחזור אליכם עם התוצאות.'}
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">נשלח ב-{formatWhen(at)}</p>
        {mode !== 'intake' && (
          <div className="mt-6">
            <FreeCheckNote mode={mode} />
          </div>
        )}
      </div>
    </div>
  );
}

function IntakeShell() {
  const { data, loading, loadError, actionError, dismissActionError } = useCase();
  const { mode, local } = useIntakeOptions();
  const progress = useIntakeProgress();
  const [sentAt, setSentAt] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-base">טוען את הטופס…</p>
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <CloudOff className="mx-auto mb-3 h-8 w-8 text-rose-400" />
        <h2 className="text-subtitle font-bold text-rose-900">לא ניתן לטעון את הטופס</h2>
        <p className="mt-1 text-sm text-rose-700">{loadError ?? 'שגיאה לא ידועה'}</p>
      </div>
    );
  }

  const percent = progress.total === 0 ? 0 : Math.round((progress.filled / progress.total) * 100);
  // מבקר שלא מחובר — אחרי השליחה הטופס נסגר ומוצג אישור
  if (local && sentAt) return <SentScreen mode={mode} at={sentAt} />;
  const copy = TITLES[mode];

  return (
    <div className="intake-form mx-auto max-w-5xl space-y-6 px-4 py-8" dir="rtl">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-title font-black tracking-tight text-slate-900">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
              {data.viewer.role === 'advisor'
                ? `אתם ממלאים את הטופס של ${data.client.name ?? data.client.email}. כל שדה נשמר מיד בתיק שלו, והלקוח יראה אותו כבר מלא כשיפתח את הקישור. מה שהלקוח ממלא מופיע כאן בלי רענון.`
                : copy.intro}
            </p>
            {local && (
              <p className="mt-2 text-sm text-slate-500">
                מה שתמלאו נשמר בדפדפן הזה עד שתלחצו "שדר ליועץ".
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <SaveStatus />
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-44 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    percent === 100 ? 'bg-emerald-500' : 'bg-blue-600',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-700">{percent}%</span>
            </div>
          </div>
        </div>
      </header>

      {actionError && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="flex items-start gap-2 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {actionError}
          </p>
          <button type="button" onClick={dismissActionError} className="text-rose-400 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {mode !== 'intake' && <FreeCheckNote mode={mode} />}

      <ConflictResolver />

      {mode === 'REFINANCE_CHECK' && <RefinancePart />}
      <BorrowersPart />
      <LoanPart />
      <FormSection n={3}>
        <FundingSection />
      </FormSection>
      <FormSection n={4}>
        <BankAccountsSection />
      </FormSection>
      <GuarantorsPart />
      <SubmitPart onSent={setSentAt} />
    </div>
  );
}

/**
 * הטופס. בלי `clientRecordId` הוא נפתח על התיק של הלקוח המחובר; עם
 * `clientRecordId` (יועץ) — על התיק של אותו לקוח, למילוי ולעריכה. עם `local`
 * הוא עובד בדפדפן בלבד, למבקר שלא מחובר.
 */
export function ClientIntakeForm({
  clientRecordId,
  mode = 'intake',
  local = false,
}: {
  clientRecordId?: string;
  mode?: IntakeMode;
  /** מבקר שלא מחובר: הטופס נשמר בדפדפן ונשלח בבת אחת בסוף */
  local?: boolean;
}) {
  const files = useLeadFiles();
  const storageKey = `mashkalanta:intake:${mode}`;
  const options = { mode, local, storageKey, files };
  const body = (
    <IntakeOptionsContext.Provider value={options}>
      <div className="min-h-screen bg-slate-50">
        <IntakeShell />
      </div>
    </IntakeOptionsContext.Provider>
  );
  if (local) return <LocalCaseProvider storageKey={storageKey}>{body}</LocalCaseProvider>;
  return <CaseProvider clientRecordId={clientRecordId}>{body}</CaseProvider>;
}
