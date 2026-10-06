'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Banknote, Calculator, ChevronLeft, LineChart, Wallet, X, Zap } from 'lucide-react';
import { EQUITY_CATEGORY_ID } from '@/lib/equity-planning';
import type { EquityPlanView } from '@/lib/equity-planning';
import { MORTGAGE_RATIO_LIMIT, summarize } from '@/lib/cash-flow';
import { CashFlowWorkspace } from '@/components/cash-flow/CashFlowTool';
import type { CashFlowStore } from '@/components/cash-flow/CashFlowTool';
import { PERCENT, SHEKEL } from '@/components/cash-flow/fields';
import { ExpensesSection } from './ExpensesSection';

export type WorkspaceId = 'actions' | 'equity' | 'cash-flow';

interface WorkspaceMeta {
  id: WorkspaceId;
  title: string;
  icon: typeof Zap;
  gradient: string;
}

const META: WorkspaceMeta[] = [
  { id: 'actions', title: 'פעולות מהירות', icon: Zap, gradient: 'from-blue-500 to-indigo-600' },
  { id: 'equity', title: 'הון עצמי והוצאות', icon: Wallet, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'cash-flow', title: 'מצב הון ותזרים', icon: LineChart, gradient: 'from-orange-500 to-rose-500' },
];

/**
 * שלוש העמודות של הסקירה: פעולות מהירות, ההון העצמי וכלי מצב ההון והתזרים.
 *
 * במצב הרגיל כל עמודה היא תקציר קצר. לחיצה פותחת את האזור לרוחב שלוש
 * העמודות, ובצד נשארים קישורים לשני האחרים — כך עוברים בין הכלים בלי לגלול
 * ובלי לעזוב את הסקירה.
 */
