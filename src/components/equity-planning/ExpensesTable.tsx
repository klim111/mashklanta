'use client';

import { Fragment } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Handshake,
  Plus,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  BROKERAGE_PERCENT,
  BROKERAGE_PRESET_KEY,
  BROKERAGE_TOGGLE_LABEL,
  EQUITY_CATEGORIES,
  EQUITY_CATEGORY_ID,
  EQUITY_VIEW_MODE_LABELS,
  equityStanding,
  minEquityRequired,
  rangeAmount,
} from '@/lib/equity-planning';
import type { EquityExpense, EquityPlanningData, EquityPreset, EquityViewMode } from '@/lib/equity-planning';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { categoryIcon, categoryTone, shekel, STANDING_TONES } from './theme';

export interface ExpensesTableProps {
  data: EquityPlanningData;
  expensesByCategory: Record<string, EquityExpense[]>;
  totalExpenses: number;
  percentageOfPrice: number;
  expanded: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  selectedDate: string | null;
  selectedCategory: string | null;
  onClearFilters: () => void;
  onField: (expenseId: string, field: keyof EquityExpense, value: unknown) => void;
  onAdd: (categoryId: string) => void;
  onAddPreset: (categoryId: string, preset: EquityPreset) => void;
  onDuplicate: (expense: EquityExpense) => void;
  onDelete: (expenseId: string) => void;
  onToggleBroker: (next: boolean) => void;
}

const inputBase =
  'h-10 w-full rounded-xl border border-transparent bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 hover:border-slate-200 hover:bg-white focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5';

/**
 * טבלת ההוצאות — הלב של הכלי.
 *
 * הקטגוריות מקופלות כברירת מחדל ונפתחות בלחיצה, כך שהמסך נשאר קריא גם עם
 * עשרות שורות. כל שורה נערכת במקום: תיאור, סכום ומועד תשלום. שורות נפתחות
 * ריקות, ולצדן מוצג מה מקובל בשוק — לחיצה על ההצעה ממלאת אותה.
 */
