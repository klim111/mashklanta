'use client';

import { useEffect, useState } from 'react';
import type { ConsumerCreditSnapshot } from '@/lib/boi-consumer-credit';

/**
 * נתוני האשראי הצרכני של בנק ישראל בצד הלקוח. נמשכים פעם אחת לכל הדף —
 * אזור המידע הפיננסי וכל סימני הקריאה שליד שדות הריבית חולקים אותה משיכה.
 */

export type ConsumerCreditState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: ConsumerCreditSnapshot };

let shared: Promise<ConsumerCreditSnapshot> | null = null;

function load(): Promise<ConsumerCreditSnapshot> {
  if (!shared) {
    shared = fetch('/api/boi/consumer-credit')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ConsumerCreditSnapshot;
      })
      .catch((error) => {
        shared = null; // ניסיון נוסף בפעם הבאה שהרכיב נטען
        throw error;
      });
  }
  return shared;
}

export function useConsumerCredit(): ConsumerCreditState {
  const [state, setState] = useState<ConsumerCreditState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    load()
      .then((data) => alive && setState({ status: 'ready', data }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

const HEBREW_MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

/** "2026-08" → "אוגוסט 2026", "2026-Q2" → "רבעון 2 2026" */
export function formatPeriod(period: string): string {
  const quarter = /^(\d{4})-Q(\d)$/.exec(period);
  if (quarter) return `רבעון ${quarter[2]} ${quarter[1]}`;
  const month = /^(\d{4})-(\d{2})/.exec(period);
  if (month) return `${HEBREW_MONTHS[Number(month[2]) - 1] ?? month[2]} ${month[1]}`;
  return period;
}
