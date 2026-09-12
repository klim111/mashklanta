'use client';

import React, { useMemo, useState } from 'react';
import { Crown, Lock, Radio, TrendingDown } from 'lucide-react';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { computeMix, formatDuration } from '@/components/mortgage-advisor/engine';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { MixRow } from '@/components/mortgage-advisor/workspace/MixRow';
import { WorkspaceCharts } from '@/components/mortgage-advisor/workspace/WorkspaceCharts';
import { MixComparison } from '@/components/mortgage-advisor/MixComparison';
import type { ComparisonEntry } from '@/components/mortgage-advisor/MixComparison';
import { BankPricingRow } from './BankPricingRow';
import { PricedMixesArea } from './PricedMixesArea';
import {
  banksWithOffers,
  bankTone,
  filterByBanks,
  offersSpread,
  pricedMixesFor,
  toggleBank,
  winningPricedMix,
} from './pricedMixes';
import type { PricedMix } from './pricedMixes';
import { PanelBadge, StagePanel, StageStat } from './ui';

/**
 * מי מסתכל על המסך, ומה מותר לו.
 *
 * `self` — הלקוח מנהל את המכרז בעצמו: הוא מזין את הריביות ובוחר את התמהיל
 * לחתימה. `advised` — הלקוח קנה ליווי: הוא רואה את התמהיל ואת ההצעות שהיועץ
 * שידר לו, ובוחר ביניהן, אבל אינו מזין ריביות. `advisor` — היועץ עובד על תיק
 * הלקוח: אותו מסך בדיוק כמו אצל הלקוח, בתוספת שידור ההצעה אליו.
 */
export type AuctionRole = 'self' | 'advised' | 'advisor';

interface AuctionWorkspaceProps {
  role: AuctionRole;
  /** התמהיל הסופי שנבחר בשלב 3 — המבנה שכל הבנקים מתמחרים */
  finalMix: SavedMix;
  /** כל התמהילים השמורים שמהם נגזרות ההצעות */
  savedMixes: SavedMix[];
  /** ההצעה שנבחרה כתמהיל הסופי לחתימה */
  signedMixKey?: string | null;
  onSelectForSigning?: (mixId: string) => void;
  onSavePriced?: (quoted: WorkspaceMix) => Promise<void> | void;
  onRemovePriced?: (mixId: string) => void;
  /** שידור הצעה מתומחרת ללקוח — קיים רק אצל היועץ */
  onBroadcast?: (item: PricedMix) => void;
  /** ההצעות שכבר שודרו ללקוח, לסימון בשורה */
  broadcastIds?: readonly string[];
}

/**
 * מסך שלב התמחור.
 *
 * זהו אותו מסך בדיוק אצל הלקוח ואצל היועץ שעובד על התיק שלו — אותם אזורים,
 * אותה תצוגה ואותה התנהגות. ההבדל היחיד הוא שליועץ יש כפתור שידור, וללקוח
 * שקנה ליווי אין הזנת ריביות.
 */
