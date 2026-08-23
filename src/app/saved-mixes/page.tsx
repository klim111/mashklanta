'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  BookmarkCheck,
  CloudOff,
  GitCompareArrows,
  Home,
  MapPin,
  PieChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MixSummaryCard } from '@/components/mortgage-advisor/MixSummaryCard';
import { MixComparison } from '@/components/mortgage-advisor/MixComparison';
import type { ComparisonEntry } from '@/components/mortgage-advisor/MixComparison';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { DEAL_TYPES, MAX_LTV_PERCENT } from '@/components/mortgage-advisor/types';
import { groupByProperty } from '@/components/mortgage-advisor/propertyContext';
import { stageMixForWorkspace } from '@/components/mortgage-advisor/workspace/draft';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';

export default function SavedMixesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { saved, ready, remove, rename } = useSavedMixes();
  const [selected, setSelected] = useState<string[]>([]);

  /**
   * התמהילים מסודרים לפי נכס: כל תמהילי אותה כתובת יושבים יחד, ותמהילים ללא
   * כתובת מקובצים לפי סכום המשכנתא. ההשוואה נעשית בתוך הקבוצה בלבד.
   */
  const groups = useMemo(() => groupByProperty(saved, (item) => item.mix), [saved]);

  const personalAreaHref = session?.user?.role === 'ADVISOR' ? '/advisor-dashboard' : '/dashboard';

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const openInTool = (item: SavedMix) => {
    stageMixForWorkspace(item.mix);
    router.push('/mortgage-advisor');
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="container mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BookmarkCheck className="h-6 w-6 text-blue-600" />
              תמהילים שמורים
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              התמהילים מסודרים לפי נכס — כל התמהילים לאותה כתובת יושבים יחד, ותמהילים ללא כתובת
              מקובצים לפי סכום המשכנתא. סימון תמהילים בתוך אותה קבוצה מציג השוואה גרפית ביניהם.
            </p>
          </div>
          <div className="flex gap-2">
            {session && (
              <Button variant="outline" size="sm" asChild>
                <Link href={personalAreaHref}>
                  <ArrowRight className="h-4 w-4 ml-1" />
                  לאזור האישי
                </Link>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href="/mortgage-advisor">
                <PieChart className="h-4 w-4 ml-1" />
                לכלי התכנון
              </Link>
            </Button>
          </div>
        </div>

        {!session && ready && saved.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <CloudOff className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              התמהילים שמורים בדפדפן הזה בלבד.{' '}
              <Link href="/auth/login" className="underline font-semibold">
                התחברו לחשבון
              </Link>{' '}
              כדי שהם יסתנכרנו ויהיו זמינים מכל מכשיר.
            </p>
          </div>
        )}

        {ready && saved.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-14 text-center">
              <PieChart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-slate-700">עוד לא שמרתם תמהילים</h2>
              <p className="text-sm text-slate-500 mt-1 mb-5">
                בנו תמהיל בכלי התכנון ולחצו על "שמור תמהיל" — הוא יופיע כאן.
              </p>
              <Button asChild>
                <Link href="/mortgage-advisor">פתח את כלי התכנון</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <PropertyGroup
              key={group.key}
              address={group.address}
              propertyValue={group.propertyValue}
              dealType={group.dealType}
              totalAmount={group.totalAmount}
              items={group.items}
              selected={selected}
              onToggle={toggle}
              onOpen={openInTool}
              onDelete={remove}
              onRename={rename}
            />
          ))
        )}
      </div>
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
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
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
          <p className="text-[11px] text-slate-500">
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
              onDelete={() => onDelete(item.mix.id)}
              onRename={(name) => onRename(item.mix.id, name)}
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
