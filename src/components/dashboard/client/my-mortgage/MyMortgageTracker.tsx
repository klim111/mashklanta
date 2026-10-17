'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Banknote,
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  History,
  Landmark,
  Loader2,
  Pause,
  PiggyBank,
  Play,
  Table2,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import { usePlan } from '@/components/plan/usePlan';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import { pickPricedMix } from '@/components/plan/stages/signing/FinalTermsPanel';
import { computeMix, formatDuration, formatFullDate, formatMonthLabel, snapshotAt } from '@/components/mortgage-advisor/engine';
import type { MixResult, PrepaymentEvent, WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { WorkspaceCharts } from '@/components/mortgage-advisor/workspace/WorkspaceCharts';
import { PrepaymentDialog } from '@/components/mortgage-advisor/workspace/PrepaymentDialog';
import { AmortizationDialog } from '@/components/mortgage-advisor/workspace/AmortizationDialog';
import { ForecastDisclaimer } from '@/components/mortgage-advisor/workspace/ForecastDisclaimer';
import { formatTrackTypeWithAmortization } from '@/components/mortgage-advisor/types';
import { trackColor } from '@/components/mortgage-advisor/workspace/primitives';
import { EmptyHint, Metric, formatPercent, formatShekel } from '@/components/plan/ui';
import {
  monthOfPayment,
  paymentNumberOf,
  paymentsMadeBy,
  trackerStart,
} from '@/lib/loan-tracker';
import type { LoanTrackerState, TrackerPrepayment } from '@/lib/loan-tracker';

/** מהירות ההפעלה של גלילת הזמן — חודש בכל צעד */
const PLAY_STEP_MS = 70;

/**
 * "המשכנתא שלי" — לוח המעקב אחרי המשכנתא שנחתמה.
 *
 * הלוח נבנה מהתמהיל הסופי שנחתם בבנק ומתאריך התשלום הראשון (חודש אחרי החתימה,
 * או מה שהלקוח הזין). למעלה — הסכום ההתחלתי, כמה חודשים עברו, התשלום האחרון
 * והקרוב. גלילת הזמן מזיזה את נקודת המבט קדימה ואחורה, וכל המספרים והגרפים
 * זזים איתה. פירעון מוקדם נשמר כאן ומשנה את לוח התשלומים ואת הגרפים.
 */
export function MyMortgageTracker({ planId }: { planId: string }) {
  const { plan, ready, error, updateStage } = usePlan(planId);
  const { saved, ready: mixesReady } = useSavedMixes({ planId });

  const signing = plan?.data.SIGNING ?? null;
  const tracker = signing?.tracker ?? null;
  /** הגרסה האחרונה של המעקב — כמה פירעונות שנשמרים ברצף מאותו חלון לא דורסים זה את זה */
  const trackerRef = useRef<LoanTrackerState | null>(tracker);
  trackerRef.current = tracker;

  const saveTracker = (next: LoanTrackerState) => {
    if (!plan) return;
    trackerRef.current = next;
    updateStage('SIGNING', { ...plan.data.SIGNING, tracker: next });
  };

  const picked = useMemo(() => {
    if (!plan) return null;
    const ofPlan = saved.filter((item) => item.planId === planId);
    const candidates = ofPlan.length > 0 ? ofPlan : saved;
    const bank = plan.data.AUCTION.signedMix?.bank ?? plan.data.SIGNING.bank ?? null;
    return pickPricedMix(candidates, plan.data, bank);
  }, [plan, saved, planId]);

  const start = tracker && signing ? trackerStart(tracker, signing.signingDate) : null;

  if (!ready || !mixesReady) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        טוענים את המשכנתא…
      </div>
    );
  }

  if (error || !plan || !signing || !tracker) {
    return <EmptyHint>{error ?? 'לא מצאנו את המשכנתא הזו.'}</EmptyHint>;
  }

  if (!picked) {
    return (
      <EmptyHint>
        לא מצאנו את התמהיל הסופי של המשכנתא, ולכן אין ממה לבנות את לוח התשלומים.{' '}
        <Link href={`/dashboard/plans/${planId}`} className="font-black text-blue-600 hover:underline">
          לתהליך המשכנתא
        </Link>
      </EmptyHint>
    );
  }

  if (!start) {
    return <FirstPaymentQuestion onSave={(date) => saveTracker({ ...tracker, firstPaymentDate: date })} />;
  }

  return (
    <TrackerBoard
      key={start.date}
      planId={planId}
      title={plan.propertyAddress || plan.name}
      bank={signing.bank ?? picked.mix.quote?.bank ?? null}
      signingDate={signing.signingDate}
      start={start}
      finalMix={picked.mix}
      tracker={tracker}
      onChange={(next) => saveTracker(next)}
      latest={() => trackerRef.current ?? tracker}
    />
  );
}

