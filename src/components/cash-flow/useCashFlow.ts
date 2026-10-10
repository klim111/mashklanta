'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseCashFlow, seedCashFlow } from '@/lib/cash-flow';
import type { CashFlowSeed, CashFlowState } from '@/lib/cash-flow';
import { parseClientProfile } from '@/lib/client-profile';
import type { PlanView } from '@/components/plan/usePlan';

/** כל שמירה של הכלי מעדכנת גם את הכרטיס בסקירה, אם הוא פתוח במקום אחר */
export const CASH_FLOW_CHANGED_EVENT = 'mashkalanta:cash-flow-changed';

/**
 * הנתונים הראשונים: מהתהליך הפתוח (שלב 1 והתמהיל) ואם אין — מפרופיל הלקוח
 * שבהגדרות. הלקוח יכול לשנות הכול, ומה שנשמר מאז הוא שקובע.
 */
async function loadSeed(plan: PlanView | null): Promise<CashFlowSeed> {
  let profile = null;
  try {
    const response = await fetch('/api/profile', { cache: 'no-store' });
    if (response.ok) profile = parseClientProfile(await response.json());
  } catch {
    profile = null;
  }
  const analysis = plan?.data.ANALYSIS;
  /* התמהיל שנבחר בתהליך — הסכום, הריבית הממוצעת והתקופה שלו מדויקים יותר */
  const mix = plan?.data.MIX;
  const mixYears = mix?.months ? Math.round(mix.months / 12) : null;
  const source = analysis && (analysis.income || analysis.borrowerLoans?.length) ? analysis : profile;
  const couple = source?.household === 'COUPLE';
  return {
    household: couple ? 'COUPLE' : 'SINGLE',
    borrowerName: source?.firstName || '',
    partnerName: couple ? source?.partnerFirstName || '' : '',
    income: source?.income ?? null,
    partnerIncome: couple ? source?.partnerIncome ?? null : null,
    mortgageAmount: mix?.totalAmount || plan?.mortgageAmount || analysis?.mortgageAmount || null,
    mortgagePayment: mix?.monthlyPayment || plan?.monthlyPayment || null,
    mortgageRate: mix?.totalAmount ? mix.averageRate : null,
    years: mixYears || source?.years || null,
    loans: [
      ...(source?.borrowerLoans ?? []).map((loan) => ({ ...loan, owner: 'borrower' as const })),
      ...(couple ? source?.partnerLoans ?? [] : []).map((loan) => ({ ...loan, owner: 'partner' as const })),
    ],
  };
}

/**
 * `ready` — התהליכים כבר נטענו. בלי ההמתנה הזו, לקוח שעוד לא שמר כלום היה
 * מקבל נתוני פתיחה בלי המשכנתא שלו.
 */
export function useCashFlow(plan: PlanView | null, ready = true) {
  const [state, setState] = useState<CashFlowState | null>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<number | null>(null);
  const planRef = useRef(plan);
  planRef.current = plan;

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/cash-flow', { cache: 'no-store' });
      const stored = response.ok ? parseCashFlow(await response.json()) : null;
      if (stored) {
        setState(stored);
        return;
      }
    } catch {
      /* נטען מהפרופיל */
    }
    setState(seedCashFlow(await loadSeed(planRef.current)));
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    void load();
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ state: CashFlowState; source: unknown }>).detail;
      if (detail?.source !== timer && detail?.state) setState(detail.state);
    };
    window.addEventListener(CASH_FLOW_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CASH_FLOW_CHANGED_EVENT, onChange);
  }, [load, ready]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  /** כל שינוי מוצג מיד, ונשמר בחשבון אחרי שהלקוח מפסיק להקליד */
  const update = useCallback((next: CashFlowState | ((current: CashFlowState) => CashFlowState)) => {
    const current = stateRef.current;
    if (!current) return;
    const value = typeof next === 'function' ? next(current) : next;
    stateRef.current = value;
    setState(value);
    setSaved('saving');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/cash-flow', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        });
        setSaved(response.ok ? 'saved' : 'error');
      } catch {
        setSaved('error');
      }
    }, 700);
    window.dispatchEvent(new CustomEvent(CASH_FLOW_CHANGED_EVENT, { detail: { state: value, source: timer } }));
  }, []);

  /** חזרה לנתונים מהפרופיל ומהתהליך */
  const reset = useCallback(async () => {
    update(seedCashFlow(await loadSeed(planRef.current)));
  }, [update]);

  return { state, update, reset, saved };
}