export function ExpensesTable(props: ExpensesTableProps) {
  const { data, expensesByCategory, selectedDate, selectedCategory } = props;
  const equityExpense = data.expenses.find((expense) => expense.categoryId === EQUITY_CATEGORY_ID);
  const filtered = selectedDate !== null || selectedCategory !== null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="bg-gradient-to-l from-slate-900 via-slate-900 to-indigo-950 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-subtitle font-black text-white">טבלת ההוצאות</h2>
            <p className="mt-0.5 text-sm font-semibold text-white/50">
              {EQUITY_CATEGORIES.length} קטגוריות · {data.expenses.length} סעיפים
            </p>
          </div>
          <div className="text-left">
            <p className="text-2xl font-black text-white">{shekel(props.totalExpenses)}</p>
            <p className="text-2xs font-bold text-white/50">
              {props.percentageOfPrice.toFixed(1)}% ממחיר הנכס
            </p>
          </div>
        </div>

        {filtered && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {selectedDate && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-2xs font-black text-white">
                מסונן ליום {new Date(selectedDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
              </span>
            )}
            {selectedCategory && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-2xs font-black text-white">
                {EQUITY_CATEGORIES.find((category) => category.id === selectedCategory)?.name}
              </span>
            )}
            <button
              type="button"
              onClick={props.onClearFilters}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-2xs font-black text-slate-900 transition-colors hover:bg-white/90"
            >
              <X className="h-3 w-3" />
              ביטול סינון
            </button>
          </div>
        )}
      </header>

      <div className="divide-y divide-slate-100">
        {equityExpense && !selectedDate && (selectedCategory === null || selectedCategory === EQUITY_CATEGORY_ID) && (
          <EquityRow expense={equityExpense} data={data} onField={props.onField} />
        )}

        {EQUITY_CATEGORIES.filter((category) => category.id !== EQUITY_CATEGORY_ID).map((category) => {
          if (selectedCategory && selectedCategory !== category.id) return null;

          let rows = [...(expensesByCategory[category.id] ?? [])].sort((a, b) =>
            a.paymentDate.localeCompare(b.paymentDate)
          );
          if (selectedDate) rows = rows.filter((row) => row.paymentDate === selectedDate);
          if (selectedDate && rows.length === 0) return null;

          const total = rows.reduce((sum, row) => sum + row.amount, 0);
          const open =
            props.expanded.has(category.id) || selectedCategory === category.id || selectedDate !== null;
          const tone = categoryTone(category.color);
          const Icon = categoryIcon(category.id);
          const missing = rows.filter((row) => row.amount === 0).length;

          return (
            <Fragment key={category.id}>
              <button
                type="button"
                onClick={() => props.onToggleCategory(category.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-slate-50 sm:px-6"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.chip}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-info font-black text-slate-900">
                    {category.name}
                  </span>
                  <span className="block truncate text-xs font-semibold text-slate-400">
                    {category.description}
                    {rows.length > 0 && ` · ${rows.length} סעיפים`}
                    {missing > 0 && ` · ${missing} ללא סכום`}
                  </span>
                </span>
                <span className="shrink-0 text-left">
                  <span className="block text-lg font-black text-slate-900">{shekel(total)}</span>
                  <span className="block text-2xs font-bold text-slate-400">פירוט</span>
                </span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-slate-50/60"
                  >
                    <div className="space-y-2 px-3 py-3 sm:px-5">
                      {rows.map((expense) => (
                        <ExpenseRow
                          key={expense.id}
                          expense={expense}
                          price={data.propertyData.price}
                          usesBroker={data.usesBroker}
                          onField={props.onField}
                          onDuplicate={props.onDuplicate}
                          onDelete={props.onDelete}
                          onToggleBroker={props.onToggleBroker}
                        />
                      ))}

                      {rows.length === 0 && (
                        <p className="py-3 text-center text-sm font-semibold text-slate-400">
                          אין סעיפים בקטגוריה זו
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => props.onAdd(category.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-button font-black text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
                        >
                          <Plus className="h-4 w-4" />
                          הוספת סעיף
                        </button>
                        {category.presets.map((preset) => (
                          <button
                            key={preset.description}
                            type="button"
                            onClick={() => props.onAddPreset(category.id, preset)}
                            title={preset.notes}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {preset.description}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}

/** שורת ההון העצמי — הסכום שקובע אם העסקה בכלל אפשרית, ולכן היא בראש ובולטת */
function EquityRow({
  expense,
  data,
  onField,
}: {
  expense: EquityExpense;
  data: EquityPlanningData;
  onField: ExpensesTableProps['onField'];
}) {
  const required = minEquityRequired(data.propertyData);
  const standing = equityStanding(expense.amount, required, data.propertyData.price);
  const tone = STANDING_TONES[standing.level];
  const Icon = categoryIcon(EQUITY_CATEGORY_ID);

  return (
    <div className={`px-4 py-4 sm:px-6 ${tone.row}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-emerald-700 shadow-sm">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-base font-black ${tone.title}`}>הון עצמי לרכישת הדירה</p>
          <p className={`mt-0.5 text-sm font-bold ${tone.note}`}>{standing.message}</p>
          {standing.motivation && (
            <p className={`mt-1 text-xs font-semibold ${tone.note}`}>{standing.motivation}</p>
          )}
        </div>
        <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-auto">
          <label className="block sm:w-40">
            <span className={`mb-1 block text-2xs font-bold ${tone.note}`}>סכום</span>
            <FormattedNumberValueInput
              value={expense.amount}
              onValueChange={(next) => onField(expense.id, 'amount', next)}
              className={`h-11 border-2 bg-white text-lg font-black ${tone.ring} ${tone.title}`}
            />
          </label>
          <label className="block sm:w-40">
            <span className={`mb-1 block text-2xs font-bold ${tone.note}`}>מועד</span>
            <input
              type="date"
              value={expense.paymentDate}
              onChange={(event) => onField(expense.id, 'paymentDate', event.target.value)}
              className={`h-11 w-full rounded-md border-2 bg-white px-2 text-sm font-bold ${tone.ring} ${tone.title}`}
            />
          </label>
        </div>
      </div>
      <p className={`mt-2 text-2xs font-semibold ${tone.note}`}>
        המינימום לפי תקנות בנק ישראל בפרופיל שנבחר: {shekel(required)}
      </p>
    </div>
  );
}

/** שורת הוצאה אחת: תיאור, סכום, מועד, סטטוס ופעולות */
function ExpenseRow({
  expense,
  price,
  usesBroker,
  onField,
  onDuplicate,
  onDelete,
  onToggleBroker,
}: {
  expense: EquityExpense;
  price: number;
  usesBroker: boolean;
  onField: ExpensesTableProps['onField'];
  onDuplicate: ExpensesTableProps['onDuplicate'];
  onDelete: ExpensesTableProps['onDelete'];
  onToggleBroker: ExpensesTableProps['onToggleBroker'];
}) {
  const paid = expense.status === 'paid';
  const isBrokerage = expense.presetKey === BROKERAGE_PRESET_KEY;
  const brokerageOff = isBrokerage && !usesBroker;

  // ההצעה מתעדכנת עם מחיר הנכס כשהיא אחוזית, ואחרת היא הסכום המקובל בשוק
  const suggestion =
    expense.percentageOfPrice && price > 0
      ? Math.round(price * expense.percentageOfPrice)
      : (expense.suggested ?? null);

  return (
    <div
      className={`rounded-2xl border bg-white p-3 transition-colors ${
        paid ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-2xs font-bold text-slate-400">תיאור</span>
          <input
            value={expense.description}
            onChange={(event) => onField(expense.id, 'description', event.target.value)}
            placeholder="תיאור ההוצאה"
            className={`${inputBase} ${paid ? 'text-emerald-700 line-through' : ''}`}
          />
        </label>

        <label className="lg:w-44">
          <span className="mb-1 block text-2xs font-bold text-slate-400">סכום (₪)</span>
          {brokerageOff ? (
            <button
              type="button"
              onClick={() => onToggleBroker(true)}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 px-2 text-xs font-black text-purple-700 transition-colors hover:border-purple-400 hover:bg-purple-100"
            >
              <Handshake className="h-4 w-4 shrink-0" />
              <span className="truncate">{BROKERAGE_TOGGLE_LABEL}</span>
            </button>
          ) : (
            <FormattedNumberValueInput
              // שורה שטרם הוזנה נשארת ריקה, ולא מציגה אפס שנראה כמו ערך
              value={expense.amount || ''}
              onValueChange={(next) => onField(expense.id, 'amount', next)}
              placeholder="0"
              className={`${inputBase} ${paid ? 'text-emerald-700 line-through' : ''}`}
            />
          )}
        </label>

        <label className="lg:w-44">
          <span className="mb-1 block text-2xs font-bold text-slate-400">מועד תשלום</span>
          <input
            type="date"
            value={expense.paymentDate}
            onChange={(event) => onField(expense.id, 'paymentDate', event.target.value)}
            className={`${inputBase} text-sm`}
          />
        </label>

        <div className="flex shrink-0 items-center gap-1 pb-0.5">
          <IconButton
            title={paid ? 'סמנו כמתוכנן' : 'סמנו כשולם'}
            onClick={() => onField(expense.id, 'status', paid ? 'planned' : 'paid')}
            className={
              paid
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            }
          >
            {paid ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </IconButton>
          <IconButton
            title="שכפול הסעיף"
            onClick={() => onDuplicate(expense)}
            className="text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton
            title="מחיקת הסעיף"
            onClick={() => onDelete(expense.id)}
            className="text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {expense.notes && (
          <span className="text-2xs font-semibold text-slate-400">{expense.notes}</span>
        )}

        {isBrokerage && usesBroker && (
          <button
            type="button"
            onClick={() => onToggleBroker(false)}
            className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-2xs font-black text-purple-700 transition-colors hover:bg-purple-100"
          >
            <Handshake className="h-3 w-3" />
            העסקה בעזרת מתווך · ברירת מחדל {(BROKERAGE_PERCENT * 100).toFixed(1)}% — ביטול
          </button>
        )}

        {/* בשורת טווח מוצגים שלושת התרחישים במקום הצעה אחת, כדי לא לכפול אותה */}
        {!brokerageOff &&
          expense.minAmount === undefined &&
          suggestion !== null &&
          suggestion > 0 &&
          suggestion !== expense.amount && (
            <SuggestionChip
              label={`הצעה ${shekel(suggestion)}`}
              onClick={() => onField(expense.id, 'amount', suggestion)}
            />
          )}

        {!brokerageOff &&
          expense.minAmount !== undefined &&
          expense.maxAmount !== undefined &&
          (['best', 'expected', 'worst'] as EquityViewMode[]).map((mode) => {
            const value = rangeAmount(expense, mode);
            if (value === null || value === expense.amount) return null;
            return (
              <SuggestionChip
                key={mode}
                label={`${EQUITY_VIEW_MODE_LABELS[mode]} ${shekel(value)}`}
                onClick={() => onField(expense.id, 'amount', value)}
              />
            );
          })}
      </div>
    </div>
  );
}

function SuggestionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-2xs font-black text-blue-700 transition-colors hover:bg-blue-100"
    >
      <Wand2 className="h-3 w-3" />
      {label}
    </button>
  );
}

function IconButton({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
