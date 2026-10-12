'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Coins,
  CreditCard,
  Import,
  Layers,
  Merge,
  Percent,
  Plus,
  Sliders,
  Target,
  Wallet,
} from 'lucide-react';
import { formatILS } from '@/lib/currency';
import { HomeFloatingButton } from '@/components/guest/HomeFloatingButton';
import { useToolData } from '@/components/tool-data/toolData';
import { GuestSaveNotice } from '@/components/guest/GuestSaveNotice';
import { touchGuestData } from '@/components/guest/guestData';
import type {
  ConsolidationPlan,
  Loan,
  LoanDraft,
  LoanPlannerState,
  LoanPrepayment,
  OptimizationInput,
} from './types';
import { isCompleteLoan } from './loanMath';
import { portfolioStats, savingsPotential } from './loanInsights';
import { LoanControlPanel } from './LoanControlPanel';
import { LoanPortfolioDashboard } from './LoanPortfolioDashboard';
import { ConsolidationControl, ConsolidationDashboard, ConsolidationPicker } from './LoanConsolidation';
import { StrategyControl, StrategyDashboard } from './LoanStrategy';
import { LoanPrepaymentDialog } from './LoanPrepaymentDialog';
import { AmortTable } from './AmortTable';
import { LoanPlanningImportWizard } from './LoanPlanningImportWizard';
import { ConsumerCreditMarket, MARKET_SECTION_ID } from './ConsumerCreditMarket';
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
 * מסך אחד: פאנל שליטה שבו כל פרמטר של כל הלוואה הוא שדה הזנה וסליידר, ודאשבורד
 * שמתעדכן חי מולו. הלוואה חדשה נפתחת ריקה, והדאשבורד ריק עד שמוזנת הלוואה מלאה.
 * פירעון מוקדם יושב בתוך תיבת ההלוואה. איחוד ואסטרטגיה נפתחים מכפתורים שמתחת
 * להלוואות, ורק אז נוצרים להם טאבים — בפאנל ובדאשבורד; כשמסירים אותם הטאבים
 * נעלמים. בתחתית — אזור מידע פיננסי על האשראי הצרכני בישראל מבנק ישראל.
 */

const STORAGE_KEY = 'consumer-loans-state';

type View = 'portfolio' | 'consolidation' | 'strategy';

/** הלוואה ששמורה מגרסה קודמת של הכלי — עם ערכים מספריים — היא טיוטה תקינה */
function normalizeLoans(loans: unknown): LoanDraft[] {
  if (!Array.isArray(loans)) return [];
  return loans
    .filter((item): item is LoanDraft => !!item && typeof item === 'object' && 'id' in item)
    .map((item) => ({
      ...item,
      principal: typeof item.principal === 'number' ? item.principal : null,
      apr: typeof item.apr === 'number' ? item.apr : null,
      months: typeof item.months === 'number' ? item.months : null,
    }));
}

