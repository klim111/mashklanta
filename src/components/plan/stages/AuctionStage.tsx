'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, BadgePercent, Crown, Loader2, Lock, TrendingDown } from 'lucide-react';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import type { AuctionData, PlanData, SignedMixChoice } from '@/lib/mortgage-plan';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { formatDuration } from '@/components/mortgage-advisor/engine';
import { TrackCompositionStrip } from '@/components/mortgage-advisor/analysisDashboard';
import { MixComparison } from '@/components/mortgage-advisor/MixComparison';
import type { ComparisonEntry } from '@/components/mortgage-advisor/MixComparison';
import { EmptyHint, Metric, Panel, formatPercent, formatShekel } from '../ui';
import { BankPricingPanel } from './auction/BankPricingPanel';
import { PricedMixesArea } from './auction/PricedMixesArea';
import {
  banksWithOffers,
  bankTone,
  filterByBanks,
  offersSpread,
  pricedMixesFor,
  toggleBank,
  winningPricedMix,
} from './auction/pricedMixes';

/**
 * שלב 4 — תמחור התמהיל הסופי מול הבנקים.
 *
 * מבנה התמהיל כבר נסגר בשלב 3 ואינו ניתן לעריכה כאן. מה שקורה בשלב הזה הוא
 * תמחור: כל בנק מקבל את אותו מבנה בדיוק, מחזיר ריביות, וההצעה שלו נשמרת
 * כתמהיל מתומחר על שמו. ההשוואה בין ההצעות היא השוואה אמיתית, כי כל ההבדל
 * ביניהן הוא הריביות.
 */
