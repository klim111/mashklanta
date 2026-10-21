'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CalendarCheck, CalendarDays, Check, Landmark, Loader2 } from 'lucide-react';
import type { PlanData, SigningData } from '@/lib/mortgage-plan';
import type { ClientTaskView } from '@/lib/client-tasks';
import { finalAuctionBank } from '@/lib/rate-validity';
import { SIGNING_VISITS, SIGNING_VISIT_KEYS, visitDay, visitDueAt } from '@/lib/signing-visits';
import type { SigningVisitKey, SigningVisits } from '@/lib/signing-visits';
import { useClientTasks } from '../../tasks/useClientTasks';
import { StepMark } from './CollateralScreen';

/** משימות שכבר נשלחו ליצירה — כדי שלחיצה כפולה לא תיצור אותן פעמיים */
const creating = new Set<string>();

function taskFor(tasks: ClientTaskView[], planId: string, key: SigningVisitKey): ClientTaskView | null {
  const templateKey = SIGNING_VISITS[key].templateKey;
  return tasks.find((task) => task.planId === planId && task.templateKey === templateKey) ?? null;
}

/**
 * העתק המשימות בשלב: התאריך וה"בוצע" של כל הגעה לסניף, כמו שהן במשימות.
 * המשימה היא המקור — סימון בלוח השנה מתעדכן כאן בכניסה לשלב, ומשם נבדק בשרת
 * אם השלב הושלם. כשהחתימה סומנה, ממלאים את פרטי החתימה מהתמהיל שנבחר במכרז.
 */
