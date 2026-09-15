'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gavel, Layers, Loader2, ScanSearch } from 'lucide-react';
import { computeMix } from '@/components/mortgage-advisor/engine';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { formatTrackTypeWithAmortization } from '@/components/mortgage-advisor/types';
import { winningOffer } from '@/lib/mortgage-plan';
import type { PlanData } from '@/lib/mortgage-plan';
import { EmptyHint, Metric, Panel, formatPercent, formatShekel } from '../../ui';

/**
 * התמהיל שלפיו משווים את הצעת המשכנתא הסופית של הבנק.
 *
 * העדיפות היא לתמהיל שתומחר על ידי הבנק הזוכה במכרז הריביות — זה התמהיל
 * המתואם, מסלול מול מסלול. אם אין כזה, מוצג התמהיל הסופי שננעל בשלב בניית
 * התמהיל, יחד עם התנאים שהבנק הזוכה נקב.
 */
function pickPricedMix(
  mixes: SavedMix[],
  data: PlanData,
  winnerBank: string | null
): { mix: WorkspaceMix; source: 'quote' | 'final' } | null {
  const quoted = mixes
    .filter((item) => item.mix.quote && (!winnerBank || item.mix.quote.bank === winnerBank))
    .sort((a, b) => (b.mix.quote?.receivedAt ?? '').localeCompare(a.mix.quote?.receivedAt ?? ''));
  if (quoted.length > 0) return { mix: quoted[0].mix, source: 'quote' };

  const final = mixes.find(
    (item) =>
      (data.MIX.mixRecordId && item.recordId === data.MIX.mixRecordId) ||
      (data.MIX.mixKey && item.mix.id === data.MIX.mixKey)
  );
  if (final) return { mix: final.mix, source: 'final' };

  const locked = mixes.find((item) => item.mix.locked || item.isFinal);
  return locked ? { mix: locked.mix, source: 'final' } : null;
}

export function FinalTermsPanel({ data, planId }: { data: PlanData; planId: string }) {
  const { saved, ready } = useSavedMixes({ planId });
  const winner = winningOffer(data.AUCTION);

  /** תמהילים ששויכו לתהליך הזה קודמים; בלעדיהם נופלים לכלל התמהילים של הלקוח */
  const candidates = useMemo(() => {
    const ofPlan = saved.filter((item) => item.planId === planId);
    return ofPlan.length > 0 ? ofPlan : saved;
  }, [saved, planId]);

  const picked = useMemo(
    () => pickPricedMix(candidates, data, winner?.bank ?? null),
    [candidates, data, winner?.bank]
  );

  const computed = useMemo(() => (picked ? computeMix(picked.mix) : null), [picked]);

  const headline = {
    bank: winner?.bank ?? picked?.mix.quote?.bank ?? null,
    monthlyPayment: winner?.monthlyPayment ?? computed?.summary.monthlyPayment ?? data.MIX.monthlyPayment,
    averageRate: winner?.averageRate ?? computed?.summary.averageRate ?? data.MIX.averageRate,
    totalPaid: winner?.totalPaid ?? computed?.summary.totalPaid ?? data.MIX.totalPaid,
    amount: computed?.mix.totalAmount ?? data.MIX.totalAmount,
  };

  return (
    <Panel
      centered
      title="התמהיל המתומחר — מולו משווים את הצעת הבנק"
      description="אלה התנאים שהושגו במכרז הריביות. כל מסלול, כל ריבית וכל תקופה באישור הסופי של הבנק חייבים להיות זהים למה שמופיע כאן."
      action={
        headline.bank ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-amber-500 to-orange-600 px-3.5 py-1.5 text-xs font-black text-white">
            <Gavel className="h-3.5 w-3.5" />
            {headline.bank}
          </span>
        ) : undefined
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="סכום המשכנתא" value={formatShekel(headline.amount)} />
        <Metric
          label="החזר חודשי שסוכם"
          value={formatShekel(headline.monthlyPayment)}
          tone="good"
        />
        <Metric label="ריבית ממוצעת משוקללת" value={formatPercent(headline.averageRate, 2)} />
        <Metric label="סך התשלומים" value={formatShekel(headline.totalPaid)} />
      </div>

      {!ready && (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          טוענים את התמהיל המתומחר…
        </div>
      )}

      {ready && !computed && (
        <div className="mt-5">
          <EmptyHint>
            עדיין לא נשמר תמהיל מתומחר לתהליך הזה. חזרו למכרז הריביות, הזינו את הריביות שקיבלתם
            מהבנק הזוכה — והפירוט לפי מסלולים יופיע כאן.
          </EmptyHint>
        </div>
      )}

      {ready && computed && (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-600">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              {computed.mix.name || 'התמהיל שנבנה'}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
              {picked?.source === 'quote'
                ? 'הריביות התקבלו מהבנק'
                : 'התמהיל הסופי שננעל בשלב בניית התמהיל'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[560px] text-right text-sm">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">מסלול</th>
                  <th className="px-4 py-2.5">סכום</th>
                  <th className="px-4 py-2.5">ריבית</th>
                  <th className="px-4 py-2.5">תקופה</th>
                  <th className="px-4 py-2.5">החזר חודשי</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {computed.tracks.map((result, index) => (
                  <motion.tr
                    key={result.track.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.26 }}
                    className="bg-white"
                  >
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-900">{result.track.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {formatTrackTypeWithAmortization(result.track)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums text-slate-700">
                      {formatShekel(result.track.amount)}
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums text-slate-700">
                      {formatPercent(result.track.interestRate, 2)}
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums text-slate-700">
                      {result.track.years} שנים
                    </td>
                    <td className="px-4 py-3 font-black tabular-nums text-slate-900">
                      {formatShekel(result.monthlyPayment)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-sm">
                <tr>
                  <td className="px-4 py-3 font-black text-slate-700">סך הכול</td>
                  <td className="px-4 py-3 font-black tabular-nums text-slate-900">
                    {formatShekel(computed.mix.totalAmount)}
                  </td>
                  <td className="px-4 py-3 font-black tabular-nums text-slate-900">
                    {formatPercent(computed.summary.averageRate, 2)}
                  </td>
                  <td className="px-4 py-3 font-bold tabular-nums text-slate-600">
                    {Math.round(computed.summary.months / 12)} שנים בממוצע
                  </td>
                  <td className="px-4 py-3 font-black tabular-nums text-slate-900">
                    {formatShekel(computed.summary.monthlyPayment)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
            <ScanSearch className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              עברו על אישור המשכנתא הסופי של הבנק מסלול מול מסלול: סכום, ריבית, תקופה, סוג ההצמדה
              ולוח הסילוקין. כל שינוי — גם של עשירית אחוז — צריך הסבר בכתב לפני החתימה.
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
}
