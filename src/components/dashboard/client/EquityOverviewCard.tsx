'use client';

import { ArrowLeft, CalendarDays, Banknote, FileText, Wallet } from 'lucide-react';
import { EQUITY_CATEGORY_ID, equityCalendarExpenses } from '@/lib/equity-planning';
import type { EquityPlanView } from '@/lib/equity-planning';
import { DashCard } from './ui';

const SHEKEL = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const SHORT_DATE = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' });

function money(value: number): string {
  return `₪${SHEKEL.format(Math.round(value))}`;
}

/**
 * תוצרי כלי תכנון ההוצאות בסקירה: כמה הון עצמי נדרש, כמה הוצאות נלוות נצברו,
 * מה הסכום הכולל, ומה התשלומים הקרובים. לחיצה פותחת את הכלי עצמו באזור
 * "תכנון הוצאות".
 */
export function EquityOverviewCard({
  plan,
  onOpen,
}: {
  plan: EquityPlanView | null;
  onOpen: () => void;
}) {
  const expenses = equityCalendarExpenses(plan);
  const equityAmount = (plan?.expenses ?? [])
    .filter((expense) => expense.categoryId === EQUITY_CATEGORY_ID)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const side = (plan?.totalExpenses ?? 0) - equityAmount;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = expenses
    .filter((expense) => expense.date >= today && expense.status !== 'paid')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <DashCard
      title="תכנון ההוצאות שלי"
      icon={<Wallet className="h-5 w-5 text-blue-600" />}
      action={
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-black text-blue-600 hover:underline"
        >
          לכלי המלא
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      }
    >
      {!plan || plan.totalExpenses <= 0 ? (
        <div className="py-4 text-center">
          <p className="text-info font-bold text-slate-600">עדיין לא בניתם תכנון הוצאות</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
            ההון העצמי, מס הרכישה, עורך הדין, התיווך והשיפוץ — הכול על ציר זמן אחד, עם מועדי תשלום
            שנכנסים ללוח השנה שלכם.
          </p>
          <button
            type="button"
            onClick={onOpen}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-button font-black text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-slate-700"
          >
            <Wallet className="h-4 w-4" />
            לתכנון ההוצאות
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Tile icon={<Banknote className="h-4 w-4" />} label="הון עצמי" value={money(equityAmount)} tone="emerald" />
            <Tile icon={<FileText className="h-4 w-4" />} label="הוצאות נלוות" value={money(side)} tone="amber" />
            <Tile icon={<Wallet className="h-4 w-4" />} label="סה״כ נדרש" value={money(plan.totalExpenses)} tone="dark" />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-500">
              <CalendarDays className="h-4 w-4" />
              התשלומים הקרובים
            </p>
            {upcoming.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-sm text-slate-500">
                אין תשלומים קרובים בתכנון
              </p>
            ) : (
              <ul className="space-y-1.5">
                {upcoming.map((expense) => (
                  <li
                    key={expense.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-xs font-black text-violet-700">
                      {SHORT_DATE.format(new Date(expense.date))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-900">
                        {expense.title}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {expense.categoryName}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-black text-slate-900">
                      {money(expense.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {plan.propertyPrice > 0 && (
            <p className="text-center text-xs font-semibold text-slate-400">
              נכס בשווי {money(plan.propertyPrice)} · הון עצמי מינימלי לפי בנק ישראל{' '}
              {money(plan.minEquityRequired)}
            </p>
          )}
        </div>
      )}
    </DashCard>
  );
}

function Tile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'emerald' | 'amber' | 'dark';
}) {
  const shell =
    tone === 'dark'
      ? 'bg-gradient-to-br from-slate-900 to-indigo-900 text-white border-transparent'
      : tone === 'emerald'
        ? 'bg-emerald-50 border-emerald-100'
        : 'bg-amber-50 border-amber-100';
  const labelTone = tone === 'dark' ? 'text-white/60' : 'text-slate-500';
  const valueTone = tone === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className={`rounded-xl border p-3 ${shell}`}>
      <span className={`flex items-center gap-1 text-2xs font-black ${labelTone}`}>
        {icon}
        {label}
      </span>
      <p className={`mt-1 text-lg font-black leading-tight ${valueTone}`}>{value}</p>
    </div>
  );
}
