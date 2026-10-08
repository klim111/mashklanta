'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, RefreshCw, Search, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TOOL_HAS_CONTENT } from '@/lib/tool-data';
import type { AccountToolData, ToolDataKey } from '@/lib/tool-data';
import { TOOL_DATA_CHANGED_EVENT, loadAccountToolData } from '@/components/tool-data/toolData';
import { DashCard } from './ui';

const SHEKEL = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });

function money(value: number): string {
  return `₪${SHEKEL.format(Math.round(value))}`;
}

function amount(value: unknown): number {
  const number = typeof value === 'string' ? Number(value.replace(/[^\d.]/g, '')) : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sum(items: unknown, field: string): number {
  return Array.isArray(items)
    ? items.reduce((total, item) => total + amount((item as Record<string, unknown>)?.[field]), 0)
    : 0;
}

interface ToolRow {
  key: ToolDataKey;
  title: string;
  href: string;
  icon: LucideIcon;
  summary: (value: unknown) => string;
}

const ROWS: ToolRow[] = [
  {
    key: 'refinance',
    title: 'מיחזור משכנתא',
    href: '/mortgage-refinance',
    icon: RefreshCw,
    summary: (value) => {
      const mix = value as { tracks?: unknown[]; bank?: string };
      const count = mix.tracks?.length ?? 0;
      const parts = [count === 1 ? 'מסלול אחד' : `${count} מסלולים`, `יתרה ${money(sum(mix.tracks, 'amount'))}`];
      if (mix.bank) parts.push(mix.bank);
      return parts.join(' · ');
    },
  },
  {
    key: 'affordability',
    title: 'מה אני יכול להרשות לעצמי',
    href: '/mortgage-planning?flow=affordability',
    icon: Search,
    summary: (value) => {
      const data = (value as { userData?: Record<string, unknown> }).userData ?? {};
      const borrower = (key: string) => (data[key] ?? {}) as Record<string, unknown>;
      const income =
        amount(data.monthlyIncome) ||
        amount(borrower('borrower1').monthlyIncome) + amount(borrower('borrower2').monthlyIncome);
      const parts: string[] = [];
      const price = amount(data.propertyPrice) || amount(data.currentPropertyPrice);
      if (price > 0) parts.push(`מחיר נכס ${money(price)}`);
      if (amount(data.ownCapital) > 0) parts.push(`הון עצמי ${money(amount(data.ownCapital))}`);
      if (income > 0) parts.push(`הכנסה ${money(income)} בחודש`);
      return parts.join(' · ');
    },
  },
  {
    key: 'consumerLoans',
    title: 'הלוואות צרכניות',
    href: '/consumer-loans',
    icon: CreditCard,
    summary: (value) => {
      const loans = (value as { loans?: unknown[] }).loans ?? [];
      const count = loans.length === 1 ? 'הלוואה אחת' : `${loans.length} הלוואות`;
      return `${count} · קרן ${money(sum(loans, 'principal'))}`;
    },
  },
];

/**
 * מה ששמור בחשבון מהכלים הפתוחים — כולל מה שהוזן לפני ההרשמה, שעובר לחשבון
 * כשהכרטיס נטען. לחיצה על שורה פותחת את הכלי עם אותם נתונים. כשאין שום
 * נתון שמור, הכרטיס אינו מוצג.
 */
export function SavedToolsCard() {
  const [data, setData] = useState<AccountToolData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      loadAccountToolData()
        .then((next) => {
          if (!cancelled) setData(next);
        })
        .catch(() => {
          // בלי חיבור — הכרטיס פשוט לא מוצג
        });
    };
    load();
    window.addEventListener(TOOL_DATA_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(TOOL_DATA_CHANGED_EVENT, load);
    };
  }, []);

  const rows = data ? ROWS.filter((row) => TOOL_HAS_CONTENT[row.key](data[row.key])) : [];
  if (rows.length === 0) return null;

  return (
    <DashCard title="הנתונים שלכם בכלים" icon={<Wrench className="h-5 w-5 text-blue-600" />}>
      <p className="mb-3 text-center text-sm text-slate-600">
        מה שהזנתם בכלים, גם לפני ההרשמה, שמור בחשבון. כל כלי נפתח עם הנתונים שלכם.
      </p>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {rows.map(({ key, title, href, icon: Icon, summary }) => (
          <li key={key}>
            <Link
              href={href}
              className="flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-info font-black text-slate-900">{title}</span>
                <span className="block break-words text-sm text-slate-600">{summary(data![key])}</span>
              </span>
              <ArrowLeft className="h-4 w-4 shrink-0 text-blue-600" />
            </Link>
          </li>
        ))}
      </ul>
    </DashCard>
  );
}
