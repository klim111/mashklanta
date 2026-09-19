'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  FileText,
  Home as HomeIcon,
  Loader2,
  PieChart,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  BROKERAGE_PERCENT,
  BROKERAGE_PRESET_KEY,
  EQUITY_CATEGORIES,
  EQUITY_CATEGORY_ID,
  FINANCING_PROFILES,
  FINANCING_PROFILE_IDS,
  buildInitialExpenses,
  calculateEquityTotals,
  calculateExpenseDate,
  calculationSourceOf,
  equityCategory,
  minEquityRequired,
  suggestedAmount,
} from '@/lib/equity-planning';
import type {
  EquityExpense,
  EquityPlanningData,
  EquityPreset,
  FinancingProfileId,
} from '@/lib/equity-planning';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import {
  FamilyEconomyFloatingCta,
  FamilyEconomyLeadDialog,
  FamilyEconomyValueCard,
} from '@/components/advisor/FamilyEconomyAdvisor';
import type { AdvisorLeadContext } from '@/components/advisor/FamilyEconomyAdvisor';
import { AllocationDonut } from './AllocationDonut';
import { ExpensesTable } from './ExpensesTable';
import {
  EQUITY_ADVISOR_CARD_TITLE,
  EQUITY_ADVISOR_CONFIRMATION,
  EQUITY_ADVISOR_INTRO,
  EQUITY_ADVISOR_ORIGIN,
  EQUITY_ADVISOR_POINTS,
  FamilyEconomyHeaderButton,
} from './FamilyEconomyCta';
import { MonthCalendar } from './MonthCalendar';
import type { DayMarker } from './MonthCalendar';
import { EquityGuestDialog, GuestSaveNotice, useEquityGuestGate } from './EquityGuestGate';
import { useEquityPlan } from './useEquityPlan';
import {
  HE_DATE,
  HE_MONTH,
  categoryIcon,
  categoryTone,
  compactShekel,
  dayKey,
  parseDayKey,
  shekel,
} from './theme';

const STEPS = [
  { title: 'הנכס והמימון', description: 'מחיר, פרופיל ומועד יעד' },
  { title: 'טבלת ההוצאות', description: 'כל שקל עד קבלת המפתח' },
  { title: 'סיכום ותזרים', description: 'מתי צריך כמה' },
];

/**
 * כלי תכנון ההוצאות — ההון העצמי וכל ההוצאות הנלוות לרכישת דירה.
 *
 * שלושה מסכים: פרטי הנכס והמימון, טבלת ההוצאות על ציר הזמן, וסיכום התזרים.
 * הטבלה נפתחת עם שורת ההון העצמי בלבד; כל שאר השורות ריקות ומתעדכנות לפי מה
 * שהמשתמש מזין, כשלצד כל שורה מוצג מה מקובל בשוק.
 *
 * `embedded` — הכלי מוצג בתוך האזור האישי ולא כעמוד עצמאי, ולכן בלי הרקע
 * המלא ובלי הכותרת הראשית של העמוד.
 */
