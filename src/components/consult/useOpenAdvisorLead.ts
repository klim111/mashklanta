'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { CONTACTED_ADVISOR_EVENT } from '@/lib/contacted-advisor';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import type { OwnLeadView } from '@/lib/advisor-leads';

/**
 * הפנייה של הלקוח המחובר ליועץ שעדיין פתוחה — מכל מקום שממנו נשלחה.
 *
 * כל המסכים שצריכים לדעת "הלקוח כבר פנה" (מה תרצו לעשות, פנייה ליועץ בתחתית
 * הדאשבורד, וכל חלון של בקשת ליווי) חולקים טעינה אחת מהשרת. היא מתרעננת
 * כשנשלחת פנייה בלשונית הזו, וכשהיועץ מטפל בפנייה (useLiveRefresh).
 */

interface LeadState {
  ready: boolean;
  lead: OwnLeadView | null;
}

const EMPTY: LeadState = { ready: false, lead: null };

const listeners = new Set<(state: LeadState) => void>();
let current: LeadState = EMPTY;
let inflight: Promise<void> | null = null;

function publish(next: LeadState) {
  current = next;
  listeners.forEach((listener) => listener(next));
}

function load(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await fetch('/api/advisor-leads', { cache: 'no-store' });
      const body = response.ok ? await response.json() : [];
      const leads = Array.isArray(body) ? (body as OwnLeadView[]) : [];
      publish({ ready: true, lead: leads[0] ?? null });
    } catch {
      // בלי תשובה מהשרת לא חוסמים פנייה — עדיף פנייה כפולה מלקוח שלא הצליח לפנות
      publish({ ready: true, lead: current.lead });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useOpenAdvisorLead() {
  const { data: session, status } = useSession();
  // רק ללקוח מחובר: לאורח אין חשבון לקשר אליו פנייה, וליועץ אין פניות משלו
  const enabled = status === 'authenticated' && session?.user?.role !== 'ADVISOR';
  const [state, setState] = useState<LeadState>(current);

  useEffect(() => {
    if (!enabled) return;
    listeners.add(setState);
    setState(current);
    void load();
    const reload = () => void load();
    window.addEventListener(CONTACTED_ADVISOR_EVENT, reload);
    return () => {
      listeners.delete(setState);
      window.removeEventListener(CONTACTED_ADVISOR_EVENT, reload);
    };
  }, [enabled]);

  useLiveRefresh(() => void load(), enabled);

  return {
    /** הטעינה הסתיימה — עד אז לא מחליפים תצוגה, כדי שלא תהבהב */
    ready: enabled && state.ready,
    lead: enabled ? state.lead : null,
    contacted: enabled && state.lead !== null,
  };
}