/** אין תאריך חתימה ואין תאריך תשלום ראשון — שואלים פעם אחת */
function FirstPaymentQuestion({ onSave }: { onSave: (date: string) => void }) {
  const [date, setDate] = useState('');
  return (
    <section className="mx-auto max-w-lg rounded-3xl border-2 border-blue-100 bg-white p-6 text-center shadow-sm">
      <CalendarClock className="mx-auto h-10 w-10 text-blue-600" />
      <h2 className="mt-3 text-subtitle font-black text-slate-900">מתי ירד התשלום הראשון של המשכנתא?</h2>
      <p className="mt-2 text-info leading-relaxed text-slate-600">
        מהתאריך הזה נבנים לוח התשלומים, מספר החודשים שעברו והתשלום הקרוב. שואלים רק פעם אחת, ואפשר לשנות אחר כך.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="h-12 rounded-2xl border border-slate-300 px-4 text-base font-bold text-slate-900"
          aria-label="תאריך התשלום הראשון"
        />
        <button
          type="button"
          disabled={!date}
          onClick={() => onSave(date)}
          className="h-12 rounded-2xl bg-blue-600 px-6 text-button font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
        >
          לבניית לוח המעקב
        </button>
      </div>
    </section>
  );
}

function TrackerBoard({
  planId,
  title,
  bank,
  signingDate,
  start,
  finalMix,
  tracker,
  onChange,
  latest,
}: {
  planId: string;
  title: string;
  bank: string | null;
  signingDate: string | null;
  start: { date: string; source: 'client' | 'signing' };
  finalMix: WorkspaceMix;
  tracker: LoanTrackerState;
  onChange: (next: LoanTrackerState) => void;
  latest: () => LoanTrackerState;
}) {
  const firstPayment = start.date;

  /** התמהיל כפי שנחתם, מתאריך התשלום הראשון — בלי אירועי תכנון מבונה התמהילים */
  const baseMix = useMemo<WorkspaceMix>(
    () => ({ ...finalMix, startDate: `${firstPayment}T12:00:00`, events: [] }),
    [finalMix, firstPayment]
  );
  const baseResult = useMemo(() => computeMix(baseMix), [baseMix]);

  const events = useMemo<PrepaymentEvent[]>(
    () =>
      tracker.prepayments
        .map((item) => ({
          id: item.id,
          kind: 'prepayment' as const,
          month: paymentNumberOf(item.month, firstPayment),
          amount: item.amount,
          mode: item.mode,
          trackId: item.trackId,
        }))
        .filter((event) => event.month >= 1 && event.month <= baseResult.schedule.length),
    [tracker.prepayments, firstPayment, baseResult.schedule.length]
  );
  const mix = useMemo<WorkspaceMix>(() => ({ ...baseMix, events }), [baseMix, events]);
  const result = useMemo(() => (events.length > 0 ? computeMix(mix) : baseResult), [events.length, mix, baseResult]);

  const total = result.schedule.length;
  const made = Math.min(paymentsMadeBy(result.schedule), total);
  const lastRow = made > 0 ? result.schedule[made - 1] : null;
  const nextRow = made < total ? result.schedule[made] : null;
  const principal = result.mix.tracks.reduce((sum, track) => sum + track.amount, 0);
  const balanceToday = lastRow ? lastRow.balanceEnd : principal;

  /** נקודת המבט של גלילת הזמן — מתחילה בתשלום האחרון שירד (או הראשון) */
  const [month, setMonth] = useState(Math.max(1, made));
  const [playing, setPlaying] = useState(false);
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const [prepayOpen, setPrepayOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [editStart, setEditStart] = useState(false);

  const clamped = Math.min(Math.max(1, month), Math.max(1, total));
  useEffect(() => {
    if (month !== clamped) setMonth(clamped);
  }, [month, clamped]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setMonth((current) => {
        if (current >= total) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, PLAY_STEP_MS);
    return () => clearInterval(timer);
  }, [playing, total]);

  const snapshot = useMemo(() => snapshotAt(result, clamped), [result, clamped]);
  const viewRow = result.schedule[clamped - 1] ?? null;

  const interestSaved = baseResult.summary.totalInterest - result.summary.totalInterest;
  const monthsSaved = baseResult.summary.months - result.summary.months;

  const addPrepayment = (event: Omit<PrepaymentEvent, 'id' | 'kind'>) => {
    const current = latest();
    const item: TrackerPrepayment = {
      id: `prepay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      month: monthOfPayment(event.month, firstPayment),
      amount: Math.round(event.amount),
      mode: event.mode,
      ...(event.trackId ? { trackId: event.trackId } : {}),
    };
    onChange({ ...current, prepayments: [...current.prepayments, item] });
  };

  const removePrepayment = (id: string) => {
    const current = latest();
    onChange({ ...current, prepayments: current.prepayments.filter((item) => item.id !== id) });
  };

  const trackName = (trackId?: string) => {
    if (!trackId) return 'פיזור בין כל המסלולים';
    const track = result.mix.tracks.find((item) => item.id === trackId);
    return track ? track.name || formatTrackTypeWithAmortization(track) : 'מסלול';
  };

  return (
    <div className="space-y-5" data-demo-id="my-mortgage">
      {/* כותרת: הנכס, הבנק ותאריך ההתחלה */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-l from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-lg md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold text-white/60">
              <Landmark className="h-3.5 w-3.5" />
              {bank ? `בנק ${bank}` : 'המשכנתא שנחתמה'}
              {signingDate ? ` · נחתמה ב-${formatFullDate(`${signingDate.slice(0, 10)}T12:00:00`)}` : ''}
            </p>
            <h2 className="mt-1 truncate text-title font-black text-white">{title}</h2>
            <p className="mt-1 text-sm text-white/70">
              תשלום ראשון ב-{formatFullDate(`${firstPayment}T12:00:00`)}
              {start.source === 'signing' ? ' (חודש אחרי החתימה)' : ''} · {formatDuration(total)}
              {!editStart && (
                <button
                  type="button"
                  onClick={() => setEditStart(true)}
                  className="mr-2 font-bold text-sky-300 hover:underline"
                >
                  שינוי
                </button>
              )}
            </p>
            {editStart && (
              <StartDateEditor
                value={firstPayment}
                onCancel={() => setEditStart(false)}
                onSave={(date) => {
                  setEditStart(false);
                  onChange({ ...latest(), firstPaymentDate: date });
                }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPrepayOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-button font-black text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              <PiggyBank className="h-5 w-5" />
              פירעון מוקדם
            </button>
            <button
              type="button"
              onClick={() => setTableOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-button font-black text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
            >
              <Table2 className="h-5 w-5" />
              לוח התשלומים המלא
            </button>
          </div>
        </div>
      </section>

      {/* המצב היום */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="הסכום ההתחלתי" value={formatShekel(principal)} note={`${result.mix.tracks.length} מסלולים · ריבית ממוצעת ${formatPercent(result.summary.averageRate, 2)}`} />
        <Metric
          label="כמה זמן עבר"
          value={`${made} חודשים`}
          note={made > 0 ? `${made} מתוך ${total} תשלומים · ${formatDuration(made)}` : 'עוד לא ירד תשלום'}
        />
        <Metric
          label="תשלום אחרון"
          value={lastRow ? formatShekel(lastRow.payment) : '—'}
          note={lastRow ? `ירד ב-${formatFullDate(lastRow.date)}` : 'עוד לא ירד תשלום'}
        />
        <Metric
          label="תשלום קרוב"
          tone="good"
          value={nextRow ? formatShekel(nextRow.payment) : '—'}
          note={nextRow ? `ב-${formatFullDate(nextRow.date)}${nextRow.prepayment > 0 ? ' · כולל פירעון מוקדם' : ''}` : 'המשכנתא נפרעה'}
        />
        <Metric
          label="יתרת החוב היום"
          value={formatShekel(balanceToday)}
          note={`נפרעו ${formatPercent(principal > 0 ? ((principal - balanceToday) / principal) * 100 : 0, 1)} מהקרן`}
        />
      </div>

      {/* גלילת הזמן */}
      <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-subtitle font-black text-slate-900">
              <History className="h-5 w-5 text-blue-600" />
              גלילת הזמן
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              גררו כדי לראות איך המשכנתא נראית בכל חודש לאורך התקופה. כל המספרים, הלוח והגרפים זזים איתכם.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TimeButton onClick={() => setMonth((m) => m - 12)} label="שנה אחורה">
              <ChevronRight className="h-4 w-4" />
              שנה
            </TimeButton>
            <TimeButton
              onClick={() => {
                setPlaying(false);
                setMonth(Math.max(1, made));
              }}
              label="היום"
              active={clamped === Math.max(1, made)}
            >
              <CalendarCheck className="h-4 w-4" />
              היום
            </TimeButton>
            <TimeButton onClick={() => setMonth((m) => m + 12)} label="שנה קדימה">
              שנה
              <ChevronLeft className="h-4 w-4" />
            </TimeButton>
            <TimeButton
              onClick={() => {
                if (!playing && clamped >= total) setMonth(1);
                setPlaying((value) => !value);
              }}
              label={playing ? 'עצירה' : 'הפעלה'}
              active={playing}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? 'עצירה' : 'הפעלה'}
            </TimeButton>
          </div>
        </header>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-lg font-black text-slate-900">
              תשלום {clamped} מתוך {total}
              {viewRow && <span className="mr-2 text-base font-bold text-slate-500">· {formatMonthLabel(viewRow.date)}</span>}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                clamped <= made ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {clamped < made ? 'כבר שולם' : clamped === made ? 'התשלום האחרון שירד' : clamped === made + 1 ? 'התשלום הקרוב' : 'בעתיד'}
            </span>
          </div>
          <TimelineSlider
            value={clamped}
            max={Math.max(1, total)}
            today={made}
            prepaymentMonths={events.map((event) => event.month)}
            onChange={(value) => {
              setPlaying(false);
              setMonth(value);
            }}
          />
        </div>

        {snapshot && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="יתרת החוב" value={formatShekel(snapshot.remainingBalance)} />
              <Metric label="ההחזר באותו חודש" value={formatShekel(snapshot.paymentThisMonth)} note={`${formatShekel(snapshot.principalThisMonth)} קרן · ${formatShekel(snapshot.interestThisMonth)} ריבית`} />
              <Metric label="שולם עד אז" value={formatShekel(snapshot.totalPaidToDate)} note={`${formatShekel(snapshot.principalPaidToDate)} קרן`} />
              <Metric label="ריבית ששולמה עד אז" value={formatShekel(snapshot.interestPaidToDate)} tone="warn" />
              <Metric label="נותר עד הסוף" value={formatDuration(snapshot.monthsRemaining)} note={`עוד ${formatShekel(snapshot.totalRemaining)} לתשלום`} />
            </div>

            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
                <span>הקרן שנפרעה</span>
                <span>{formatPercent(snapshot.principalProgress, 1)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-500 transition-[width] duration-150"
                  style={{ width: `${snapshot.principalProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.tracks.map((item) => {
                const track = result.mix.tracks.find((entry) => entry.id === item.trackId);
                const paid = track && track.amount > 0 ? Math.min(100, Math.max(0, ((track.amount - item.remainingBalance) / track.amount) * 100)) : 0;
                return (
                  <button
                    key={item.trackId}
                    type="button"
                    onClick={() => setFocusTrackId((current) => (current === item.trackId ? null : item.trackId))}
                    className={`rounded-2xl border p-3 text-right transition-colors ${
                      focusTrackId === item.trackId ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: trackColor(item.type) }} />
                      <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
                        {track ? track.name || formatTrackTypeWithAmortization(track) : item.name}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{formatPercent(item.annualRate, 2)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${paid}%`, background: trackColor(item.type) }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-slate-600">
                      <span>
                        {item.closed ? 'המסלול נסגר' : `יתרה ${formatShekel(item.remainingBalance)}`}
                      </span>
                      <span>{item.closed ? '' : `החזר ${formatShekel(item.paymentThisMonth)}`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* הגרפים — אותם גרפים של בונה התמהילים, עם קו בנקודת הזמן שנבחרה */}
      <WorkspaceCharts
        result={result}
        baseResult={baseResult}
        scenarioActive={events.length > 0}
        selectedMonth={clamped}
        onSelectMonth={(value) => {
          setPlaying(false);
          setMonth(value);
        }}
        focusTrackId={focusTrackId}
        onFocusTrack={setFocusTrackId}
        baseLabel="בלי פירעון מוקדם"
        scenarioLabel="עם הפירעון המוקדם"
      />

      {/* לוח התשלומים סביב נקודת הזמן */}
      <ScheduleWindow result={result} month={clamped} made={made} onSelect={setMonth} onOpenFull={() => setTableOpen(true)} />

      {/* פירעונות מוקדמים */}
      <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-subtitle font-black text-slate-900">
              <Banknote className="h-5 w-5 text-emerald-600" />
              פירעון מוקדם
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              פירעון חלקי או מלא, בחודש שתבחרו: קיצור התקופה או הקטנת ההחזר. הפירעון נשמר כאן ומשנה את הלוח והגרפים.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPrepayOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-button font-black text-white transition-colors hover:bg-emerald-700"
          >
            <PiggyBank className="h-4 w-4" />
            הוספת פירעון מוקדם
          </button>
        </header>

        {tracker.prepayments.length === 0 ? (
          <EmptyHint>עוד לא הוספתם פירעון מוקדם.</EmptyHint>
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <Metric label="ריבית שנחסכת" value={formatShekel(Math.max(0, interestSaved))} tone="good" />
              <Metric label="המשכנתא מתקצרת ב" value={monthsSaved > 0 ? formatDuration(monthsSaved) : 'ללא שינוי'} tone={monthsSaved > 0 ? 'good' : 'default'} />
              <Metric label="תשלום אחרון" value={result.schedule.length > 0 ? formatMonthLabel(result.schedule[result.schedule.length - 1].date) : '—'} note={`במקום ${baseResult.schedule.length > 0 ? formatMonthLabel(baseResult.schedule[baseResult.schedule.length - 1].date) : '—'}`} />
            </div>
            <ul className="space-y-2">
              {[...tracker.prepayments]
                .sort((a, b) => a.month.localeCompare(b.month))
                .map((item) => {
                  const number = paymentNumberOf(item.month, firstPayment);
                  const row = result.schedule[number - 1];
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                    >
                      <TrendingDown className="h-5 w-5 shrink-0 text-emerald-600" />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="font-black text-slate-900">{formatShekel(item.amount)}</span>
                        <span className="text-slate-600">
                          {' '}
                          · {row ? formatMonthLabel(row.date) : item.month} (תשלום {number}) · {trackName(item.trackId)} ·{' '}
                          {item.mode === 'shorten_term' ? 'קיצור התקופה' : 'הקטנת ההחזר'}
                          {number <= made ? ' · בוצע' : ' · מתוכנן'}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removePrepayment(item.id)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-rose-600"
                        title="הסרת הפירעון"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </section>

      <ForecastDisclaimer mix={result.mix} />

      <p className="text-center text-xs text-slate-400">
        הלוח מחושב מהתמהיל הסופי שנחתם בתהליך.{' '}
        <Link href={`/dashboard/plans/${planId}`} className="font-bold text-blue-600 hover:underline">
          לתהליך המשכנתא
        </Link>
      </p>

      <PrepaymentDialog
        open={prepayOpen}
        mix={mix}
        baseResult={result}
        initialMonth={Math.min(made + 1, Math.max(1, total - 1))}
        onClose={() => setPrepayOpen(false)}
        onConfirm={addPrepayment}
      />

      <AmortizationDialog
        result={result}
        open={tableOpen}
        onClose={() => setTableOpen(false)}
        onSelectMonth={(value) => {
          setTableOpen(false);
          setMonth(value);
        }}
      />
    </div>
  );
}

function TimeButton({
  onClick,
  label,
  active = false,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
        active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-400'
      }`}
    >
      {children}
    </button>
  );
}

/** סרגל הזמן: מה ששולם בירוק, סימון של היום ושל כל פירעון מוקדם */
function TimelineSlider({
  value,
  max,
  today,
  prepaymentMonths,
  onChange,
}: {
  value: number;
  max: number;
  today: number;
  prepaymentMonths: number[];
  onChange: (value: number) => void;
}) {
  const span = Math.max(1, max - 1);
  const pos = (month: number) => `${((Math.min(Math.max(month, 1), max) - 1) / span) * 100}%`;
  return (
    <div className="relative pb-6 pt-2" dir="ltr">
      <div className="relative h-3 rounded-full bg-slate-200">
        <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-400" style={{ width: today > 0 ? pos(today) : '0%' }} />
        {prepaymentMonths.map((month) => (
          <span
            key={month}
            className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500"
            style={{ left: pos(month) }}
            title="פירעון מוקדם"
          />
        ))}
        {today > 0 && (
          <span className="absolute top-full mt-1 -translate-x-1/2 text-2xs font-black text-emerald-700" style={{ left: pos(today) }}>
            היום
          </span>
        )}
      </div>
      <input
        type="range"
        min={1}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="גלילת הזמן"
        className="absolute inset-x-0 top-0 h-7 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-md"
      />
    </div>
  );
}

/** שנה של לוח התשלומים סביב נקודת הזמן, עם מה ששולם, הקרוב והעתידי */
function ScheduleWindow({
  result,
  month,
  made,
  onSelect,
  onOpenFull,
}: {
  result: MixResult;
  month: number;
  made: number;
  onSelect: (month: number) => void;
  onOpenFull: () => void;
}) {
  const from = Math.max(0, Math.min(month - 6, result.schedule.length - 12));
  const rows = result.schedule.slice(from, from + 12);
  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-subtitle font-black text-slate-900">
            <Table2 className="h-5 w-5 text-blue-600" />
            לוח התשלומים
          </h3>
          <p className="mt-1 text-sm text-slate-500">שנה סביב נקודת הזמן שבחרתם. לחיצה על שורה מזיזה אליה את גלילת הזמן.</p>
        </div>
        <button
          type="button"
          onClick={onOpenFull}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-slate-700"
        >
          ללוח המלא לפי מסלולים
        </button>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold text-slate-500">
              <th className="px-2 py-2">תשלום</th>
              <th className="px-2 py-2">תאריך</th>
              <th className="px-2 py-2">החזר</th>
              <th className="px-2 py-2">קרן</th>
              <th className="px-2 py-2">ריבית</th>
              <th className="px-2 py-2">פירעון מוקדם</th>
              <th className="px-2 py-2">יתרה</th>
              <th className="px-2 py-2">מצב</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = row.month === month;
              const status = row.month <= made ? 'שולם' : row.month === made + 1 ? 'הקרוב' : '';
              return (
                <tr
                  key={row.month}
                  onClick={() => onSelect(row.month)}
                  className={`cursor-pointer border-b border-slate-100 tabular-nums transition-colors ${
                    selected ? 'bg-blue-50' : row.month <= made ? 'text-slate-500 hover:bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-2 py-2 font-bold">{row.month}</td>
                  <td className="px-2 py-2">{formatFullDate(row.date)}</td>
                  <td className="px-2 py-2 font-black text-slate-900">{formatShekel(row.payment)}</td>
                  <td className="px-2 py-2">{formatShekel(row.principal - row.prepayment)}</td>
                  <td className="px-2 py-2">{formatShekel(row.interest)}</td>
                  <td className="px-2 py-2">{row.prepayment > 0 ? formatShekel(row.prepayment) : '—'}</td>
                  <td className="px-2 py-2">{formatShekel(row.balanceEnd)}</td>
                  <td className="px-2 py-2">
                    {status && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-2xs font-black ${
                          status === 'שולם' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {status}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StartDateEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (date: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(value);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className="text-xs font-bold text-white/70" htmlFor="first-payment">
        תאריך התשלום הראשון
      </label>
      <input
        id="first-payment"
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        className="h-10 rounded-xl border-0 px-3 text-sm font-bold text-slate-900"
      />
      <button
        type="button"
        disabled={!date}
        onClick={() => onSave(date)}
        className="h-10 rounded-xl bg-sky-500 px-4 text-sm font-black text-white hover:bg-sky-600 disabled:opacity-40"
      >
        שמירה
      </button>
      <button type="button" onClick={onCancel} className="h-10 px-2 text-sm font-bold text-white/70 hover:text-white">
        ביטול
      </button>
    </div>
  );
}