function normalizeState(value: Partial<LoanPlannerState> | null | undefined): LoanPlannerState {
  return {
    loans: normalizeLoans(value?.loans),
    selectedForComparison: [],
    optimizationInput: value?.optimizationInput ?? {},
    monthlyIncome: value?.monthlyIncome,
    consolidation: value?.consolidation,
    strategyOpen: value?.strategyOpen,
  };
}

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e4)}`;

export function LoanWorkspace() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoanPlannerState>(() => normalizeState(null));
  const [controlView, setControlView] = useState<View>('portfolio');
  const [dashView, setDashView] = useState<View>('portfolio');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [amortLoan, setAmortLoan] = useState<Loan | null>(null);
  const [prepayLoanId, setPrepayLoanId] = useState<string | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [importSession, setImportSession] = useState<ReturnType<
    typeof readConsumerLoansImportSession
  >>(null);
  const [ready, setReady] = useState(false);

  /**
   * מה שנשמר בחשבון — כולל הלוואות שהוזנו לפני ההרשמה — כדי שהכלי ייפתח איתן
   * בכל מכשיר. אורח עובד על אחסון הדפדפן בלבד.
   */
  const toolData = useToolData<LoanPlannerState>('consumerLoans', (value) => value as LoanPlannerState);
  const saveToolData = toolData.save;

  /* ---------------- טעינה ושמירה ---------------- */

  useEffect(() => {
    if (!toolData.ready) return;
    try {
      const fromPlanning = searchParams.get('import') === 'planning';
      const session = fromPlanning ? readConsumerLoansImportSession() : null;
      if (session) {
        setImportSession(session);
        setReady(true);
        return;
      }

      if (toolData.initial) {
        setState(normalizeState(toolData.initial));
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setState(normalizeState(JSON.parse(saved) as LoanPlannerState));
      }
    } catch (error) {
      console.error('שגיאה בטעינת נתוני ההלוואות:', error);
    } finally {
      setReady(true);
    }
  }, [searchParams, toolData.ready, toolData.initial]);

  useEffect(() => {
    // עד שהנתונים נטענו אין מה לשמור — אחרת המצב הריק היה דורס אותם
    if (importSession || !ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('שגיאה בשמירת נתוני ההלוואות:', error);
    }
    saveToolData(state);
    if (!toolData.signedIn && state.loans.length > 0) touchGuestData();
  }, [state, importSession, ready, saveToolData, toolData.signedIn]);

  const finishImport = useCallback((imported: Loan[]) => {
    setState((prev) => ({ ...prev, loans: [...prev.loans, ...imported] }));
    clearConsumerLoansImportSession();
    setImportSession(null);
  }, []);

  const cancelImport = useCallback(() => {
    clearConsumerLoansImportSession();
    setImportSession(null);
  }, []);

  /* ---------------- נתונים נגזרים ---------------- */

  const completeLoans = useMemo(() => state.loans.filter(isCompleteLoan), [state.loans]);
  const stats = useMemo(() => portfolioStats(completeLoans), [completeLoans]);
  const potential = useMemo(() => (stats.count >= 2 ? savingsPotential(stats) : null), [stats]);
  const consolidation = state.consolidation;
  const strategyOpen = !!state.strategyOpen;
  const hasTabs = !!consolidation || strategyOpen;
  const prepayLoan = completeLoans.find((loan) => loan.id === prepayLoanId) ?? null;

  /* ---------------- פעולות על ההלוואות ---------------- */

  const addLoan = () =>
    setState((prev) => ({
      ...prev,
      loans: [
        ...prev.loans,
        {
          id: newId('loan'),
          name: `הלוואה ${prev.loans.length + 1}`,
          principal: null,
          apr: null,
          months: null,
        },
      ],
    }));

  const updateLoan = (updated: LoanDraft) =>
    setState((prev) => ({
      ...prev,
      loans: prev.loans.map((loan) => (loan.id === updated.id ? updated : loan)),
    }));

  const deleteLoan = (id: string) =>
    setState((prev) => {
      const remaining = prev.consolidation?.loanIds.filter((item) => item !== id) ?? [];
      return {
        ...prev,
        loans: prev.loans.filter((loan) => loan.id !== id),
        consolidation:
          prev.consolidation && remaining.length >= 2
            ? { ...prev.consolidation, loanIds: remaining }
            : undefined,
      };
    });

  const duplicateLoan = (loan: LoanDraft) =>
    setState((prev) => ({
      ...prev,
      loans: [
        ...prev.loans,
        {
          ...loan,
          id: newId('loan'),
          name: `${loan.name} (עותק)`,
          prepayments: loan.prepayments?.map((item) => ({ ...item, id: newId('prepay') })),
        },
      ],
    }));

  const addPrepayment = (loanId: string, prepayment: Omit<LoanPrepayment, 'id'>) =>
    setState((prev) => ({
      ...prev,
      loans: prev.loans.map((loan) =>
        loan.id === loanId
          ? { ...loan, prepayments: [...(loan.prepayments ?? []), { ...prepayment, id: newId('prepay') }] }
          : loan
      ),
    }));

  const removePrepayment = (loanId: string, prepaymentId: string) =>
    setState((prev) => ({
      ...prev,
      loans: prev.loans.map((loan) =>
        loan.id === loanId
          ? { ...loan, prepayments: (loan.prepayments ?? []).filter((item) => item.id !== prepaymentId) }
          : loan
      ),
    }));

  const updateOptimization = (patch: Partial<OptimizationInput>) =>
    setState((prev) => ({ ...prev, optimizationInput: { ...prev.optimizationInput, ...patch } }));

  /* ---------------- איחוד ואסטרטגיה ---------------- */

  const switchTo = (view: View) => {
    setControlView(view);
    setDashView(view);
  };

  const confirmConsolidation = (loanIds: string[]) => {
    setState((prev) => ({
      ...prev,
      consolidation: {
        loanIds,
        apr: prev.consolidation?.apr ?? null,
        months: prev.consolidation?.months ?? null,
      },
    }));
    setPickerOpen(false);
    switchTo('consolidation');
  };

  const updateConsolidation = (plan: ConsolidationPlan) =>
    setState((prev) => ({ ...prev, consolidation: plan }));

  const removeConsolidation = () => {
    setState((prev) => ({ ...prev, consolidation: undefined }));
    setControlView((view) => (view === 'consolidation' ? 'portfolio' : view));
    setDashView((view) => (view === 'consolidation' ? 'portfolio' : view));
  };

  const openStrategy = () => {
    setState((prev) => ({ ...prev, strategyOpen: true }));
    switchTo('strategy');
  };

  const removeStrategy = () => {
    setState((prev) => ({ ...prev, strategyOpen: false }));
    setControlView((view) => (view === 'strategy' ? 'portfolio' : view));
    setDashView((view) => (view === 'strategy' ? 'portfolio' : view));
  };

  // טאב שהתוכן שלו כבר לא קיים — חוזרים לתצוגת ברירת המחדל
  useEffect(() => {
    if (!consolidation) {
      setControlView((view) => (view === 'consolidation' ? 'portfolio' : view));
      setDashView((view) => (view === 'consolidation' ? 'portfolio' : view));
    }
    if (!strategyOpen) {
      setControlView((view) => (view === 'strategy' ? 'portfolio' : view));
      setDashView((view) => (view === 'strategy' ? 'portfolio' : view));
    }
  }, [consolidation, strategyOpen]);

  /* ---------------- ליווי ---------------- */

  const advisorHeadline =
    potential && potential.interestSaved > 0
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
        state.monthlyIncome ? `הכנסה חודשית פנויה ${formatILS(state.monthlyIncome)}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  }, [stats, state.monthlyIncome]);

  const scrollToMarket = () =>
    document.getElementById(MARKET_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* ---------------- תצוגה ---------------- */

  const controlTabs: TabItem[] = [
    { id: 'portfolio', label: 'ההלוואות שלי', icon: Sliders },
    ...(consolidation ? [{ id: 'consolidation' as const, label: 'איחוד הלוואות', icon: Merge }] : []),
    ...(strategyOpen ? [{ id: 'strategy' as const, label: 'אסטרטגיה', icon: Target }] : []),
  ];
  const dashTabs: TabItem[] = [
    { id: 'portfolio', label: 'התיק שלכם היום', icon: Layers },
    ...(consolidation ? [{ id: 'consolidation' as const, label: 'איחוד', icon: Merge }] : []),
    ...(strategyOpen ? [{ id: 'strategy' as const, label: 'אסטרטגיה', icon: Target }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="container mx-auto px-3 py-4 pb-10 sm:px-6 sm:py-6">
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
              מזינים או מזיזים קרן, ריבית ותקופה ורואים מיד מה זה עושה להחזר החודשי, לריבית הכוללת
              וליחס ההחזר שהבנק בוחן.
            </p>
            <button
              type="button"
              onClick={scrollToMarket}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-2xs font-black text-orange-800 transition-colors hover:border-orange-400 hover:bg-orange-100"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              מצב ההלוואות הצרכניות בישראל — נתוני בנק ישראל ↓
            </button>
          </div>

          {stats.count > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <HeaderChip icon={Coins} label="סך חוב" value={formatILS(stats.totalPrincipal)} />
              <HeaderChip icon={Wallet} label="החזר חודשי" value={formatILS(stats.monthlyPayment)} emphasized />
              <HeaderChip icon={Percent} label="ריבית משוקללת" value={`${stats.weightedApr.toFixed(2)}%`} />
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
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              {/* פאנל השליטה */}
              <div className="space-y-2">
                <SectionTitle
                  icon={Sliders}
                  title="פאנל השליטה"
                  hint="כל פרמטר של כל הלוואה — שינוי מתעדכן מיד בדאשבורד"
                />
                {hasTabs && <Tabs items={controlTabs} active={controlView} onSelect={setControlView} />}

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={controlView}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    {controlView === 'portfolio' && (
                      <LoanControlPanel
                        loans={state.loans}
                        onUpdate={updateLoan}
                        onDelete={deleteLoan}
                        onDuplicate={duplicateLoan}
                        onPrepay={(loan) => setPrepayLoanId(loan.id)}
                        onRemovePrepayment={removePrepayment}
                        onShowAmortization={setAmortLoan}
                      >
                        {state.loans.length === 0 && <EmptyIntro />}

                        {/* הכפתורים שמתחת להלוואות */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={addLoan}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white/60 px-4 py-2.5 text-sm font-black text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700"
                          >
                            <Plus className="h-4 w-4" />
                            הוספת הלוואה
                          </button>
                          <AnimatePresence initial={false}>
                            {completeLoans.length >= 2 && (
                              <motion.button
                                key="consolidate"
                                type="button"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() =>
                                  consolidation ? switchTo('consolidation') : setPickerOpen((open) => !open)
                                }
                                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-black shadow-sm transition-colors ${
                                  pickerOpen
                                    ? 'bg-violet-700 text-white'
                                    : 'bg-violet-600 text-white hover:bg-violet-700'
                                }`}
                              >
                                <Merge className="h-4 w-4" />
                                {consolidation ? 'לאיחוד ההלוואות' : 'איחוד הלוואות'}
                              </motion.button>
                            )}
                            {completeLoans.length >= 1 && (
                              <motion.button
                                key="strategy"
                                type="button"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => (strategyOpen ? switchTo('strategy') : openStrategy())}
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition-colors hover:border-slate-900"
                              >
                                <Target className="h-4 w-4" />
                                {strategyOpen ? 'לאסטרטגיה' : 'אסטרטגיה: מזומן והוצאות'}
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>

                        <ConsolidationPicker
                          open={pickerOpen && completeLoans.length >= 2}
                          loans={completeLoans}
                          initial={consolidation?.loanIds ?? []}
                          onCancel={() => setPickerOpen(false)}
                          onConfirm={confirmConsolidation}
                        />
                      </LoanControlPanel>
                    )}

                    {controlView === 'consolidation' && consolidation && (
                      <ConsolidationControl
                        loans={completeLoans}
                        plan={consolidation}
                        onChange={updateConsolidation}
                        onRemove={removeConsolidation}
                      />
                    )}

                    {controlView === 'strategy' && strategyOpen && (
                      <StrategyControl
                        input={state.optimizationInput}
                        onInputChange={updateOptimization}
                        onRemove={removeStrategy}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* הדאשבורד */}
              <div className="space-y-2">
                <SectionTitle
                  icon={Layers}
                  title="דאשבורד ההלוואות"
                  hint="המצב הכולל, יחס ההחזר, התובנות והגרפים"
                />
                {hasTabs && <Tabs items={dashTabs} active={dashView} onSelect={setDashView} />}

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={dashView}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    {dashView === 'portfolio' && (
                      <LoanPortfolioDashboard
                        loans={completeLoans}
                        stats={stats}
                        monthlyIncome={state.monthlyIncome}
                        onMonthlyIncomeChange={(value) =>
                          setState((prev) => ({ ...prev, monthlyIncome: value || undefined }))
                        }
                      />
                    )}
                    {dashView === 'consolidation' && consolidation && (
                      <ConsolidationDashboard loans={completeLoans} plan={consolidation} />
                    )}
                    {dashView === 'strategy' && strategyOpen && (
                      <StrategyDashboard loans={completeLoans} input={state.optimizationInput} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* ההזמנה לליווי — עם המספר שהכלי חישב */}
            {stats.count > 0 && (
              <FamilyEconomyValueCard headline={advisorHeadline} onContact={() => setLeadOpen(true)} />
            )}
          </div>
        )}
      </div>

      {/* אזור המידע הפיננסי */}
      <ConsumerCreditMarket />
      <div className="h-20 bg-brand-dark" />

      {amortLoan && <AmortTable loan={amortLoan} onClose={() => setAmortLoan(null)} />}
      <LoanPrepaymentDialog
        loan={prepayLoan}
        onClose={() => setPrepayLoanId(null)}
        onConfirm={addPrepayment}
      />

      <FamilyEconomyLeadDialog open={leadOpen} onOpenChange={setLeadOpen} context={leadContext} />

      {/* הכפתורים הצפים: פנייה ליועץ בשמאל, חזרה לדף הבית בימין */}
      <FamilyEconomyFloatingCta context={leadContext} />
      <HomeFloatingButton />
      <GuestSaveNotice tool="consumer-loans" hasData={ready && state.loans.length > 0} />
    </div>
  );
}

interface TabItem {
  id: View;
  label: string;
  icon: React.ElementType;
}

/** טאבים לאזור אחד בלבד — הפאנל או הדאשבורד — ולא לכל העמוד */
function Tabs({
  items,
  active,
  onSelect,
}: {
  items: TabItem[];
  active: View;
  onSelect: (view: View) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1"
      role="tablist"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(item.id)}
            className={`relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-colors ${
              selected ? 'text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {selected && (
              <motion.span
                layoutId={`tab-${items[0].label}`}
                className="absolute inset-0 rounded-lg bg-slate-900"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </span>
          </button>
        );
      })}
    </motion.div>
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
      <span className={`text-xs font-black ${emphasized ? 'text-blue-700' : 'text-slate-900'}`}>{value}</span>
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

function EmptyIntro() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow">
        <CreditCard className="h-5 w-5" />
      </span>
      <p className="text-sm font-black text-slate-900">נתחיל מההלוואות שיש לכם היום</p>
      <p className="mx-auto mt-1 max-w-md text-2xs leading-relaxed text-slate-600">
        הוסיפו כל התחייבות חודשית — הלוואה בנקאית, חוץ-בנקאית, כרטיס אשראי, רכב או הלוואה מהמשפחה —
        והזינו לה קרן, ריבית ותקופה.
      </p>
      <Link
        href="/mortgage-planning?flow=affordability"
        className="mt-2 inline-flex items-center gap-1.5 text-2xs font-bold text-blue-700 hover:underline"
      >
        <Import className="h-3.5 w-3.5" />
        הזנתי את ההלוואות בכלי כושר ההחזר — לייבוא משם
      </Link>
    </div>
  );
}