export default function EquityPlanningTool({ embedded = false }: { embedded?: boolean }) {
  const { data, setData, ready, signedIn, saveState, savedAt, reset } = useEquityPlan();
  const gate = useEquityGuestGate(ready && !signedIn);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [targetMonth, setTargetMonth] = useState<Date>(() => new Date());
  /** טופס הפנייה ליועץ כלכלת המשפחה — נפתח מכל נקודות הפנייה בכלי */
  const [leadOpen, setLeadOpen] = useState(false);
  const [paymentsMonth, setPaymentsMonth] = useState<Date | null>(null);
  /** הנכס כפי שהיה לפני השינוי האחרון — כדי לעדכן שורות שעדיין בערך המוצע */
  const previous = useRef({ price: 0, profile: 'first-home' as FinancingProfileId, targetDate: '' });

  const { propertyData, expenses } = data;
  const totals = useMemo(() => calculateEquityTotals(data), [data]);
  const required = minEquityRequired(propertyData);

  // ───────────────────────── עריכה, עם ההגבלה למי שאינו רשום ─────────────────────────

  const { allow: allowChange, note: noteChange } = gate;

  const guard = useCallback(
    (fieldKey: string, apply: () => void) => {
      if (!allowChange(fieldKey)) return;
      apply();
    },
    [allowChange]
  );

  const updateField = useCallback(
    (expenseId: string, field: keyof EquityExpense, value: unknown) => {
      guard(`${expenseId}:${String(field)}`, () =>
        setData((prev) => ({
          ...prev,
          expenses: prev.expenses.map((expense) =>
            expense.id === expenseId ? { ...expense, [field]: value } : expense
          ),
        }))
      );
    },
    [guard, setData]
  );

  const addExpense = useCallback(
    (categoryId: string) => {
      const id = `${categoryId}-${Date.now()}`;
      guard(`add:${id}`, () =>
        setData((prev) => ({
          ...prev,
          expenses: [
            ...prev.expenses,
            {
              id,
              categoryId,
              description: '',
              amount: 0,
              paymentDate: prev.propertyData.targetDate || dayKey(new Date()),
              status: 'planned',
              calculationSource: 'fixed',
              notes: '',
            },
          ],
        }))
      );
      setExpanded((prev) => new Set(prev).add(categoryId));
    },
    [guard, setData]
  );

  const addFromPreset = useCallback(
    (categoryId: string, preset: EquityPreset) => {
      const id = `${categoryId}-preset-${Date.now()}`;
      guard(`add:${id}`, () =>
        setData((prev) => {
          const index = prev.expenses.filter((expense) => expense.categoryId === categoryId).length;
          const isBrokerage = preset.key === BROKERAGE_PRESET_KEY;
          const next: EquityExpense = {
            id,
            categoryId,
            description: preset.description,
            // גם שורה שנוספת מתבנית נפתחת ריקה — מלבד התיווך כשהוא פעיל
            amount:
              isBrokerage && prev.usesBroker
                ? Math.round(prev.propertyData.price * BROKERAGE_PERCENT)
                : 0,
            paymentDate: calculateExpenseDate(categoryId, prev.propertyData.targetDate, index),
            status: 'planned',
            calculationSource: calculationSourceOf(preset),
            percentageOfPrice: preset.percentageOfPrice,
            minAmount: preset.minAmount,
            maxAmount: preset.maxAmount,
            notes: preset.notes,
            presetKey: preset.key,
            suggested: suggestedAmount(preset, prev.propertyData.price),
          };
          return { ...prev, expenses: [...prev.expenses, next] };
        })
      );
      setExpanded((prev) => new Set(prev).add(categoryId));
    },
    [guard, setData]
  );

  const duplicateExpense = useCallback(
    (expense: EquityExpense) => {
      const id = `${expense.id}-copy-${Date.now()}`;
      guard(`add:${id}`, () =>
        setData((prev) => ({
          ...prev,
          expenses: [
            ...prev.expenses,
            { ...expense, id, description: `${expense.description} (עותק)` },
          ],
        }))
      );
    },
    [guard, setData]
  );

  const deleteExpense = useCallback(
    (expenseId: string) => {
      guard(`delete:${expenseId}`, () =>
        setData((prev) => ({
          ...prev,
          expenses: prev.expenses.filter((expense) => expense.id !== expenseId),
        }))
      );
    },
    [guard, setData]
  );

  /** "העסקה מבוצעת בעזרת מתווך" — מפעיל את ברירת המחדל של 1.5% מערך הנכס */
  const toggleBroker = useCallback(
    (next: boolean) => {
      guard('broker', () =>
        setData((prev) => ({
          ...prev,
          usesBroker: next,
          expenses: prev.expenses.map((expense) =>
            expense.presetKey === BROKERAGE_PRESET_KEY
              ? {
                  ...expense,
                  amount: next ? Math.round(prev.propertyData.price * BROKERAGE_PERCENT) : 0,
                }
              : expense
          ),
        }))
      );
    },
    [guard, setData]
  );

  /**
   * פרטי הנכס פתוחים גם למי שאינו רשום — בלעדיהם אי אפשר לראות את הכלי בכלל.
   * ההגבלה חלה על הערכים שבטבלה, אבל ההתראה על השמירה מופיעה כבר מכאן.
   */
  const setProperty = useCallback(
    (patch: Partial<EquityPlanningData['propertyData']>) => {
      noteChange();
      setData((prev) => ({ ...prev, propertyData: { ...prev.propertyData, ...patch } }));
    },
    [noteChange, setData]
  );

  const goToStep = useCallback(
    (step: number) => setData((prev) => ({ ...prev, currentStep: step })),
    [setData]
  );

  // ───────────────────────── עדכונים נגזרים ─────────────────────────

  // פתיחת הטבלה: שורת ההון העצמי עם הסכום המינימלי, כל השאר ריקות
  useEffect(() => {
    if (!ready) return;
    if (data.currentStep !== 1 || data.expenses.length > 0 || propertyData.price <= 0) return;
    setData((prev) => ({ ...prev, expenses: buildInitialExpenses(prev.propertyData, prev.usesBroker) }));
  }, [ready, data.currentStep, data.expenses.length, propertyData.price, setData]);

  /**
   * שינוי במחיר, בפרופיל או במועד היעד גורר את השורות שעדיין יושבות על הערך
   * המוצע. שורה שהמשתמש שינה בעצמו נשארת כפי שהיא — מה שהוא הזין הוא המקור.
   */
  useEffect(() => {
    if (!ready) return;
    const before = previous.current;
    const changed =
      before.price !== propertyData.price ||
      before.profile !== propertyData.financingProfile ||
      before.targetDate !== propertyData.targetDate;
    if (!changed) return;

    const oldMin = before.price * FINANCING_PROFILES[before.profile].minEquityPercent;
    const newMin = minEquityRequired(propertyData);
    const oldBrokerage = Math.round(before.price * BROKERAGE_PERCENT);
    const newBrokerage = Math.round(propertyData.price * BROKERAGE_PERCENT);
    const hadTarget = before.targetDate;
    previous.current = {
      price: propertyData.price,
      profile: propertyData.financingProfile,
      targetDate: propertyData.targetDate,
    };
    if (before.price === 0 && !hadTarget) return;

    setData((prev) => {
      const indexes = new Map<string, number>();
      return {
        ...prev,
        expenses: prev.expenses.map((expense) => {
          const index = indexes.get(expense.categoryId) ?? 0;
          indexes.set(expense.categoryId, index + 1);

          let amount = expense.amount;
          if (expense.categoryId === EQUITY_CATEGORY_ID && Math.round(amount) === Math.round(oldMin)) {
            amount = newMin;
          } else if (
            expense.presetKey === BROKERAGE_PRESET_KEY &&
            prev.usesBroker &&
            Math.round(amount) === oldBrokerage
          ) {
            amount = newBrokerage;
          }

          let paymentDate = expense.paymentDate;
          if (
            hadTarget &&
            propertyData.targetDate &&
            hadTarget !== propertyData.targetDate &&
            paymentDate === calculateExpenseDate(expense.categoryId, hadTarget, index)
          ) {
            paymentDate = calculateExpenseDate(expense.categoryId, propertyData.targetDate, index);
          }

          return amount === expense.amount && paymentDate === expense.paymentDate
            ? expense
            : { ...expense, amount, paymentDate };
        }),
      };
    });
  }, [ready, propertyData, setData]);

  // לוח התשלומים נפתח על החודש של התשלום הראשון
  useEffect(() => {
    if (paymentsMonth || expenses.length === 0) return;
    const first = expenses
      .map((expense) => parseDayKey(expense.paymentDate))
      .filter((date): date is Date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (first) setPaymentsMonth(new Date(first.getFullYear(), first.getMonth(), 1));
  }, [expenses, paymentsMonth]);

  // לוח בחירת מועד היעד נפתח על החודש של המועד שכבר נבחר
  useEffect(() => {
    const target = parseDayKey(propertyData.targetDate);
    if (target) setTargetMonth(new Date(target.getFullYear(), target.getMonth(), 1));
  }, [propertyData.targetDate]);

  // ───────────────────────── נגזרות לתצוגה ─────────────────────────

  const expensesByCategory = useMemo(() => {
    const map: Record<string, EquityExpense[]> = {};
    expenses.forEach((expense) => {
      (map[expense.categoryId] ??= []).push(expense);
    });
    return map;
  }, [expenses]);

  const slices = useMemo(
    () =>
      EQUITY_CATEGORIES.map((category) => ({
        id: category.id,
        name: category.name,
        total: (expensesByCategory[category.id] ?? []).reduce((sum, item) => sum + item.amount, 0),
        hex: categoryTone(category.color).hex,
      })).filter((slice) => slice.total > 0),
    [expensesByCategory]
  );

  const markers = useMemo(() => {
    const map = new Map<string, DayMarker>();
    expenses.forEach((expense) => {
      if (!expense.paymentDate || expense.amount <= 0) return;
      const current = map.get(expense.paymentDate);
      const hex = categoryTone(equityCategory(expense.categoryId)?.color ?? 'gray').hex;
      if (!current) {
        map.set(expense.paymentDate, { count: 1, amount: expense.amount, hex });
      } else {
        current.count += 1;
        current.amount += expense.amount;
        if (expense.amount > current.amount / current.count) current.hex = hex;
      }
    });
    return map;
  }, [expenses]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    expenses.forEach((expense) => {
      if (!expense.paymentDate || expense.amount <= 0) return;
      const month = expense.paymentDate.slice(0, 7);
      const current = map.get(month) ?? { total: 0, count: 0 };
      current.total += expense.amount;
      current.count += 1;
      map.set(month, current);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [expenses]);

  /** תמונת המצב שנשלחת ליועץ, כדי שהשיחה תתחיל מהמספרים של הלקוח ולא מאפס */
  const leadContext = useMemo<AdvisorLeadContext>(
    () => ({
      origin: EQUITY_ADVISOR_ORIGIN,
      points: EQUITY_ADVISOR_POINTS,
      intro: EQUITY_ADVISOR_INTRO,
      confirmation: EQUITY_ADVISOR_CONFIRMATION,
      summary: [
        propertyData.price > 0 ? `מחיר נכס ${shekel(propertyData.price)}` : null,
        `פרופיל מימון: ${FINANCING_PROFILES[propertyData.financingProfile].name}`,
        propertyData.targetDate ? `מועד יעד ${propertyData.targetDate}` : null,
        `הון עצמי מינימלי נדרש ${shekel(required)}`,
        `הון עצמי שהוזן ${shekel(totals.equityAmount)}`,
        `הוצאות נלוות ${shekel(totals.sideExpenses)}`,
        `סה״כ בטבלה ${shekel(totals.totalExpenses)}`,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
    [propertyData, required, totals.equityAmount, totals.sideExpenses, totals.totalExpenses]
  );

  const toggleCategory = useCallback((categoryId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  // ───────────────────────── ייצוא ─────────────────────────

  const exportToCSV = () => {
    const headers = ['תיאור', 'קטגוריה', 'סכום', 'תאריך תשלום', 'סטטוס', 'הערות'];
    const rows = expenses.map((expense) => [
      expense.description,
      equityCategory(expense.categoryId)?.name ?? '',
      String(expense.amount),
      expense.paymentDate,
      expense.status === 'paid' ? 'שולם' : expense.status === 'planned' ? 'מתוכנן' : 'ממתין',
      expense.notes,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `תכנון_הון_עצמי_${dayKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToPDF = () => {
    // שמירה כ-PDF נעשית דרך חלון ההדפסה של הדפדפן
    window.print();
  };

  const canContinue = propertyData.price > 0 && propertyData.targetDate !== '';

  // ───────────────────────── מסכים ─────────────────────────

  const renderProperty = () => (
    <motion.div
      key="step-property"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-4 lg:grid-cols-3"
    >
      <div className="space-y-4 lg:col-span-2">
        <Panel title="פרטי הנכס" icon={HomeIcon} hint="המספרים האלה מזינים את כל הטבלה">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-black text-slate-600">מחיר הנכס</span>
            <div className="relative">
              <FormattedNumberValueInput
                value={propertyData.price || ''}
                onValueChange={(next) => setProperty({ price: next })}
                placeholder="0"
                className="h-14 rounded-2xl border-2 border-slate-200 bg-white pl-10 text-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-blue-500/10"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">
                ₪
              </span>
            </div>
          </label>

          <div className="mt-5">
            <span className="mb-2 block text-[13px] font-black text-slate-600">פרופיל מימון</span>
            <div className="grid grid-cols-2 gap-2">
              {FINANCING_PROFILE_IDS.map((id) => {
                const profile = FINANCING_PROFILES[id];
                const active = propertyData.financingProfile === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setProperty({ financingProfile: id })}
                    className={`rounded-2xl border-2 p-3 text-right transition-all ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[15px] font-black">{profile.name}</span>
                    <span
                      className={`mt-0.5 block text-[12px] font-bold ${active ? 'text-white/60' : 'text-slate-400'}`}
                    >
                      הון עצמי מינימלי {profile.minEquityPercent * 100}%
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[12px] font-semibold text-slate-400">
              שיעור המימון המרבי נקבע בתקנות בנק ישראל לפי סוג העסקה.
            </p>
          </div>
        </Panel>

        <Panel title="מועד היעד לרכישה" icon={Target} hint="ממנו נגזרים מועדי התשלום המוצעים">
          <MonthCalendar
            month={targetMonth}
            onMonthChange={setTargetMonth}
            selected={propertyData.targetDate || null}
            onSelect={(key) => setProperty({ targetDate: key })}
          />
          {propertyData.targetDate && (
            <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-[13px] font-black text-blue-900">
              מועד היעד: {HE_DATE.format(new Date(propertyData.targetDate))}
            </p>
          )}
        </Panel>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-600/20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-black">
            <Banknote className="h-3.5 w-3.5" />
            הון עצמי מינימלי
          </span>
          <p className="mt-3 text-3xl font-black">{shekel(required)}</p>
          <p className="mt-1 text-[13px] font-bold text-white/70">
            {FINANCING_PROFILES[propertyData.financingProfile].minEquityPercent * 100}% ממחיר הנכס · לפי
            תקנות בנק ישראל
          </p>
          <div className="mt-4 rounded-2xl bg-white/10 p-3">
            <p className="text-[12px] font-bold text-white/70">המשכנתא המשוערת</p>
            <p className="text-xl font-black">{shekel(Math.max(0, propertyData.price - required))}</p>
          </div>
        </div>

        <Panel title="מה מחכה בשלב הבא" icon={Sparkles}>
          <ul className="space-y-2">
            {[
              'טבלת ההוצאות נפתחת עם שורת ההון העצמי בלבד',
              'כל שאר השורות ריקות — מזינים רק מה שרלוונטי לעסקה שלכם',
              'בשורת התיווך אפשר לסמן שהעסקה מבוצעת בעזרת מתווך',
              'כל מועד תשלום נכנס ללוח התשלומים ולתזרים',
            ].map((line) => (
              <li key={line} className="flex gap-2 text-[13px] leading-relaxed text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {line}
              </li>
            ))}
          </ul>
        </Panel>

        <FamilyEconomyValueCard
          headline={EQUITY_ADVISOR_CARD_TITLE}
          points={EQUITY_ADVISOR_POINTS}
          onContact={() => setLeadOpen(true)}
        />
      </div>

      <div className="lg:col-span-3">
        <div className="flex justify-center">
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => goToStep(1)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-[16px] font-black text-white shadow-lg shadow-slate-900/20 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
          >
            המשך לטבלת ההוצאות
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        {!canContinue && (
          <p className="mt-2 text-center text-[13px] font-semibold text-slate-400">
            להמשך צריך מחיר נכס ומועד יעד לרכישה
          </p>
        )}
      </div>
    </motion.div>
  );

  const renderExpenses = () => (
    <motion.div
      key="step-expenses"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="מחיר הנכס" value={compactShekel(propertyData.price)} icon={HomeIcon} />
        <Metric
          label="הון עצמי"
          value={compactShekel(totals.equityAmount)}
          icon={Banknote}
          tone="emerald"
          hint={`מינימום ${compactShekel(required)}`}
        />
        <Metric
          label="הוצאות נלוות"
          value={compactShekel(totals.sideExpenses)}
          icon={FileText}
          tone="amber"
          hint={`${((totals.sideExpenses / (propertyData.price || 1)) * 100).toFixed(1)}% ממחיר הנכס`}
        />
        <Metric
          label="סה״כ נדרש"
          value={compactShekel(totals.totalExpenses)}
          icon={Wallet}
          tone="dark"
          hint="הון עצמי + כל ההוצאות"
        />
      </div>

      <GuestSaveNotice gate={gate} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpensesTable
            data={data}
            expensesByCategory={expensesByCategory}
            totalExpenses={totals.totalExpenses}
            percentageOfPrice={totals.percentageOfPrice}
            expanded={expanded}
            onToggleCategory={toggleCategory}
            selectedDate={selectedDate}
            selectedCategory={selectedCategory}
            onClearFilters={() => {
              setSelectedDate(null);
              setSelectedCategory(null);
            }}
            onField={updateField}
            onAdd={addExpense}
            onAddPreset={addFromPreset}
            onDuplicate={duplicateExpense}
            onDelete={deleteExpense}
            onToggleBroker={toggleBroker}
          />
        </div>

        <div className="space-y-4">
          <Panel title="לוח התשלומים" icon={CalendarDays} hint="לחיצה על יום מסננת את הטבלה">
            <MonthCalendar
              month={paymentsMonth ?? new Date()}
              onMonthChange={setPaymentsMonth}
              markers={markers}
              selected={selectedDate}
              onSelect={(key) => {
                setSelectedCategory(null);
                setSelectedDate((prev) => (prev === key ? null : key));
              }}
            />
            {selectedDate && markers.get(selectedDate) && (
              <p className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-black text-white">
                {markers.get(selectedDate)?.count} תשלומים ·{' '}
                {shekel(markers.get(selectedDate)?.amount ?? 0)}
              </p>
            )}
          </Panel>

          <Panel title="חלוקת ההון" icon={PieChart} hint="לחיצה על קטגוריה מסננת את הטבלה">
            <AllocationDonut
              slices={slices}
              selected={selectedCategory}
              onSelect={(id) => {
                setSelectedDate(null);
                setSelectedCategory(id);
              }}
            />
          </Panel>
        </div>
      </div>

      <FamilyEconomyValueCard
        headline={EQUITY_ADVISOR_CARD_TITLE}
        points={EQUITY_ADVISOR_POINTS}
        onContact={() => setLeadOpen(true)}
      />

      <StepNav
        onBack={() => goToStep(0)}
        backLabel="חזרה לפרטי הנכס"
        onNext={() => goToStep(2)}
        nextLabel="המשך לסיכום ותזרים"
      />
    </motion.div>
  );

  const renderSummary = () => {
    const peak = byMonth.reduce((max, [, value]) => Math.max(max, value.total), 0);
    const statuses: Array<{ key: 'paid' | 'planned' | 'pending'; label: string; value: number; tone: string }> = [
      { key: 'paid', label: 'שולם', value: totals.paid, tone: 'bg-emerald-500' },
      { key: 'planned', label: 'מתוכנן', value: totals.planned, tone: 'bg-blue-500' },
      { key: 'pending', label: 'ממתין', value: totals.pending, tone: 'bg-amber-500' },
    ];

    return (
      <motion.div
        key="step-summary"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="הון עצמי נדרש" value={compactShekel(required)} icon={Banknote} tone="emerald" />
          <Metric label="הוצאות נלוות" value={compactShekel(totals.sideExpenses)} icon={FileText} tone="amber" />
          <Metric label="סה״כ בטבלה" value={compactShekel(totals.totalExpenses)} icon={Wallet} tone="dark" />
          <Metric
            label="שיעור מהנכס"
            value={`${totals.percentageOfPrice.toFixed(1)}%`}
            icon={TrendingUp}
            hint="סך הטבלה ביחס למחיר הנכס"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Panel title="תזרים לפי חודשים" icon={TrendingUp} hint="מתי צריך להביא כמה כסף">
              {byMonth.length === 0 ? (
                <p className="py-8 text-center text-[13px] font-semibold text-slate-400">
                  אין עדיין תשלומים עם סכום ומועד
                </p>
              ) : (
                <div className="space-y-2.5">
                  {byMonth.map(([month, value]) => (
                    <div key={month} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-[12px] font-black text-slate-500">
                        {HE_MONTH.format(new Date(`${month}-01T00:00:00`))}
                      </span>
                      <span className="h-6 min-w-0 flex-1 overflow-hidden rounded-lg bg-slate-100">
                        <span
                          className="block h-full rounded-lg bg-gradient-to-l from-blue-600 to-indigo-500"
                          style={{ width: `${peak > 0 ? Math.max(4, (value.total / peak) * 100) : 0}%` }}
                        />
                      </span>
                      <span className="w-24 shrink-0 text-left text-[13px] font-black text-slate-900">
                        {compactShekel(value.total)}
                      </span>
                      <span className="w-14 shrink-0 text-left text-[11px] font-bold text-slate-400">
                        {value.count} ס׳
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="סטטוס התשלומים" icon={CheckCircle2}>
              <div className="space-y-2">
                {statuses.map((status) => (
                  <div key={status.key} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[13px] font-bold text-slate-600">
                      <span className={`h-2.5 w-2.5 rounded-full ${status.tone}`} />
                      {status.label}
                    </span>
                    <span className="text-[14px] font-black text-slate-900">{shekel(status.value)}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="פירוט לפי קטגוריה" icon={PieChart}>
              <div className="space-y-1.5">
                {slices.length === 0 && (
                  <p className="py-3 text-center text-[13px] font-semibold text-slate-400">
                    עדיין לא הוזנו סכומים
                  </p>
                )}
                {slices.map((slice) => {
                  const Icon = categoryIcon(slice.id);
                  return (
                    <div key={slice.id} className="flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: slice.hex }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">
                        {slice.name}
                      </span>
                      <span className="shrink-0 text-[13px] font-black text-slate-900">
                        {compactShekel(slice.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Panel title="ייצוא ושיתוף" icon={Download} hint="הטבלה המלאה, לשמירה או לשליחה">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportToCSV}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[14px] font-black text-white transition-colors hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  ייצוא לאקסל (CSV)
                </button>
                <button
                  type="button"
                  onClick={exportToPDF}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-[14px] font-black text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4" />
                  שמירה כ-PDF
                </button>
                <button
                  type="button"
                  onClick={() => void reset()}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-[14px] font-black text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-600"
                >
                  <RotateCcw className="h-4 w-4" />
                  התחלה מחדש
                </button>
              </div>
              {signedIn && (
                <p className="mt-3 text-[12px] font-semibold text-slate-400">
                  התכנון נשמר בחשבון שלכם, ומועדי התשלום מופיעים בלוח השנה הראשי באזור האישי.
                </p>
              )}
            </Panel>
          </div>
          <FamilyEconomyValueCard
            headline="רוצים לעבור על התזרים עם מומחה?"
            points={EQUITY_ADVISOR_POINTS}
            onContact={() => setLeadOpen(true)}
          />
        </div>

        <StepNav onBack={() => goToStep(1)} backLabel="חזרה לטבלת ההוצאות" />
      </motion.div>
    );
  };

  const header = (
    <section
      className={`relative overflow-hidden bg-slate-950 px-4 py-6 sm:px-6 md:py-8 ${
        embedded ? 'rounded-3xl' : ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-blue-600/25 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/80">
              <Wallet className="h-3.5 w-3.5" />
              תכנון הוצאות
            </span>
            {/* באזור האישי הכותרת כבר מופיעה מעל הכלי — אין צורך לחזור עליה */}
            {!embedded && (
              <>
                <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">
                  תכנון הון עצמי והוצאות רכישה
                </h1>
                <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/60">
                  כל שקל שצריך להביא עד קבלת המפתח, על ציר זמן אחד: ההון העצמי לפי תקנות בנק ישראל,
                  ההוצאות הנלוות ומועדי התשלום.
                </p>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <FamilyEconomyHeaderButton onContact={() => setLeadOpen(true)} />
            <SaveBadge signedIn={signedIn} state={saveState} savedAt={savedAt} />
          </div>
        </div>

        <nav className="mt-5 grid gap-2 sm:grid-cols-3">
          {STEPS.map((step, index) => {
            const active = data.currentStep === index;
            const done = data.currentStep > index;
            const reachable = index === 0 || canContinue;
            return (
              <button
                key={step.title}
                type="button"
                disabled={!reachable}
                onClick={() => reachable && goToStep(index)}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-right transition-all ${
                  active
                    ? 'bg-white text-slate-900 shadow-lg'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[14px] font-black ${
                    active
                      ? 'bg-slate-900 text-white'
                      : done
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/10 text-white/70'
                  }`}
                >
                  {done ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-black">{step.title}</span>
                  <span
                    className={`block truncate text-[11px] font-bold ${active ? 'text-slate-400' : 'text-white/40'}`}
                  >
                    {step.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );

  const body = (
    <div className={embedded ? 'mt-4' : 'mx-auto max-w-[1400px] px-4 py-5 sm:px-6'}>
      {!ready ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-[14px] font-bold">טוען את התכנון שלכם…</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {data.currentStep === 0 && renderProperty()}
          {data.currentStep === 1 && renderExpenses()}
          {data.currentStep === 2 && renderSummary()}
        </AnimatePresence>
      )}
    </div>
  );

  return (
    <div dir="rtl" className={embedded ? '' : 'min-h-screen bg-slate-100 pb-16'}>
      {header}
      {body}
      <EquityGuestDialog open={gate.promptOpen} onClose={gate.closePrompt} />
      <FamilyEconomyLeadDialog open={leadOpen} onOpenChange={setLeadOpen} context={leadContext} />
      <FamilyEconomyFloatingCta context={leadContext} />
    </div>
  );
}

// ───────────────────────── רכיבי תצוגה קטנים ─────────────────────────

function Panel({
  title,
  icon: Icon,
  hint,
  children,
}: {
  title: string;
  icon: React.ElementType;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="mb-3 flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-black text-slate-900">{title}</h3>
          {hint && <p className="text-[12px] font-semibold text-slate-400">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  hint?: string;
  tone?: 'default' | 'emerald' | 'amber' | 'dark';
}) {
  const shell =
    tone === 'dark'
      ? 'bg-gradient-to-br from-slate-900 to-indigo-900 border-transparent text-white'
      : tone === 'emerald'
        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100'
        : tone === 'amber'
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100'
          : 'bg-white border-slate-200';
  const labelTone = tone === 'dark' ? 'text-white/60' : 'text-slate-400';
  const valueTone = tone === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${shell}`}>
      <div className={`flex items-center gap-1.5 text-[12px] font-black ${labelTone}`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-black leading-tight ${valueTone}`}>{value}</p>
      {hint && <p className={`mt-0.5 text-[11px] font-bold ${labelTone}`}>{hint}</p>}
    </div>
  );
}

function StepNav({
  onBack,
  backLabel,
  onNext,
  nextLabel,
}: {
  onBack: () => void;
  backLabel: string;
  onNext?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="flex flex-col justify-center gap-2 pt-2 sm:flex-row">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-[15px] font-black text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
      >
        <ArrowRight className="h-4 w-4" />
        {backLabel}
      </button>
      {onNext && nextLabel && (
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-8 py-3 text-[15px] font-black text-white shadow-lg shadow-slate-900/20 transition-transform hover:-translate-y-0.5"
        >
          {nextLabel}
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** מצב השמירה — לרשומים בחשבון, ולשאר התראה שהכול מקומי בלבד */
function SaveBadge({
  signedIn,
  state,
  savedAt,
}: {
  signedIn: boolean;
  state: 'idle' | 'saving' | 'saved' | 'error';
  savedAt: string | null;
}) {
  if (!signedIn) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-black text-amber-200">
        <CloudOff className="h-3.5 w-3.5" />
        לא נשמר — נדרשת הרשמה
      </span>
    );
  }

  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/70">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        שומר…
      </span>
    );
  }

  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-[11px] font-black text-rose-200">
        <CloudOff className="h-3.5 w-3.5" />
        השמירה נכשלה
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-black text-emerald-200">
      <Cloud className="h-3.5 w-3.5" />
      {savedAt ? 'נשמר בחשבון שלכם' : 'נשמר אוטומטית בחשבון'}
    </span>
  );
}