export function useSigningVisitSync(data: PlanData, planId: string, onChange: (next: SigningData) => void) {
  const { tasks, ready } = useClientTasks({ planId, includeDone: true });
  const value = data.SIGNING;

  useEffect(() => {
    if (!ready) return;
    let changed = false;
    const visits: SigningVisits = { ...value.visits };
    for (const key of SIGNING_VISIT_KEYS) {
      const task = taskFor(tasks, planId, key);
      if (!task) continue;
      const date = visitDay(task.dueAt);
      const doneAt = task.status === 'DONE' ? (value.visits[key].doneAt ?? task.completedAt ?? new Date().toISOString()) : null;
      if (date !== value.visits[key].date || doneAt !== value.visits[key].doneAt) {
        visits[key] = { date, doneAt };
        changed = true;
      }
    }
    if (changed) onChange(withSigningDetails(data, { ...value, visits }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tasks]);
}

/** החתימה בוצעה: פרטי החתימה (בנק, תאריך, תנאים) נלקחים מהתמהיל שנבחר במכרז */
export function withSigningDetails(data: PlanData, next: SigningData): SigningData {
  const sign = next.visits['bank-sign'];
  if (!sign.doneAt) return next;
  const signed = data.AUCTION.signedMix;
  return {
    ...next,
    bank: next.bank ?? finalAuctionBank(data) ?? signed?.bank ?? data.APPLICATIONS.bank ?? null,
    signingDate: next.signingDate ?? sign.date ?? sign.doneAt.slice(0, 10),
    finalAmount: next.finalAmount ?? data.MIX.totalAmount,
    finalMonthlyPayment: next.finalMonthlyPayment ?? signed?.monthlyPayment ?? data.MIX.monthlyPayment,
    finalAverageRate: next.finalAverageRate ?? signed?.averageRate ?? data.MIX.averageRate,
  };
}

/**
 * תת-שלב של הגעה לסניף הבנק: הגשת מקורות מסמכי הבטחונות, או החתימה על תיק
 * המשכנתא. קובעים תאריך — והוא נכנס כמשימה ללוח השנה; מסמנים "בוצע" כאן או
 * במשימה, ושני המקומות מתעדכנים.
 */
export function BranchVisitScreen({
  data,
  planId,
  onChange,
  visitKey,
  explanation,
  continueLabel,
  onContinue,
  children,
}: {
  data: PlanData;
  planId: string;
  onChange: (next: SigningData) => void;
  visitKey: SigningVisitKey;
  explanation: ReactNode;
  continueLabel?: string;
  onContinue?: () => void;
  /** מה שמוצג מתחת להגעה לסניף — בחתימה: התמהיל הסופי */
  children?: ReactNode;
}) {
  const spec = SIGNING_VISITS[visitKey];
  const value = data.SIGNING;
  const visit = value.visits[visitKey];
  const { data: session } = useSession();
  const isAdvisor = session?.user?.role === 'ADVISOR';
  const { tasks, ready, add, patch } = useClientTasks({ planId, includeDone: true });
  const [busy, setBusy] = useState(false);

  const task = useMemo(() => taskFor(tasks, planId, visitKey), [tasks, planId, visitKey]);
  const date = task ? visitDay(task.dueAt) : visit.date;
  const done = task ? task.status === 'DONE' : Boolean(visit.doneAt);
  const useTasks = !isAdvisor && ready;

  const saveVisit = (patchVisit: Partial<SigningData['visits'][SigningVisitKey]>) =>
    onChange(
      withSigningDetails(data, {
        ...value,
        visits: { ...value.visits, [visitKey]: { ...visit, ...patchVisit } },
      })
    );

  const createTask = async (dueAt: string | null, markDone: boolean) => {
    const id = `${planId}:${spec.templateKey}`;
    if (creating.has(id)) return;
    creating.add(id);
    try {
      const created = await add({
        planId,
        stage: 'SIGNING',
        kind: 'TASK',
        templateKey: spec.templateKey,
        title: spec.title,
        details: spec.details,
        dueAt,
      });
      if (created && markDone) await patch(created.id, { status: 'DONE' });
    } finally {
      creating.delete(id);
    }
  };

  const setDate = async (next: string | null) => {
    saveVisit({ date: next });
    if (!useTasks) return;
    setBusy(true);
    try {
      if (task) await patch(task.id, { dueAt: next ? visitDueAt(next) : null });
      else if (next) await createTask(visitDueAt(next), done);
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = async () => {
    const nextDone = !done;
    saveVisit({ doneAt: nextDone ? new Date().toISOString() : null });
    if (!useTasks) return;
    setBusy(true);
    try {
      if (task) await patch(task.id, { status: nextDone ? 'DONE' : 'OPEN' });
      else if (nextDone) await createTask(date ? visitDueAt(date) : null, true);
    } finally {
      setBusy(false);
    }
  };

  const dayLabel = date
    ? new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`))
    : null;

  return (
    <div dir="rtl" className="space-y-5 text-right">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Landmark className="h-5 w-5" />
          </span>
          <div dir="rtl" className="min-w-0 text-right">
            <h3 dir="rtl" className="text-subtitle font-black text-slate-900">{spec.title}</h3>
            <p dir="rtl" className="mt-1 text-right text-info leading-relaxed text-slate-600">{explanation}</p>
          </div>
        </div>

        <ol className="mt-5 space-y-3">
          <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <StepMark done={Boolean(date)} number={1} />
            <div className="min-w-0 flex-1 text-right">
              <p dir="rtl" className="text-right text-info font-black text-slate-900">קביעת תאריך</p>
              <p dir="rtl" className="text-right text-sm text-slate-500">
                {dayLabel
                  ? isAdvisor
                    ? `נקבע ל${dayLabel}.`
                    : `נקבע ל${dayLabel}, ומופיע כמשימה בלוח השנה.`
                  : 'בחרו את היום שבו מגיעים לסניף. הוא ייכנס כמשימה ללוח השנה.'}
              </p>
            </div>
            <label className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={date ?? ''}
                onChange={(event) => void setDate(event.target.value || null)}
                aria-label="תאריך ההגעה לסניף"
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </li>

          <li
            className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${
              done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <StepMark done={done} number={2} />
            <div className="min-w-0 flex-1 text-right">
              <p dir="rtl" className="text-right text-info font-black text-slate-900">
                {visitKey === 'bank-sign' ? 'החתימה בוצעה' : 'המקורות הוגשו בסניף'}
              </p>
              <p dir="rtl" className="text-right text-sm text-slate-500">
                {isAdvisor ? 'סימון כאן נשמר בשלב.' : 'אפשר לסמן כאן או במשימה שבלוח השנה, ושני המקומות מתעדכנים.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void toggleDone()}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-button font-black transition-colors disabled:opacity-60 ${
                done ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : done ? (
                <CalendarCheck className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {done ? 'בוצע' : 'סימון כבוצע'}
            </button>
          </li>
        </ol>
      </section>

      {children}

      {onContinue && continueLabel && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
          >
            {continueLabel}
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
