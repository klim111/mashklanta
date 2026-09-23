'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Coins,
  CreditCard,
  Import,
  Layers,
  Percent,
  Plus,
  Sliders,
  Target,
  Wallet,
} from 'lucide-react';
import { formatILS } from '@/lib/currency';
import { HomeFloatingButton } from '@/components/guest/HomeFloatingButton';
import type { Loan, LoanPlannerState, OptimizationInput } from './types';
import { portfolioStats, savingsPotential } from './loanInsights';
import { LoanControlPanel } from './LoanControlPanel';
import { LoanPortfolioDashboard } from './LoanPortfolioDashboard';
import { LoanComparison, type CompareView } from './LoanComparison';
import { LoanStrategyPanel } from './LoanStrategyPanel';
import { AmortTable } from './AmortTable';
import { LoanPlanningImportWizard } from './LoanPlanningImportWizard';
import {
  FamilyEconomyFloatingCta,
  FamilyEconomyLeadDialog,
  FamilyEconomyValueCard,
} from '@/components/advisor/FamilyEconomyAdvisor';
import {
  clearConsumerLoansImportSession,
  readConsumerLoansImportSession,
} from '@/lib/consumer-loans-import';

/**
 * כלי ההלוואות הצרכניות וכלכלת המשפחה.
 *
 * בנוי באותו קונספט של בונה התמהילים וכלי המיחזור: פאנל שליטה שבו כל פרמטר של
 * כל הלוואה הוא מכוון, ודאשבורד שמתעדכן חי מולו — בלי שמירה ובלי מעבר מסך.
 * משם ממשיכים להשוואה בין הלוואות ולאסטרטגיה, ובכל רגע אפשר להעביר את התמונה
 * ליועץ כלכלת המשפחה של משכלנתא.
 */

const STORAGE_KEY = 'consumer-loans-state';

const SECTIONS = [
  {
    id: 'portfolio' as const,
    label: 'ההלוואות שלי',
    hint: 'פאנל שליטה ודאשבורד חי',
    icon: Sliders,
  },
  {
    id: 'compare' as const,
    label: 'השוואה ותרחישים',
    hint: 'איחוד, פירעון מוקדם וגרפים',
    icon: BarChart3,
  },
  {
    id: 'strategy' as const,
    label: 'אסטרטגיה',
    hint: 'מה עדיף לעשות עם הכסף',
    icon: Target,
  },
];

type SectionId = (typeof SECTIONS)[number]['id'];

const defaultLoan: Omit<Loan, 'id'> = {
  name: 'הלוואה חדשה',
  principal: 100_000,
  apr: 12,
  months: 36,
  category: 'bank',
};

