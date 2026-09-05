'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Flame, MousePointerClick, Table2, TrendingUp } from 'lucide-react';
import { computeMix, formatFullDate, inflationIsApplied, withFrozenInflation } from '../engine';
import type { MixResult } from '../engine';
import { isIndexLinked } from '../scenarioCalculations';
import { formatShekel } from './primitives';
import { ForecastDisclaimer } from './ForecastDisclaimer';

interface AmortizationDialogProps {
  result: MixResult;
  open: boolean;
  /** מסלול שהלוח נפתח עבורו; ללא ערך הלוח מציג את התמהיל כולו */
  initialTrackId?: string;
  onClose: () => void;
  onSelectMonth: (month: number) => void;
}

type Granularity = 'monthly' | 'yearly';

interface DisplayRow {
  key: string;
  month: number;
  label: string;
  annualRate: number;
  payment: number;
  interest: number;
  principal: number;
  /** ריבית שנצברה בגרייס מלא ונפרעת באותה שורה */
  deferredInterest: number;
  indexation: number;
  prepayment: number;
  balanceEnd: number;
  isRateStation: boolean;
}

export function AmortizationDialog({
  result,
  open,
  initialTrackId,
  onClose,
  onSelectMonth,
}: AmortizationDialogProps) {
  const [trackId, setTrackId] = useState<string>('all');
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [withInflation, setWithInflation] = useState(true);

  const hasIndexed = useMemo(
    () => result.mix.tracks.some((track) => isIndexLinked(track.type)),
    [result.mix.tracks]
  );
  const inflationAvailable = hasIndexed && inflationIsApplied(result.mix.assumptions);

  const frozenResult = useMemo(
    () => (open && inflationAvailable ? computeMix(withFrozenInflation(result.mix)) : result),
    [open, inflationAvailable, result]
  );

  const activeResult = withInflation && inflationAvailable ? result : frozenResult;

  // כל פתיחה מתחילה מהיקף שנבחר בכפתור שממנו נפתח הלוח, ועם תחזית האינפלציה
  useEffect(() => {
    if (open) {
      setTrackId(initialTrackId ?? 'all');
      setWithInflation(true);
    }
  }, [open, initialTrackId]);

  const source = useMemo(() => {
    if (trackId === 'all') {
      return activeResult.schedule.map((row) => ({
        month: row.month,
        date: row.date,
        annualRate: row.weightedRate,
        payment: row.payment,
        interest: row.interest,
        principal: row.principal,
        deferredInterest: row.deferredInterest,
        indexation: row.indexation,
        prepayment: row.prepayment,
        balanceEnd: row.balanceEnd,
        isRateStation: Boolean(row.isRateStation),
      }));
    }
    const track = activeResult.tracks.find((t) => t.track.id === trackId);
    return (track?.schedule ?? []).map((row) => ({
      month: row.month,
      date: row.date,
      annualRate: row.annualRate,
      payment: row.payment,
      interest: row.interest,
      principal: row.principal,
      deferredInterest: row.deferredInterest,
      indexation: row.indexation,
      prepayment: row.prepayment,
      balanceEnd: row.balanceEnd,
      isRateStation: Boolean(row.isRateStation),
    }));
  }, [activeResult, trackId]);

  const rows = useMemo<DisplayRow[]>(() => {
    if (granularity === 'monthly') {
      return source.map((row) => ({
        key: `m-${row.month}`,
        month: row.month,
        label: `${row.month} · ${formatFullDate(row.date)}`,
        annualRate: row.annualRate,
        payment: row.payment,
        interest: row.interest,
        principal: row.principal,
        deferredInterest: row.deferredInterest,
        indexation: row.indexation,
        prepayment: row.prepayment,
        balanceEnd: row.balanceEnd,
        isRateStation: row.isRateStation,
      }));
    }

    // תצוגה שנתית: סכימת התשלומים בשנה, והיתרה של החודש האחרון בשנה.
    const byYear = new Map<number, DisplayRow & { rateWeight: number }>();
    source.forEach((row) => {
      const year = Math.ceil(row.month / 12);
      const existing = byYear.get(year);
      const next = {
        key: `y-${year}`,
        month: row.month,
        label: `שנה ${year} · ${formatFullDate(row.date)}`,
        annualRate:
          ((existing?.annualRate ?? 0) * (existing?.rateWeight ?? 0) + row.annualRate) /
          ((existing?.rateWeight ?? 0) + 1),
        rateWeight: (existing?.rateWeight ?? 0) + 1,
        payment: (existing?.payment ?? 0) + row.payment,
        interest: (existing?.interest ?? 0) + row.interest,
        principal: (existing?.principal ?? 0) + row.principal,
        deferredInterest: (existing?.deferredInterest ?? 0) + row.deferredInterest,
        indexation: (existing?.indexation ?? 0) + row.indexation,
        prepayment: (existing?.prepayment ?? 0) + row.prepayment,
        balanceEnd: row.balanceEnd,
        isRateStation: Boolean(existing?.isRateStation || row.isRateStation),
      };
      byYear.set(year, next);
    });
    return [...byYear.values()];
  }, [source, granularity]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          payment: acc.payment + row.payment,
          interest: acc.interest + row.interest,
          principal: acc.principal + row.principal,
          deferredInterest: acc.deferredInterest + row.deferredInterest,
          indexation: acc.indexation + row.indexation,
          prepayment: acc.prepayment + row.prepayment,
        }),
        { payment: 0, interest: 0, principal: 0, deferredInterest: 0, indexation: 0, prepayment: 0 }
      ),
    [rows]
  );

  const inflationStats = useMemo(() => {
    if (!inflationAvailable) return null;
    if (trackId === 'all') {
      return {
        principalGrowth: result.summary.totalIndexation,
        inflationCost: Math.max(0, result.summary.totalPaid - frozenResult.summary.totalPaid),
      };
    }
    const inflated = result.tracks.find((t) => t.track.id === trackId);
    const frozen = frozenResult.tracks.find((t) => t.track.id === trackId);
    if (!inflated || !isIndexLinked(inflated.track.type)) return null;
    return {
      principalGrowth: inflated.totalIndexation,
      inflationCost: Math.max(0, inflated.totalPaid - (frozen?.totalPaid ?? inflated.totalPaid)),
    };
  }, [inflationAvailable, result, frozenResult, trackId]);

  // עמודת הריבית שנצברה נוספת רק כשיש גרייס מלא, כדי לא להעמיס על לוח רגיל
  const hasDeferred = totals.deferredInterest > 0.5;
  const hasStations = rows.some((row) => row.isRateStation);
  const showIndexation = Boolean(withInflation && inflationAvailable && inflationStats);
  const ratesVary =
    rows.length > 1 &&
    (hasStations ||
      Math.max(...rows.map((row) => row.annualRate)) - Math.min(...rows.map((row) => row.annualRate)) >
        0.02);

  const scopeName =
    trackId === 'all'
      ? result.mix.name
      : result.tracks.find((t) => t.track.id === trackId)?.track.name ?? result.mix.name;

  const exportCsv = () => {
    const header = [
      'תקופה',
      ...(ratesVary ? ['ריבית שנתית %'] : []),
      ...(hasStations ? ['תחנת יציאה'] : []),
      'החזר',
      'ריבית',
      'ריבית שנצברה',
      'קרן',
      ...(showIndexation ? ['הצמדה'] : []),
      'פרעון מוקדם',
      'יתרה',
    ];
    const body = rows.map((row) =>
      [
        row.label,
        ...(ratesVary ? [row.annualRate.toFixed(3)] : []),
        ...(hasStations ? [row.isRateStation ? 'תחנת יציאה — פטור מעמלת פירעון מוקדם' : ''] : []),
        Math.round(row.payment),
        Math.round(row.interest),
        Math.round(row.deferredInterest),
        Math.round(row.principal),
        ...(showIndexation ? [Math.round(row.indexation)] : []),
        Math.round(row.prepayment),
        Math.round(row.balanceEnd),
      ].join(',')
    );
    const csv = `\uFEFF${[header.join(','), ...body].join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `לוח-החזרים-${scopeName}${showIndexation ? '-עם-אינפלציה' : ''}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir="rtl" className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-blue-600" />
            לוח החזרים — {scopeName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <MousePointerClick className="h-3.5 w-3.5" />
            לחיצה על שורה מציגה את מצב המשכנתא באותו תאריך
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 pb-2">
          <Select value={trackId} onValueChange={setTrackId}>
            <SelectTrigger className="h-9 w-[220px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התמהיל</SelectItem>
              {result.tracks.map((t) => (
                <SelectItem key={t.track.id} value={t.track.id}>{t.track.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={granularity} onValueChange={(value) => setGranularity(value as Granularity)}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">תצוגה חודשית</SelectItem>
              <SelectItem value="yearly">תצוגה שנתית</SelectItem>
            </SelectContent>
          </Select>

          {inflationAvailable && (
            <div className="flex rounded-lg border border-violet-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setWithInflation(false)}
                className={`h-9 px-3 text-[11px] font-semibold ${
                  !withInflation ? 'bg-violet-600 text-white' : 'bg-white text-violet-800 hover:bg-violet-50'
                }`}
              >
                בלי שינוי מדד
              </button>
              <button
                type="button"
                onClick={() => setWithInflation(true)}
                className={`h-9 px-3 text-[11px] font-semibold ${
                  withInflation ? 'bg-violet-600 text-white' : 'bg-white text-violet-800 hover:bg-violet-50'
                }`}
              >
                עם תחזית אינפלציה
              </button>
            </div>
          )}

          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5 ml-1" />
            ייצוא CSV
          </Button>

          <span className="text-[11px] text-slate-500 mr-auto">{rows.length} שורות</span>
        </div>

        {inflationAvailable && withInflation && inflationStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-start gap-2 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2">
              <TrendingUp className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-violet-700">הקרן גדלה מהאינפלציה</p>
                <p className="text-sm font-bold text-violet-950">{formatShekel(inflationStats.principalGrowth)}</p>
                <p className="text-[10px] text-violet-800/80 leading-snug">
                  סך ההצמדה לקרן לפי תחזית בנק ישראל לאורך התקופה
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
              <Flame className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-orange-700">כסף שנשרף על אינפלציה</p>
                <p className="text-sm font-bold text-orange-950">{formatShekel(inflationStats.inflationCost)}</p>
                <p className="text-[10px] text-orange-800/80 leading-snug">
                  הפרש סך התשלום מול לוח שבו המדד לא זז — קרן נוספת וריבית עליה
                </p>
              </div>
            </div>
          </div>
        )}

        {inflationAvailable && !withInflation && (
          <p className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-snug">
            הלוח מוצג כאילו המדד לא זז. סך הריבית וסך התשלום בתמהיל עצמו מחושבים לפי תחזית האינפלציה
            של בנק ישראל — לחצו «עם תחזית אינפלציה» כדי לראות את הערכים הצפויים.
          </p>
        )}

        {hasStations && (
          <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 leading-snug">
            שורות ירוקות הן תחנות שינוי ריבית במסלול משתנה לא צמוד. בתחנות האלה יש פטור מעמלת פירעון
            מוקדם.
          </p>
        )}

        <ForecastDisclaimer mix={result.mix} />

        <div className="flex-1 overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="text-slate-500">
                <th className="text-right font-medium p-2">תקופה</th>
                {ratesVary && <th className="text-left font-medium p-2">ריבית</th>}
                <th className="text-left font-medium p-2">החזר</th>
                <th className="text-left font-medium p-2">ריבית</th>
                {hasDeferred && <th className="text-left font-medium p-2">ריבית שנצברה</th>}
                <th className="text-left font-medium p-2">קרן</th>
                {showIndexation && (
                  <th className="text-left font-medium p-2 hidden sm:table-cell">הצמדה</th>
                )}
                <th className="text-left font-medium p-2 hidden sm:table-cell">פרעון</th>
                <th className="text-left font-medium p-2">יתרה</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  onClick={() => onSelectMonth(row.month)}
                  className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 ${
                    row.isRateStation
                      ? 'bg-emerald-50/80'
                      : row.prepayment > 0
                        ? 'bg-emerald-50/60'
                        : ''
                  }`}
                >
                  <td className="p-2 text-slate-700">
                    <span className="whitespace-nowrap">{row.label}</span>
                    {row.isRateStation && (
                      <span className="mr-1.5 inline-block rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">
                        תחנת יציאה · פטור מעמלת פירעון מוקדם
                      </span>
                    )}
                  </td>
                  {ratesVary && (
                    <td className="p-2 text-left text-orange-700">{row.annualRate.toFixed(2)}%</td>
                  )}
                  <td className="p-2 text-left font-semibold text-slate-900">{formatShekel(row.payment)}</td>
                  <td className="p-2 text-left text-red-600">{formatShekel(row.interest)}</td>
                  {hasDeferred && (
                    <td className="p-2 text-left text-amber-700">
                      {row.deferredInterest > 0.5 ? formatShekel(row.deferredInterest) : '—'}
                    </td>
                  )}
                  <td className="p-2 text-left text-blue-600">{formatShekel(row.principal)}</td>
                  {showIndexation && (
                    <td className="p-2 text-left text-violet-600 hidden sm:table-cell">
                      {row.indexation > 0.5 ? formatShekel(row.indexation) : '—'}
                    </td>
                  )}
                  <td className="p-2 text-left text-emerald-600 hidden sm:table-cell">
                    {row.prepayment > 0.5 ? formatShekel(row.prepayment) : '—'}
                  </td>
                  <td className="p-2 text-left text-slate-700">{formatShekel(row.balanceEnd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-slate-100 font-semibold">
              <tr>
                <td className="p-2 text-slate-700">סה״כ</td>
                {ratesVary && <td className="p-2" />}
                <td className="p-2 text-left">{formatShekel(totals.payment)}</td>
                <td className="p-2 text-left text-red-700">{formatShekel(totals.interest)}</td>
                {hasDeferred && (
                  <td className="p-2 text-left text-amber-800">
                    {formatShekel(totals.deferredInterest)}
                  </td>
                )}
                <td className="p-2 text-left text-blue-700">{formatShekel(totals.principal)}</td>
                {showIndexation && (
                  <td className="p-2 text-left text-violet-700 hidden sm:table-cell">
                    {formatShekel(totals.indexation)}
                  </td>
                )}
                <td className="p-2 text-left text-emerald-700 hidden sm:table-cell">
                  {formatShekel(totals.prepayment)}
                </td>
                <td className="p-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