export function DashboardWorkspace({
  actions,
  actionsCount,
  equityPlan,
  cashFlow,
  initial = null,
}: {
  actions: ReactNode;
  actionsCount: number;
  equityPlan: EquityPlanView | null;
  cashFlow: CashFlowStore;
  initial?: WorkspaceId | null;
}) {
  const [open, setOpen] = useState<WorkspaceId | null>(initial);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => setOpen(initial), [initial]);

  const choose = (id: WorkspaceId | null) => {
    setOpen(id);
    if (id) window.requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const summaries: Record<WorkspaceId, ReactNode> = {
    actions: <ActionsSummary count={actionsCount} />,
    equity: <EquitySummary plan={equityPlan} />,
    'cash-flow': <CashFlowSummary store={cashFlow} />,
  };

  if (!open) {
    return (
      <section ref={ref} className="grid scroll-mt-6 gap-4 md:grid-cols-3" data-demo-id="dash-workspace">
        {META.map((meta) => (
          <motion.button
            layout
            key={meta.id}
            type="button"
            onClick={() => choose(meta.id)}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <span className="flex items-center gap-2.5">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow-sm`}>
                <meta.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-subtitle font-black text-slate-900">{meta.title}</span>
              <ChevronLeft className="h-5 w-5 text-slate-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-blue-600" />
            </span>
            <span className="mt-3 block flex-1">{summaries[meta.id]}</span>
          </motion.button>
        ))}
      </section>
    );
  }

  const current = META.find((meta) => meta.id === open)!;
  const others = META.filter((meta) => meta.id !== open);

  return (
    <section
      ref={ref}
      className="grid scroll-mt-6 gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]"
      data-demo-id="dash-workspace"
    >
      <motion.div
        layout
        key={open}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${current.gradient} text-white`}>
            <current.icon className="h-5 w-5" />
          </span>
          <h2 className="min-w-0 flex-1 text-subtitle font-black text-slate-900">{current.title}</h2>
          <button
            type="button"
            onClick={() => choose(null)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-black text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
            סגירה
          </button>
        </header>
        <div className="p-4">
          {open === 'actions' && actions}
          {open === 'equity' && <ExpensesSection />}
          {open === 'cash-flow' && <CashFlowWorkspace store={cashFlow} />}
        </div>
      </motion.div>

      {/* סרגל הצד: שני האזורים האחרים, ותמיד אפשר לחזור לשלוש העמודות */}
      <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
        {others.map((meta) => (
          <button
            key={meta.id}
            type="button"
            onClick={() => choose(meta.id)}
            className="group rounded-2xl border border-slate-200 bg-white p-3 text-right shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            <span className="flex items-center gap-2">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${meta.gradient} text-white`}>
                <meta.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-base font-black text-slate-900">{meta.title}</span>
              <ArrowLeft className="h-4 w-4 text-slate-300 group-hover:text-blue-600" />
            </span>
            <span className="mt-2 block">{summaries[meta.id]}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => choose(null)}
          className="rounded-2xl border-2 border-dashed border-slate-300 px-3 py-2.5 text-sm font-black text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700"
        >
          חזרה לשלוש העמודות
        </button>
      </aside>
    </section>
  );
}

function Line({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return (
    <span className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="truncate text-sm text-slate-500">{label}</span>
      <span className={`shrink-0 text-base font-black tabular-nums ${tone}`}>{value}</span>
    </span>
  );
}

function ActionsSummary({ count }: { count: number }) {
  return (
    <span className="block">
      <span className="block text-sm leading-relaxed text-slate-500">
        אישור עקרוני, בניית תמהיל, בדיקת היתכנות, מיחזור, תיק המסמכים ופרטי החשבון.
      </span>
      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">
        <Calculator className="h-4 w-4" />
        {count} פעולות במקום אחד
      </span>
    </span>
  );
}

function EquitySummary({ plan }: { plan: EquityPlanView | null }) {
  if (!plan || plan.totalExpenses <= 0) {
    return (
      <span className="block text-sm leading-relaxed text-slate-500">
        עדיין אין תכנון. ההון העצמי, מס הרכישה, עורך הדין והתיווך על ציר זמן אחד.
      </span>
    );
  }
  const equity = plan.expenses
    .filter((expense) => expense.categoryId === EQUITY_CATEGORY_ID)
    .reduce((sum, expense) => sum + expense.amount, 0);
  return (
    <span className="block">
      <Line label="הון עצמי" value={SHEKEL(equity)} tone="text-emerald-700" />
      <Line label="הוצאות נלוות" value={SHEKEL(plan.totalExpenses - equity)} />
      <Line label="סה״כ נדרש" value={SHEKEL(plan.totalExpenses)} />
      <span className="mt-1 flex items-center gap-1 text-2xs font-bold text-slate-400">
        <Banknote className="h-3.5 w-3.5" />
        התשלומים נכנסים ללוח השנה
      </span>
    </span>
  );
}

function CashFlowSummary({ store }: { store: CashFlowStore }) {
  if (!store.state) return <span className="block h-16 animate-pulse rounded-xl bg-slate-100" />;
  const summary = summarize(store.state);
  const over = summary.mortgageRatio !== null && summary.mortgageRatio > MORTGAGE_RATIO_LIMIT;
  return (
    <span className="block">
      <Line label="החזר חודשי כולל" value={SHEKEL(summary.totalPayment)} />
      <Line
        label="יחס החזר למשכנתא"
        value={PERCENT(summary.mortgageRatio)}
        tone={over ? 'text-rose-700' : 'text-slate-900'}
      />
      <Line
        label="נשאר פנוי"
        value={summary.income > 0 ? SHEKEL(summary.freeMoney) : 'הזינו הכנסה'}
        tone={summary.freeMoney < 0 ? 'text-rose-700' : 'text-emerald-700'}
      />
      {summary.mortgageRatio !== null && (
        <span className="relative mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
          <span
            className={`absolute inset-y-0 right-0 rounded-full ${over ? 'bg-rose-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, (summary.mortgageRatio / 0.5) * 100)}%` }}
          />
          <span className="absolute inset-y-0 w-0.5 bg-slate-900" style={{ right: '80%' }} />
        </span>
      )}
    </span>
  );
}
