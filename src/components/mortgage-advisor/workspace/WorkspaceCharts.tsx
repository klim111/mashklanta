'use client';

import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart as LineChartIcon, MousePointerClick } from 'lucide-react';
import { formatDuration, yearlySeries } from '../engine';
import type { MixResult, TrackResult } from '../engine';
import { TrackCompositionStrip } from '../analysisDashboard';
import { formatPercentage } from '../mortgageCalculations';
import { AMORTIZATION_TYPES, TRACK_TYPES } from '../types';
import { CHART_COLORS, compactCurrency, formatShekel, trackColor } from './primitives';
import {
  CURRENT_RATE_PAYMENT_NOTE,
  PrimeForwardChart,
  VariableForwardChart,
  previewPrimeForwardPoints,
  showsRateChangeNote,
  usesForwardPricedRate,
} from './PrimeForwardChart';
import { InflationForecastChart } from './InflationForecastChart';
import { isIndexLinked } from '../scenarioCalculations';

interface WorkspaceChartsProps {
  result: MixResult;
  baseResult: MixResult;
  scenarioActive: boolean;
  /** החודש שנבחר בלוח ההחזרים או בגרף — מסומן בקו אנכי */
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
  /** המסלול שמוצג כרגע. null — כל התמהיל */
  focusTrackId?: string | null;
  onFocusTrack?: (trackId: string | null) => void;
}

interface TrackRow {
  year: number;
  month: number;
  balance: number;
  payment: number;
  paidPrincipal: number;
  paidInterest: number;
  /** פיצול ההחזר של אותו חודש — הסכום שלהם הוא ההחזר עצמו */
  monthInterest: number;
  monthPrincipal: number;
}

/** סדרה שנתית למסלול בודד — יתרה, החזר, וקרן מול ריבית מצטברת */
function trackRows(track: TrackResult): TrackRow[] {
  const schedule = track.schedule;
  const first = schedule[0];
  const rows: TrackRow[] = [
    {
      year: 0,
      month: 0,
      balance: track.track.amount,
      payment: first?.payment ?? 0,
      paidPrincipal: 0,
      paidInterest: 0,
      monthPrincipal: Math.max(0, (first?.principal ?? 0) - (first?.prepayment ?? 0)),
      monthInterest: Math.max(0, (first?.payment ?? 0) - (first?.principal ?? 0)),
    },
  ];

  const years = Math.ceil(schedule.length / 12);
  for (let y = 1; y <= years; y++) {
    const index = Math.min(schedule.length, y * 12) - 1;
    const row = schedule[index];
    if (!row) continue;
    rows.push({
      year: y,
      month: row.month,
      balance: row.balanceEnd,
      payment: row.payment,
      paidPrincipal: Math.max(0, track.track.amount - row.balanceEnd),
      paidInterest: row.cumulativeInterest,
      // מה ששולם באותו חודש: הקרן מהלוח, והריבית היא היתרה עד גובה ההחזר.
      // בגרייס מלא זה נותן אפס בחודשי הצבירה, ובתשלום הסוגר את כל הריבית
      // שנצברה — באדום, לא כקרן.
      monthPrincipal: Math.max(0, row.principal - row.prepayment),
      monthInterest: Math.max(0, row.payment - row.principal),
    });
  }
  return rows;
}

interface Row {
  year: number;
  month: number;
  balance: number | null;
  baseBalance: number | null;
  payment: number | null;
  basePayment: number | null;
  paidPrincipal: number;
  paidInterest: number;
  /** פיצול ההחזר של אותו חודש — הסכום שלהם הוא ההחזר עצמו */
  monthInterest: number;
  monthPrincipal: number;
}

/** Recharts מחזיר את השורה שנלחצה בתוך activePayload; משם נשלף החודש. */
function monthFromClick(event: unknown): number | null {
  const payload = (event as { activePayload?: Array<{ payload?: { month?: number } }> } | null)?.activePayload;
  const month = payload?.[0]?.payload?.month;
  return typeof month === 'number' && month > 0 ? month : null;
}