export function AuctionWorkspace({
  role,
  finalMix,
  savedMixes,
  signedMixKey,
  onSelectForSigning,
  onSavePriced,
  onRemovePriced,
  onBroadcast,
  broadcastIds = [],
}: AuctionWorkspaceProps) {
  const [banks, setBanks] = useState<string[]>([]);
  const [mixExpanded, setMixExpanded] = useState(false);
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const baseResult = useMemo(() => computeMix(finalMix.mix), [finalMix.mix]);
  const priced = useMemo(
    () => pricedMixesFor(savedMixes, finalMix.mix.id),
    [savedMixes, finalMix.mix.id]
  );
  const visible = useMemo(() => filterByBanks(priced, banks), [priced, banks]);
  const available = useMemo(() => banksWithOffers(priced), [priced]);
  const winner = useMemo(() => winningPricedMix(visible), [visible]);
  const spread = useMemo(() => offersSpread(priced), [priced]);

  const offersPerBank = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of priced) counts[item.bank] = (counts[item.bank] ?? 0) + 1;
    return counts;
  }, [priced]);

  const takenNames = useMemo(() => savedMixes.map((item) => item.mix.name), [savedMixes]);

  const entries = useMemo<ComparisonEntry[]>(
    () =>
      visible.map((item) => ({
        id: item.mix.id,
        label: `${item.bank} · ${item.mix.name}`,
        mix: item.mix,
        recordId: item.recordId,
        isFinal: signedMixKey === item.mix.id,
      })),
    [visible, signedMixKey]
  );

  const summary = finalMix.summary;
  const canPrice = role === 'self' || role === 'advisor';

  return (
    <div className="space-y-5">
      {/* שורה ראשונה: התמהיל הסופי, כשורת תמהיל מלאה */}
      <StagePanel
        tone="locked"
        badge={
          <PanelBadge>
            <Lock className="h-3.5 w-3.5" />
            נעול לשינויים
          </PanelBadge>
        }
        title="התמהיל שהולך לתמחור"
        description="המבנה נקבע בשלב בניית התמהיל: מסלולים, סכומים, תקופות ולוחות סילוקין. כל בנק מתמחר בדיוק אותו — וזו הסיבה שאפשר להשוות בין ההצעות."
      >
        <MixRow
          mix={finalMix.mix}
          summary={summary}
          result={baseResult}
          expanded={mixExpanded}
          onClick={() => setMixExpanded((open) => !open)}
          focusTrackId={focusTrackId}
          onFocusTrack={setFocusTrackId}
          hint="לחצו על מסלול לנתונים ולגרפים שלו, או על השורה לתמהיל כולו"
          detail={
            <div className="border-t border-slate-100 p-2">
              <WorkspaceCharts
                result={baseResult}
                baseResult={baseResult}
                scenarioActive={false}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                focusTrackId={focusTrackId}
                onFocusTrack={setFocusTrackId}
              />
            </div>
          }
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StageStat label="סכום המשכנתא" value={formatShekel(finalMix.mix.totalAmount)} />
          <StageStat label="החזר חודשי בתכנון" value={formatShekel(summary.monthlyPayment)} />
          <StageStat label="סך ריבית בתכנון" value={formatShekel(summary.totalInterest)} />
          <StageStat label="תקופה" value={formatDuration(summary.months)} />
        </div>
      </StagePanel>

      {/* שורת הבנקים — רק למי שמזין ריביות */}
      {canPrice && onSavePriced && (
        <StagePanel
          title="הזנת הריביות מהבנקים"
          description="לחיצה על שם בנק פותחת את טבלת הריביות שלו. אחרי השמירה הטבלה נסגרת, וההצעה מופיעה למטה כשורת תמהיל מתומחרת."
        >
          <BankPricingRow
            mix={finalMix.mix}
            takenNames={takenNames}
            offersPerBank={offersPerBank}
            onSave={onSavePriced}
          />
        </StagePanel>
      )}

      {/* התמהילים המתומחרים */}
      <StagePanel
        badge={
          priced.length > 0 ? (
            <PanelBadge tone="emerald">{priced.length} הצעות</PanelBadge>
          ) : undefined
        }
        title="תמהילים מתומחרים"
        description="כל ההצעות שהתקבלו על התמהיל הסופי, כל אחת בצבע ובסימון של הבנק שתמחר אותה. סמנו בנק אחד או כמה — בלי הגבלה — כדי לצמצם את התצוגה."
      >
        {priced.length > 0 && (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <StageStat label="הצעות שהתקבלו" value={String(priced.length)} />
            <StageStat
              label="בנקים שתמחרו"
              value={String(available.length)}
              note={available.join(' · ')}
            />
            <StageStat
              label="פער בין הזולה ליקרה"
              value={spread > 0 ? formatShekel(spread) : '—'}
              note={spread > 0 ? 'זה מה שהתמחור שווה' : 'צריך שתי הצעות לפחות'}
              tone={spread > 0 ? 'good' : 'default'}
            />
          </div>
        )}

        <PricedMixesArea
          items={priced}
          visible={visible}
          baseResult={baseResult}
          banks={available}
          selectedBanks={banks}
          onToggleBank={(bank) => setBanks((current) => toggleBank(current, bank))}
          onClearBanks={() => setBanks([])}
          winnerId={winner?.mix.id ?? null}
          signedMixKey={signedMixKey ?? null}
          onRemove={onRemovePriced}
          emptyHint={
            role === 'advised'
              ? 'היועץ פונה לבנקים. כל הצעה שהוא ישדר אליכם תופיע כאן כשורת תמהיל מתומחרת, מוכנה להשוואה.'
              : 'עדיין לא נשמרה אף הצעה. לחצו למעלה על הבנק שחזר אליכם, הזינו את הריביות שנתן ולחצו ״שמור הצעה״.'
          }
        />

        {/* שידור ההצעות ללקוח — קיים רק אצל היועץ */}
        {role === 'advisor' && onBroadcast && visible.length > 0 && (
          <div className="mt-4 space-y-2">
            {visible.map((item) => {
              const sent = broadcastIds.includes(item.mix.id);
              const tone = bankTone(item.bank);
              return (
                <div
                  key={item.mix.id}
                  className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-4 py-2.5 text-center"
                >
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black text-white"
                    style={{ backgroundColor: tone.dot }}
                  >
                    {item.bank}
                  </span>
                  <span className="text-sm font-bold text-slate-700">{item.mix.name}</span>
                  {sent ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                      <Radio className="h-3.5 w-3.5" />
                      שודר ללקוח
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onBroadcast(item)}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-violet-700"
                    >
                      <Radio className="h-4 w-4" />
                      שדר תמהיל ללקוח
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </StagePanel>

      {/* ההשוואה ובחירת התמהיל לחתימה */}
      <StagePanel
        title="השוואת ההצעות ובחירת התמהיל לחתימה"
        description="אותה השוואה של שלב בניית התמהיל, הפעם בין ההצעות המתומחרות. ההפרש כולו נובע מהריביות, ולכן ההצעה הזולה בסך התשלומים היא הזוכה."
      >
        {priced.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center text-sm font-semibold text-slate-600">
            כשתתקבל ההצעה הראשונה היא תופיע כאן. עם שתי הצעות ומעלה מתחילה ההשוואה לעבוד.
          </div>
        ) : (
          <div className="space-y-4">
            {winner && <WinnerBanner winner={winner} spread={spread} signed={Boolean(signedMixKey)} />}

            <MixComparison
              entries={entries}
              allowSelectFinal={Boolean(onSelectForSigning)}
              onSelectFinal={onSelectForSigning}
              selectFinalLabel="בחר תמהיל זה כתמהיל סופי לחתימה"
              selectFinalConfirm="לבחור את ההצעה הזו כתמהיל הסופי לחתימה? היא תופיע באזור האישי כ׳המשכנתא שלי׳, ומולה יאומתו מסמכי הבנק בשלב החתימה."
              selectedFinalLabel="זה התמהיל שנבחר לחתימה"
            />
          </div>
        )}
      </StagePanel>
    </div>
  );
}

function WinnerBanner({
  winner,
  spread,
  signed,
}: {
  winner: PricedMix;
  spread: number;
  signed: boolean;
}) {
  const tone = bankTone(winner.bank);

  return (
    <div
      className={`rounded-2xl border-2 px-4 py-4 text-center ${
        signed ? 'border-emerald-500 bg-emerald-50' : 'border-amber-400 bg-amber-50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{ backgroundColor: tone.dot }}
        >
          <Crown className="h-5 w-5 text-white" />
        </span>
        <span className="text-lg font-black text-slate-900">ההצעה הזוכה: {winner.bank}</span>
      </div>

      <p className="mt-2 text-sm font-bold text-slate-700">{winner.mix.name}</p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm font-bold text-slate-800">
        <span>
          החזר חודשי{' '}
          <span className="font-black tabular-nums">
            {formatShekel(winner.summary.monthlyPayment)}
          </span>
        </span>
        <span>
          סך תשלום{' '}
          <span className="font-black tabular-nums">{formatShekel(winner.summary.totalPaid)}</span>
        </span>
        <span>
          ריבית ממוצעת{' '}
          <span className="font-black tabular-nums">
            {formatPercentage(winner.summary.averageRate)}
          </span>
        </span>
      </div>

      {spread > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-black text-emerald-700">
          <TrendingDown className="h-4 w-4" />
          חוסכת {formatShekel(spread)} מול ההצעה היקרה
        </p>
      )}
    </div>
  );
}