export function LoanWorkspace() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoanPlannerState>({
    loans: [],
    selectedForComparison: [],
    optimizationInput: {},
  });
  const [section, setSection] = useState<SectionId>('portfolio');
  const [compareView, setCompareView] = useState<CompareView>('summary');
  const [amortLoan, setAmortLoan] = useState<Loan | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [importSession, setImportSession] = useState<ReturnType<
    typeof readConsumerLoansImportSession
  >>(null);
  const [ready, setReady] = useState(false);

  /* ---------------- טעינה ושמירה מקומית ---------------- */

  useEffect(() => {
    try {
      const fromPlanning = searchParams.get('import') === 'planning';
      const session = fromPlanning ? readConsumerLoansImportSession() : null;
      if (session) {
        setImportSession(session);
        setReady(true);
        return;
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState(JSON.parse(saved) as LoanPlannerState);
    } catch (error) {
      console.error('שגיאה בטעינת נתוני ההלוואות:', error);
    } finally {
      setReady(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (importSession) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('שגיאה בשמירת נתוני ההלוואות:', error);
    }
  }, [state, importSession]);

  const finishImport = useCallback((imported: Loan[]) => {
    setState((prev) => ({ ...prev, loans: [...prev.loans, ...imported] }));
    clearConsumerLoansImportSession();
    setImportSession(null);
    setSection('portfolio');
  }, []);

  const cancelImport = useCallback(() => {
    clearConsumerLoansImportSession();
    setImportSession(null);
  }, []);

  /* ---------------- פעולות על ההלוואות ---------------- */

  const addLoan = () =>
    setState((prev) => ({
      ...prev,
      loans: [
        ...prev.loans,
        { ...defaultLoan, id: `loan-${Date.now()}`, name: `הלוואה ${prev.loans.length + 1}` },
      ],
    }));

  const updateLoan = (updated: Loan) =>
    setState((prev) => ({
      ...prev,
      loans: prev.loans.map((loan) => (loan.id === updated.id ? updated : loan)),
    }));

  const deleteLoan = (id: string) =>
    setState((prev) => ({
      ...prev,
      loans: prev.loans.filter((loan) => loan.id !== id),
      selectedForComparison: prev.selectedForComparison.filter((selected) => selected !== id),
    }));

  const duplicateLoan = (loan: Loan) =>
    setState((prev) => ({
      ...prev,
      loans: [...prev.loans, { ...loan, id: `loan-${Date.now()}`, name: `${loan.name} (עותק)` }],
    }));

  const toggleSelect = (id: string) =>
    setState((prev) => ({
      ...prev,
      selectedForComparison: prev.selectedForComparison.includes(id)
        ? prev.selectedForComparison.filter((selected) => selected !== id)
        : [...prev.selectedForComparison, id],
    }));

  const clearSelection = () => setState((prev) => ({ ...prev, selectedForComparison: [] }));

  const updateOptimization = (patch: Partial<OptimizationInput>) =>
    setState((prev) => ({ ...prev, optimizationInput: { ...prev.optimizationInput, ...patch } }));

  /* ---------------- נתונים נגזרים ---------------- */

  const stats = useMemo(() => portfolioStats(state.loans), [state.loans]);
  const potential = useMemo(() => savingsPotential(stats), [stats]);

  const advisorHeadline = potential && potential.interestSaved > 0
    ? `בנתונים שהזנתם יש ${formatILS(potential.interestSaved)} ריבית שאפשר לבחון אם לחסוך`
    : undefined;

  const leadContext = useMemo(() => {
    if (stats.count === 0) return undefined;
    return {
      summary: [
        `${stats.count} הלוואות`,
        `סך חוב ${formatILS(stats.totalPrincipal)}`,
        `החזר חודשי ${formatILS(stats.monthlyPayment)}`,
        `ריבית משוקללת ${stats.weightedApr.toFixed(2)}%`,
        `סך ריבית עד הסוף ${formatILS(stats.totalInterest)}`,
        state.monthlyIncome
          ? `הכנסה חודשית פנויה ${formatILS(state.monthlyIncome)}`
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  }, [stats, state.monthlyIncome]);

  const selectedCount = state.selectedForComparison.length;

  /* ---------------- תצוגה ---------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 pb-24" dir="rtl">
      <div className="container mx-auto px-3 py-4 sm:px-6 sm:py-6">
        {/* כותרת הכלי */}
        <div className="mb-3 flex flex-wrap items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg">
            <CreditCard className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-title font-black leading-tight text-slate-900">
              ניתוח ההלוואות וכלכלת המשפחה
            </h1>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
              מזיזים מכוון — קרן, ריבית או תקופה — ורואים מיד מה זה עושה להחזר החודשי, לריבית
              הכוללת וליחס ההחזר שהבנק בוחן. הכול נשמר במחשב שלכם בלבד.
            </p>
          </div>

          {stats.count > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <HeaderChip icon={Coins} label="סך חוב" value={formatILS(stats.totalPrincipal)} />
              <HeaderChip
                icon={Wallet}
                label="החזר חודשי"
                value={formatILS(stats.monthlyPayment)}
                emphasized
              />
              <HeaderChip
                icon={Percent}
                label="ריבית משוקללת"
                value={`${stats.weightedApr.toFixed(2)}%`}
              />
            </div>
          )}
        </div>

        {/* אשף הייבוא מהפרופיל הפיננסי */}
        {importSession && (
          <div className="mb-3">
            <LoanPlanningImportWizard
              loans={importSession.loans}
              onComplete={finishImport}
              onCancel={cancelImport}
            />
          </div>
        )}

        {!importSession && ready && (
          <>
            {/* הניווט בין חלקי הכלי */}
            <div className="mb-3 grid gap-1.5 sm:grid-cols-3">
              {SECTIONS.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-right transition-all ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black leading-tight">
                        {item.label}
                        {item.id === 'compare' && selectedCount > 0 && (
                          <span
                            className={`mr-1.5 rounded-full px-1.5 py-0.5 text-2xs font-black ${
                              active ? 'bg-white text-slate-900' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {selectedCount}
                          </span>
                        )}
                      </span>
                      <span
                        className={`block text-2xs ${active ? 'text-white/70' : 'text-slate-400'}`}
                      >
                        {item.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {state.loans.length === 0 ? (
              <EmptyState onAdd={addLoan} />
            ) : (
              <div className="space-y-2.5">
                {section === 'portfolio' && (
                  <div className="grid gap-2.5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div className="space-y-2">
                      <SectionTitle
                        icon={Sliders}
                        title="פאנל השליטה"
                        hint="כל פרמטר של כל הלוואה — שינוי מתעדכן מיד בדאשבורד"
                      />
                      <LoanControlPanel
                        loans={state.loans}
                        selectedIds={state.selectedForComparison}
                        onUpdate={updateLoan}
                        onDelete={deleteLoan}
                        onDuplicate={duplicateLoan}
                        onAdd={addLoan}
                        onToggleSelect={toggleSelect}
                        onShowAmortization={setAmortLoan}
                      />
                    </div>

                    <div className="space-y-2">
                      <SectionTitle
                        icon={Layers}
                        title="דאשבורד התיק"
                        hint="המצב הכולל, יחס ההחזר, התובנות והגרפים"
                      />
                      <LoanPortfolioDashboard
                        loans={state.loans}
                        stats={stats}
                        monthlyIncome={state.monthlyIncome}
                        onMonthlyIncomeChange={(value) =>
                          setState((prev) => ({ ...prev, monthlyIncome: value || undefined }))
                        }
                        selectedIds={state.selectedForComparison}
                        onToggleSelect={toggleSelect}
                      />
                    </div>
                  </div>
                )}

                {section === 'compare' && (
                  <LoanComparison
                    loans={state.loans}
                    selectedIds={state.selectedForComparison}
                    onClearSelection={clearSelection}
                    onToggleSelect={toggleSelect}
                    view={compareView}
                    onViewChange={setCompareView}
                  />
                )}

                {section === 'strategy' && (
                  <LoanStrategyPanel
                    loans={state.loans}
                    input={state.optimizationInput}
                    onInputChange={updateOptimization}
                  />
                )}

                {/* ההזמנה לליווי — בכל חלק של הכלי, עם המספר שהכלי חישב */}
                <FamilyEconomyValueCard
                  headline={advisorHeadline}
                  onContact={() => setLeadOpen(true)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {amortLoan && <AmortTable loan={amortLoan} onClose={() => setAmortLoan(null)} />}

      <FamilyEconomyLeadDialog open={leadOpen} onOpenChange={setLeadOpen} context={leadContext} />

      {/* הכפתורים הצפים: פנייה ליועץ בשמאל, חזרה לדף הבית בימין */}
      <FamilyEconomyFloatingCta context={leadContext} />
      <HomeFloatingButton />
    </div>
  );
}

function HeaderChip({
  icon: Icon,
  label,
  value,
  emphasized = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="text-2xs text-slate-500">{label}</span>
      <span
        className={`text-xs font-black ${emphasized ? 'text-blue-700' : 'text-slate-900'}`}
      >
        {value}
      </span>
    </span>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ElementType;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <p className="inline-flex items-center gap-1.5 text-sm font-black text-slate-900">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        {title}
      </p>
      <p className="text-2xs text-slate-500">{hint}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg">
        <CreditCard className="h-7 w-7" />
      </span>
      <h2 className="text-subtitle font-black text-slate-900">נתחיל מההלוואות שיש לכם היום</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        הוסיפו כל התחייבות חודשית — הלוואה בנקאית, חוץ-בנקאית, כרטיס אשראי, רכב או הלוואה
        מהמשפחה. לכל אחת מזיזים קרן, ריבית ותקופה, והכלי מראה מיד את ההחזר החודשי, את הריבית
        שתשלמו עד הסוף ואת יחס ההחזר מההכנסה — היחס שקובע איזו משכנתא הבנק יאשר לכם.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-blue-600 to-violet-600 px-6 py-3 text-button font-black text-white shadow-lg transition-all hover:shadow-xl"
        >
          <Plus className="h-4 w-4" />
          הוספת ההלוואה הראשונה
        </button>
        <Link
          href="/mortgage-planning?flow=affordability"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-button font-bold text-slate-700 transition-colors hover:border-slate-900"
        >
          <Import className="h-4 w-4" />
          הזנתי את ההלוואות בכלי כושר ההחזר — לייבוא משם
        </Link>
      </div>
    </div>
  );
}