export function WorkspaceCharts({
  result,
  baseResult,
  scenarioActive,
  selectedMonth,
  onSelectMonth,
  focusTrackId = null,
  onFocusTrack,
}: WorkspaceChartsProps) {
  /** המסלול שבמיקוד — כל הגרפים והביאורים שלו מוצגים כאן, ולא בתוך הפאנל */
  const focusTrack = focusTrackId
    ? result.tracks.find((item) => item.track.id === focusTrackId) ?? null
    : null;
  const rows = useMemo<Row[]>(() => {
    const current = yearlySeries(result);
    const base = yearlySeries(baseResult);
    const length = Math.max(current.length, base.length);

    // בנקודת הפתיחה עוד לא שולם דבר, ולכן הפיצול נלקח מהתשלום הראשון בפועל
    const first = result.schedule[0];

    return Array.from({ length }, (_, i) => {
      const c = current[i];
      const b = base[i];
      /*
        הפיצול הוא של מה ש**שולם** באותו חודש: הקרן מהלוח, והריבית היא היתרה
        עד לגובה ההחזר. כך הוא נכון בכל לוח סילוקין — בגרייס מלא חודש בלי החזר
        יוצא אפס בשתי השכבות (הריבית נצברת ואינה משולמת), ובתשלום הסוגר כל
        הריבית שנצברה נספרת כריבית ולא כקרן.
      */
      const paymentOf = i === 0
        ? Math.max(0, (first?.payment ?? 0) - (first?.prepayment ?? 0))
        : Math.max(0, c?.payment ?? 0);
      const principal =
        i === 0
          ? Math.max(0, (first?.principal ?? 0) - (first?.prepayment ?? 0))
          : Math.max(0, c?.principal ?? 0);
      const interest = Math.max(0, paymentOf - principal);
      return {
        year: c?.year ?? b?.year ?? i,
        month: c?.month ?? b?.month ?? i * 12,
        balance: c?.balance ?? null,
        baseBalance: b?.balance ?? null,
        payment: c?.payment ?? null,
        basePayment: b?.payment ?? null,
        paidPrincipal: c ? Math.max(0, result.mix.totalAmount - c.balance) : 0,
        paidInterest: c?.cumulativeInterest ?? 0,
        monthInterest: interest,
        monthPrincipal: principal,
      };
    });
  }, [result, baseResult]);

  const selectedYear = useMemo(() => {
    if (!selectedMonth) return null;
    const row = rows.find((r) => r.month >= selectedMonth);
    return row?.year ?? null;
  }, [rows, selectedMonth]);

  /**
   * גרף ציפיות השוק לפריים מוזן מעקום התשואות של בנק ישראל, ולא מלוח ההחזרים.
   * הלוח מחזיק את הפריים התקף עכשיו לכל אורכו — הזנה ממנו הייתה מציירת קו שטוח
   * תחת כותרת של תחזית.
   */
  const primeTrack = result.tracks.find((t) => t.track.type === 'prime' && t.schedule.length > 1);
  const primeExpectations = useMemo(() => {
    const forecast = result.mix.assumptions.primeForecast;
    if (!primeTrack || !forecast) return [];
    return previewPrimeForwardPoints(
      primeTrack.track.interestRate,
      primeTrack.track.years,
      forecast
    );
  }, [primeTrack, result.mix.assumptions.primeForecast]);
  const hasVariableUnlinked = result.tracks.some(
    (t) => t.track.type === 'variable_unlinked' && t.schedule.length > 1
  );
  const hasIndexed = result.tracks.some((t) => isIndexLinked(t.track.type) && t.schedule.length > 1);
  const hasForwardPriced = result.tracks.some((t) => usesForwardPricedRate(t.track.type));
  /** יש מסלול שההחזר בו נגזר מריבית שעשויה להתעדכן — פריים, מק"מ או מל"צ */
  const hasRateChangeNote = result.tracks.some((t) => showsRateChangeNote(t.track.type));

  const handleClick = (event: unknown) => {
    const month = monthFromClick(event);
    if (month) onSelectMonth(month);
  };

  const tooltipFormatter = (value: number | string) =>
    typeof value === 'number' ? formatShekel(value) : value;
  const labelFormatter = (label: number | string) => `שנה ${label}`;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-blue-600" />
            ניתוח גרפי
            {focusTrack && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-800">
                {TRACK_TYPES[focusTrack.track.type]}
              </span>
            )}
          </CardTitle>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <MousePointerClick className="h-3.5 w-3.5" />
            {focusTrack
              ? 'מוצגים הגרפים של המסלול שנבחר — לחיצה נוספת עליו חוזרת לכל התמהיל'
              : 'לחיצה על מסלול בפס מציגה את הגרפים שלו; לחיצה על נקודה בגרף מציגה את מצב המשכנתא באותו מועד'}
          </span>
        </div>

        {/* פס ההרכב — אותה תצוגה שבכלי המיחזור, ולחיצה מחליפה את אזור הגרפים */}
        <div className="pt-2">
          <TrackCompositionStrip
            tracks={result.mix.tracks}
            trackMonths={Object.fromEntries(result.tracks.map((t) => [t.track.id, t.months]))}
            activeTrackId={focusTrackId}
            onTrackClick={
              onFocusTrack
                ? (trackId) => onFocusTrack(focusTrackId === trackId ? null : trackId)
                : undefined
            }
            actionLabel="לגרפים של המסלול"
            activeActionLabel="חזרה לכל התמהיל"
          />
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 lg:grid-cols-3">
        {focusTrack && <TrackFocusCharts track={focusTrack} assumptions={result.mix.assumptions} />}

        {!focusTrack && (
          <>
        <ChartPanel
          title="יתרת החוב"
          hint="קצב סילוק הקרן. במסלולים צמודי מדד היתרה גדלה עם המדד וקצב הסילוק מואט."
        >
          <LineChart data={rows} margin={{ top: 5, right: 8, left: 8, bottom: 5 }} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedYear !== null && <ReferenceLine x={selectedYear} stroke="#0f172a" strokeDasharray="4 4" />}
            {scenarioActive && (
              <Line
                type="monotone"
                dataKey="baseBalance"
                name="בסיס"
                stroke={CHART_COLORS.base}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
              />
            )}
            <Line
              type="monotone"
              dataKey="balance"
              name={scenarioActive ? 'תרחיש נבחר' : 'יתרת חוב'}
              stroke={scenarioActive ? CHART_COLORS.scenario : CHART_COLORS.base}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ChartPanel>

        <ChartPanel
          title="החזר חודשי"
          hint={
            `${
              hasForwardPriced
                ? `${CURRENT_RATE_PAYMENT_NOTE} בתחנות השינוי של מסלול משתנה לא צמודה ההחזר החזוי מתעדכן לפי עקום הפורוורד.`
                : hasRateChangeNote
                  ? CURRENT_RATE_PAYMENT_NOTE
                  : 'ההחזר לאורך התקופה.'
            } מתחת לקו — פיצול כל החזר לקרן (ירוק) ולריבית (אדום), משוקלל לפי לוחות הסילוקין של המסלולים.`
          }
        >
          {/*
            שתי השכבות מתחת לקו ההחזר הן פיצול אותו החזר: ירוק הוא החלק שהולך
            לקרן ואדום הוא החלק שהולך לריבית, ולכן סכומן הוא בדיוק ההחזר. בשפיצר
            הירוק גדל על חשבון האדום לאורך התקופה, בקרן שווה הירוק קבוע, ובגרייס
            כמעט הכול אדום — כך צורת הגרף מספרת את לוח הסילוקין עצמו.
          */}
          <ComposedChart data={rows} margin={{ top: 5, right: 8, left: 8, bottom: 5 }} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedYear !== null && <ReferenceLine x={selectedYear} stroke="#0f172a" strokeDasharray="4 4" />}
            <Area
              type="monotone"
              dataKey="monthPrincipal"
              name="מזה קרן"
              stackId="split"
              stroke={CHART_COLORS.better}
              fill={CHART_COLORS.better}
              fillOpacity={0.3}
              strokeWidth={1}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="monthInterest"
              name="מזה ריבית"
              stackId="split"
              stroke={CHART_COLORS.interest}
              fill={CHART_COLORS.interest}
              fillOpacity={0.3}
              strokeWidth={1}
              dot={false}
            />
            {scenarioActive && (
              <Line
                type="monotone"
                dataKey="basePayment"
                name="בסיס"
                stroke={CHART_COLORS.base}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
              />
            )}
            <Line
              type="monotone"
              dataKey="payment"
              name={scenarioActive ? 'תרחיש נבחר' : 'החזר חודשי'}
              stroke={scenarioActive ? CHART_COLORS.scenario : CHART_COLORS.base}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </ComposedChart>
        </ChartPanel>

        <ChartPanel
          title="קרן מול ריבית מצטברת"
          hint="כמה מהקרן נפרעה וכמה ריבית שולמה בכל נקודת זמן."
        >
          <AreaChart data={rows} margin={{ top: 5, right: 8, left: 8, bottom: 5 }} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedYear !== null && <ReferenceLine x={selectedYear} stroke="#0f172a" strokeDasharray="4 4" />}
            <Area
              type="monotone"
              dataKey="paidPrincipal"
              name="קרן שנפרעה"
              stackId="1"
              stroke={CHART_COLORS.principal}
              fill={CHART_COLORS.principal}
              fillOpacity={0.35}
            />
            <Area
              type="monotone"
              dataKey="paidInterest"
              name="ריבית ששולמה"
              stackId="1"
              stroke={CHART_COLORS.interest}
              fill={CHART_COLORS.interest}
              fillOpacity={0.35}
            />
          </AreaChart>
        </ChartPanel>

        {primeExpectations.length >= 2 && (
          <div className="lg:col-span-3">
            <PrimeForwardChart
              previewPoints={primeExpectations}
              quotedRate={primeTrack?.track.interestRate}
              height={230}
            />
          </div>
        )}
        {hasVariableUnlinked && (
          <div className="lg:col-span-3">
            <VariableForwardChart
              tracks={result.tracks}
              quotedRate={
                result.tracks.filter((t) => t.track.type === 'variable_unlinked').length === 1
                  ? result.tracks.find((t) => t.track.type === 'variable_unlinked')?.track.interestRate
                  : undefined
              }
              height={230}
            />
          </div>
        )}
        {hasIndexed && (
          <div className="lg:col-span-3">
            <InflationForecastChart
              assumptions={result.mix.assumptions}
              years={Math.max(
                ...result.tracks.filter((t) => isIndexLinked(t.track.type)).map((t) => t.track.years),
                1
              )}
              height={230}
            />
          </div>
        )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * הגרפים והביאורים של מסלול בודד. הכול חי כאן, באזור הגרפים, ולא בתוך כרטיס
 * המסלול — כך שהפאנל נשאר קצר והניתוח נשאר במקום אחד.
 */
function TrackFocusCharts({
  track,
  assumptions,
}: {
  track: TrackResult;
  assumptions: MixResult['mix']['assumptions'];
}) {
  const rows = trackRows(track);
  const data = track.track;
  /** ציפיות השוק לפריים — מעקום התשואות, לא מהלוח שמחזיק ריבית קבועה */
  const primeExpectations = useMemo(() => {
    const forecast = assumptions.primeForecast;
    if (data.type !== 'prime' || !forecast) return [];
    return previewPrimeForwardPoints(data.interestRate, data.years, forecast);
  }, [data.type, data.interestRate, data.years, assumptions.primeForecast]);
  const isGrace =
    data.amortizationType === 'partial_grace' || data.amortizationType === 'full_grace';
  const prepayRow = track.schedule.find((row) => row.prepayment > 1);
  const contractualMonths = Math.max(1, Math.round(data.years * 12));
  const shortened = Boolean(prepayRow) && track.months < contractualMonths - 0.5;

  const tooltipFormatter = (value: number | string) =>
    typeof value === 'number' ? formatShekel(value) : value;
  const labelFormatter = (label: number | string) => `שנה ${label}`;

  return (
    <>
      <div className="lg:col-span-3">
        <div className="grid gap-2 rounded-xl border border-violet-200 bg-violet-50/50 p-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <TrackStat label="החזר חודשי" value={track.monthlyPayment > 0.01 ? formatShekel(track.monthlyPayment) : 'אין החזר שוטף'} />
          <TrackStat label="סך ריבית" value={formatShekel(track.totalInterest)} />
          <TrackStat label="סך תשלום" value={formatShekel(track.totalPaid)} />
          <TrackStat
            label="משך בפועל"
            value={`${formatDuration(track.months)}${shortened ? ` (קוצר מ-${formatDuration(contractualMonths)})` : ''}`}
          />
        </div>
      </div>

      <ChartPanel title="יתרת החוב במסלול" hint="קצב סילוק הקרן במסלול שנבחר.">
        <LineChart data={rows} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="balance"
            name="יתרת החוב"
            stroke={trackColor(data.type)}
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ChartPanel>

      <ChartPanel
        title="החזר חודשי במסלול"
        hint="ההחזר של המסלול לאורך התקופה, ומתחתיו פיצול כל החזר לקרן (ירוק) ולריבית (אדום) לפי לוח הסילוקין."
      >
        <ComposedChart data={rows} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="monthPrincipal"
            name="מזה קרן"
            stackId="split"
            stroke={CHART_COLORS.better}
            fill={CHART_COLORS.better}
            fillOpacity={0.3}
            strokeWidth={1}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="monthInterest"
            name="מזה ריבית"
            stackId="split"
            stroke={CHART_COLORS.interest}
            fill={CHART_COLORS.interest}
            fillOpacity={0.3}
            strokeWidth={1}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="payment"
            name="החזר חודשי"
            stroke={trackColor(data.type)}
            strokeWidth={2.5}
            dot={false}
          />
        </ComposedChart>
      </ChartPanel>

      <ChartPanel title="קרן מול ריבית במסלול" hint="כמה מהקרן נפרעה וכמה ריבית שולמה בכל נקודת זמן.">
        <AreaChart data={rows} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="paidPrincipal"
            name="קרן שנפרעה"
            stackId="1"
            stroke={CHART_COLORS.principal}
            fill={CHART_COLORS.principal}
            fillOpacity={0.35}
          />
          <Area
            type="monotone"
            dataKey="paidInterest"
            name="ריבית ששולמה"
            stackId="1"
            stroke={CHART_COLORS.interest}
            fill={CHART_COLORS.interest}
            fillOpacity={0.35}
          />
        </AreaChart>
      </ChartPanel>

      {data.type === 'prime' && primeExpectations.length >= 2 && (
        <div className="lg:col-span-3">
          <PrimeForwardChart
            previewPoints={primeExpectations}
            quotedRate={data.interestRate}
            height={220}
          />
        </div>
      )}
      {data.type === 'variable_unlinked' && track.schedule.length > 1 && (
        <div className="lg:col-span-3">
          <VariableForwardChart tracks={[track]} quotedRate={data.interestRate} height={220} />
        </div>
      )}
      {isIndexLinked(data.type) && track.schedule.length > 1 && (
        <div className="lg:col-span-3">
          <InflationForecastChart assumptions={assumptions} years={data.years} height={220} />
        </div>
      )}

      {/* הביאורים של המסלול — אותם הסברים שהיו בתוך המסלול, כאן לצד הגרפים */}
      <div className="space-y-2 lg:col-span-3">
        {showsRateChangeNote(data.type) && track.monthlyPayment > 0.01 && (
          <p className="text-[11px] leading-snug text-slate-500">{CURRENT_RATE_PAYMENT_NOTE}</p>
        )}

        {isGrace && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
            {data.amortizationType === 'full_grace' ? (
              <>
                בגרייס מלא אין החזר חודשי. הריבית נצברת וצוברת ריבית בעצמה, ובסוף התקופה נפרעים
                בתשלום אחד הקרן ({formatShekel(data.amount)}) וכל הריבית שנצברה (
                {formatShekel(track.totalInterest)}) — סך {formatShekel(track.balloonPayment)}.
              </>
            ) : (
              <>
                בגרייס חלקי משולמת מדי חודש הריבית בלבד ({formatShekel(track.monthlyPayment)}), הקרן
                אינה קטנה לאורך התקופה, ובסופה היא נפרעת בתשלום אחד של{' '}
                {formatShekel(track.balloonPayment)}.
              </>
            )}
          </p>
        )}

        {track.totalIndexation > 1 && (
          <p className="rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-[11px] leading-relaxed text-violet-800">
            לפי תחזית האינפלציה של בנק ישראל הקרן גדלה ב-{formatShekel(track.totalIndexation)} לאורך
            התקופה. הקרן מוגנת מירידת מדד ולא תקטן מתחת לסכום המקורי.
          </p>
        )}

        {data.type === 'variable_unlinked' && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] leading-relaxed text-emerald-900">
            הריבית מתעדכנת כל {data.variablePeriod ?? 5} שנים לפי הפורוורד לאותה תקופה מעקום
            התשואות השקלי של בנק ישראל, עם המרווח שצוטט מהבנק. בתחנות היציאה יש פטור מעמלת פירעון
            מוקדם.
          </p>
        )}

        {data.type === 'prime' && track.schedule.length > 12 && (
          <p className="rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-[11px] leading-relaxed text-orange-900">
            ההחזרים וסך הריבית מחושבים לפי צפי הפריים שנגזר מעקום התשואות השקלי של בנק ישראל. חודש
            ראשון: {formatPercentage(track.schedule[0].annualRate)}, בסוף התקופה:{' '}
            {formatPercentage(track.schedule[track.schedule.length - 1].annualRate)}.
          </p>
        )}

        <p className="text-[10px] text-slate-400">
          לוח סילוקין: {AMORTIZATION_TYPES[data.amortizationType || 'spitzer']}
        </p>
      </div>
    </>
  );
}

function TrackStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-xs font-bold text-slate-800">{value}</p>
    </div>
  );
}

function ChartPanel({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactElement;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-500 mb-2 leading-snug">{hint}</p>
      <ResponsiveContainer width="100%" height={230}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
