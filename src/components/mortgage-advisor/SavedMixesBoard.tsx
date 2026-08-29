'use client';

import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GitCompareArrows, Home, MapPin, PieChart } from 'lucide-react';
import { MixSummaryCard } from './MixSummaryCard';
import { MixComparison } from './MixComparison';
import type { ComparisonEntry } from './MixComparison';
import type { SavedMix } from './mixRecord';
import { DEAL_TYPES, MAX_LTV_PERCENT } from './types';
import { groupByProperty } from './propertyContext';
import { formatShekel } from './workspace/primitives';

interface SavedMixesBoardProps {
  saved: SavedMix[];
  ready: boolean;
  onOpen: (item: SavedMix) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  emptyState?: React.ReactNode;
}

/**
 * לוח התמהילים השמורים, מסודר לפי נכס.
 *
 * זהו אותו לוח שמוצג באזור האישי של הלקוח ובדף הלקוח אצל היועץ, כדי ששני
 * הצדדים יראו בדיוק את אותה תמונה של החלופות לאותה עסקה.
 */
export function SavedMixesBoard({
  saved,
  ready,
  onOpen,
  onDelete,
  onRename,
  emptyState,
}: SavedMixesBoardProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const groups = useMemo(() => groupByProperty(saved, (item) => item.mix), [saved]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (!ready) {
    return <p className="py-10 text-center text-sm text-slate-500">טוען תמהילים...</p>;
  }

  if (saved.length === 0) {
    return (
      <>
        {emptyState ?? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center">
              <PieChart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">עוד לא נשמרו תמהילים.</p>
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <PropertyGroup
          key={group.key}
          address={group.address}
          propertyValue={group.propertyValue}
          dealType={group.dealType}
          totalAmount={group.totalAmount}
          items={group.items}
          selected={selected}
          onToggle={toggle}
          onOpen={onOpen}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </div>
  );
}

interface PropertyGroupProps {
  address?: string;
  propertyValue?: number;
  dealType?: keyof typeof DEAL_TYPES;
  totalAmount: number;
  items: SavedMix[];
  selected: string[];
  onToggle: (id: string) => void;
  onOpen: (item: SavedMix) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
}

/**
 * קבוצת תמהילים אחת: כותרת עם פרטי הנכס והעסקה, ומתחתיה כל התמהילים שלה
 * בצורתם הסגורה. ההשוואה נעשית בין תמהילים מהקבוצה הזו בלבד.
 */
function PropertyGroup({
  address,
  propertyValue,
  dealType,
  totalAmount,
  items,
  selected,
  onToggle,
  onOpen,
  onDelete,
  onRename,
}: PropertyGroupProps) {
  const groupSelected = items.filter((item) => selected.includes(item.mix.id));

  const entries = useMemo<ComparisonEntry[]>(
    () => groupSelected.map((item) => ({ id: item.mix.id, label: item.mix.name, mix: item.mix })),
    [groupSelected]
  );

  const cheapestMonthly =
    items.length > 1
      ? [...items].sort((a, b) => a.summary.monthlyPayment - b.summary.monthlyPayment)[0].mix.id
      : null;
  const lowestInterest =
    items.length > 1
      ? [...items].sort((a, b) => a.summary.totalInterest - b.summary.totalInterest)[0].mix.id
      : null;

  const equity = propertyValue && propertyValue > 0 ? Math.max(0, propertyValue - totalAmount) : 0;
  const ltv = propertyValue && propertyValue > 0 ? (totalAmount / propertyValue) * 100 : 0;

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 p-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shrink-0">
          {address ? <MapPin className="h-4 w-4" /> : <Home className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-900 truncate">
            {address || `משכנתא בסך ${formatShekel(totalAmount)}`}
          </p>
          <p className="text-[11px] text-slate-500 flex flex-wrap gap-x-1.5 gap-y-0.5">
            משכנתא {formatShekel(totalAmount)}
            {propertyValue && propertyValue > 0 && ` · עלות נכס ${formatShekel(propertyValue)}`}
            {propertyValue && propertyValue > 0 && ` · הון עצמי ${formatShekel(equity)}`}
            {' · '}
            {items.length} תמהילים
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {dealType && (
            <Badge variant="secondary" className="text-[10px]">
              {DEAL_TYPES[dealType]} · עד {MAX_LTV_PERCENT[dealType]}%
            </Badge>
          )}
          {ltv > 0 && (
            <Badge
              className={`text-[10px] ${
                dealType && ltv > MAX_LTV_PERCENT[dealType] + 0.05
                  ? 'bg-red-100 text-red-800 hover:bg-red-100'
                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              מימון {ltv.toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-3 space-y-3">
        {items.length > 1 && (
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <GitCompareArrows className="h-3.5 w-3.5" />
            {groupSelected.length > 0
              ? `${groupSelected.length} תמהילים בהשוואה`
              : 'סמנו תמהילים להשוואה בין חלופות לאותה עסקה'}
          </span>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <MixSummaryCard
              key={item.mix.id}
              mix={item.mix}
              summary={item.summary}
              savedAt={item.savedAt}
              selected={selected.includes(item.mix.id)}
              onToggleSelect={items.length > 1 ? () => onToggle(item.mix.id) : undefined}
              onOpen={() => onOpen(item)}
              onDelete={onDelete ? () => onDelete(item.mix.id) : undefined}
              onRename={onRename ? (name) => onRename(item.mix.id, name) : undefined}
              highlight={
                item.mix.id === cheapestMonthly
                  ? `ההחזר החודשי הנמוך — ${formatShekel(item.summary.monthlyPayment)}`
                  : item.mix.id === lowestInterest
                    ? 'סך הריבית הנמוך'
                    : undefined
              }
            />
          ))}
        </div>

        {entries.length > 0 && <MixComparison entries={entries} />}
      </CardContent>
    </Card>
  );
}