export function AuctionStage({
  data,
  onChange,
  planId,
}: {
  data: PlanData;
  onChange: (next: AuctionData) => void;
  planId: string;
}) {
  const value = data.AUCTION;
  const finalMixKey = data.MIX.mixKey;
  const { saved, ready, save, remove } = useSavedMixes({ planId });
  const [banks, setBanks] = useState<string[]>([]);

  const finalMix = useMemo(
    () => saved.find((item) => item.mix.id === finalMixKey) ?? null,
    [saved, finalMixKey]
  );

  const priced = useMemo(() => pricedMixesFor(saved, finalMixKey), [saved, finalMixKey]);
  const visible = useMemo(() => filterByBanks(priced, banks), [priced, banks]);
  const available = useMemo(() => banksWithOffers(priced), [priced]);
  const winner = useMemo(() => winningPricedMix(visible), [visible]);
  const spread = useMemo(() => offersSpread(priced), [priced]);
  const signed = value.signedMix;

  const entries = useMemo<ComparisonEntry[]>(
    () =>
      visible.map((item) => ({
        id: item.mix.id,
        label: `${item.bank} · ${item.mix.name}`,
        mix: item.mix,
        recordId: item.recordId,
        isFinal: signed?.mixKey === item.mix.id,
      })),
    [visible, signed?.mixKey]
  );

  const takenNames = useMemo(() => saved.map((item) => item.mix.name), [saved]);

  const onSavePriced = async (quoted: WorkspaceMix) => {
    await save(quoted, { planId });
  };

  const onRemovePriced = async (mixId: string) => {
    if (!window.confirm('למחוק את ההצעה הזו?')) return;
    if (signed?.mixKey === mixId) onChange({ ...value, signedMix: null });
    await remove(mixId);
  };

  const onSelectForSigning = (mixId: string) => {
    const item = priced.find((row) => row.mix.id === mixId);
    if (!item) return;

    const choice: SignedMixChoice = {
      mixKey: item.mix.id,
      mixRecordId: item.recordId ?? null,
      bank: item.bank,
      name: item.mix.name,
      monthlyPayment: item.summary.monthlyPayment,
      averageRate: item.summary.averageRate,
      totalInterest: item.summary.totalInterest,
      totalPaid: item.summary.totalPaid,
      months: item.summary.months,
      chosenAt: new Date().toISOString(),
    };
    onChange({ ...value, signedMix: choice });
  };

  if (!ready) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!finalMix) {
    return (
      <Panel
        title="עוד לא נבחר תמהיל סופי"
        description="שלב התמחור עובד על מבנה תמהיל אחד שננעל. חזרו לשלב בניית התמהיל, ובשורת התמהיל שבחרתם לחצו על ׳בחר כתמהיל סופי׳."
      >
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {data.MIX.mixName
            ? `התמהיל "${data.MIX.mixName}" נשמר, אך לא נמצא באזור התמהילים של הנכס.`
            : 'לא נמצא תמהיל שמור לנכס הזה.'}
        </div>
      </Panel>
    );
  }

  const summary = finalMix.summary;
  const signedTone = bankTone(signed?.bank);

  return (
    <div className="space-y-5">
      {/* התמהיל הסופי — לקריאה בלבד. מכאן והלאה משתנות רק הריביות */}
      <Panel
        title="התמהיל הסופי שנבחר"
        description="המבנה הזה נעול: מסלולים, סכומים, תקופות ולוחות סילוקין נקבעו בשלב בניית התמהיל. כל בנק מתמחר בדיוק אותו — וזו הסיבה שאפשר להשוות בין ההצעות."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white">
            <Lock className="h-3 w-3" />
            {finalMix.mix.name}
          </span>
          <span className="text-[11px] text-slate-500">
            {finalMix.mix.tracks.length} מסלולים · {formatDuration(summary.months)}
          </span>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="סכום המשכנתא" value={formatShekel(finalMix.mix.totalAmount)} />
          <Metric label="החזר חודשי בתכנון" value={formatShekel(summary.monthlyPayment)} />
          <Metric label="סך ריבית בתכנון" value={formatShekel(summary.totalInterest)} />
          <Metric label="ריבית ממוצעת בתכנון" value={formatPercent(summary.averageRate, 2)} />
        </div>

        <TrackCompositionStrip tracks={finalMix.mix.tracks} />
      </Panel>

      {/* הזנת הריביות מהבנקים על אותו מבנה */}
      <Panel
        title="הזנת הריביות מהבנקים"
        description="לכל בנק שחוזר עם תמחור — בחרו את הבנק, הזינו את הריבית שכל מסלול קיבל ולחצו ׳שמור הצעה׳. נשמר תמהיל מתומחר על שם אותו בנק, והמבנה נשאר זהה."
      >
        <BankPricingPanel mix={finalMix.mix} takenNames={takenNames} onSave={onSavePriced} />
      </Panel>

      {/* התמהילים המתומחרים */}
      <Panel
        title="תמהילים מתומחרים"
        description="כל ההצעות שהתקבלו על התמהיל הסופי, כל אחת בצבע ובסימון של הבנק שתמחר אותה. סמנו בנק אחד או כמה — בלי הגבלה — כדי לצמצם את התצוגה."
      >
        {priced.length > 0 && (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Metric label="הצעות שהתקבלו" value={String(priced.length)} />
            <Metric
              label="בנקים שתמחרו"
              value={String(available.length)}
              note={available.join(' · ')}
            />
            <Metric
              label="פער בין ההצעה הזולה ליקרה"
              value={spread > 0 ? formatShekel(spread) : '—'}
              note={spread > 0 ? 'זה מה שהתמחור שווה לכם' : 'צריך שתי הצעות לפחות'}
              tone={spread > 0 ? 'good' : 'default'}
            />
          </div>
        )}

        <PricedMixesArea
          items={priced}
          visible={visible}
          banks={available}
          selectedBanks={banks}
          onToggleBank={(bank) => setBanks((current) => toggleBank(current, bank))}
          onClearBanks={() => setBanks([])}
          winnerId={winner?.mix.id ?? null}
          signedMixKey={signed?.mixKey ?? null}
          onRemove={(mixId) => void onRemovePriced(mixId)}
        />
      </Panel>

      {/* ההשוואה בין ההצעות, ובחירת זו שהולכים איתה לחתימה */}
      <Panel
        title="השוואת ההצעות ובחירת התמהיל לחתימה"
        description="אותה השוואה של שלב בניית התמהיל, הפעם בין ההצעות המתומחרות. ההפרש כולו נובע מהריביות, ולכן ההצעה הזולה בסך התשלומים היא הזוכה."
      >
        {priced.length === 0 ? (
          <EmptyHint>
            כשתישמר ההצעה הראשונה היא תופיע כאן. עם שתי הצעות ומעלה מתחילה ההשוואה לעבוד
            לטובתכם.
          </EmptyHint>
        ) : (
          <div className="space-y-4">
            {winner && (
              <div
                className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
                  signed ? 'border-emerald-500 bg-emerald-50' : 'border-amber-300 bg-amber-50'
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: bankTone(winner.bank).dot }}
                >
                  <Crown className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">
                    ההצעה הזוכה: {winner.bank}
                  </div>
                  <div className="text-xs text-slate-600">
                    {winner.mix.name} · החזר {formatShekel(winner.summary.monthlyPayment)} · סך
                    תשלום {formatShekel(winner.summary.totalPaid)} · ריבית ממוצעת{' '}
                    {formatPercent(winner.summary.averageRate, 2)}
                  </div>
                </div>
                {spread > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-black text-emerald-700">
                    <TrendingDown className="h-3.5 w-3.5" />
                    חוסכת {formatShekel(spread)} מול ההצעה היקרה
                  </span>
                )}
              </div>
            )}

            <MixComparison
              entries={entries}
              allowSelectFinal
              onSelectFinal={onSelectForSigning}
              selectFinalLabel="בחר תמהיל זה כתמהיל סופי לחתימה"
              selectFinalConfirm="לבחור את ההצעה הזו כתמהיל הסופי לחתימה? היא תופיע באזור האישי כ׳המשכנתא שלי׳, ומולה יאומתו מסמכי הבנק בשלב החתימה."
              selectedFinalLabel="זה התמהיל שנבחר לחתימה"
            />
          </div>
        )}
      </Panel>

      {signed && (
        <Panel
          title="המשכנתא שלי"
          description="זו ההצעה שנבחרה לחתימה. היא מופיעה גם באזור האישי, ומולה מאומתים מסמכי הבנק בשלב החתימה."
        >
          <div className={`rounded-2xl border-2 p-4 ${signedTone.border} ${signedTone.surface}`}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black text-white"
                style={{ backgroundColor: signedTone.dot }}
              >
                <BadgePercent className="h-3 w-3" />
                בנק {signed.bank}
              </span>
              <span className="text-sm font-black text-slate-900">{signed.name}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="החזר חודשי" value={formatShekel(signed.monthlyPayment)} tone="good" />
              <Metric label="סך ריבית" value={formatShekel(signed.totalInterest)} />
              <Metric label="סך תשלום" value={formatShekel(signed.totalPaid)} />
              <Metric label="ריבית ממוצעת" value={formatPercent(signed.averageRate, 2)} />
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              אפשר לשנות את הבחירה כל עוד לא נחתם — בחרו הצעה אחרת בהשוואה שלמעלה. השלב הבא הוא
              שלב {PLAN_STAGES.length} — החתימה בבנק.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}

