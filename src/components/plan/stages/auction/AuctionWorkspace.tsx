'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { computeMix, formatDuration } from '@/components/mortgage-advisor/engine';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { BankPricingRow } from './BankPricingRow';
import { BankFilterRow, BankOffersTable } from './BankOffersTable';
import { OffersStatsRow } from './AuctionSummaryRows';
import { OfferComparisonArea } from './OfferComparisonArea';
import { PricedDashboard } from './PricedDashboard';
import { TrackStrip } from './TrackStrip';
import {
  banksWithOffers,
  cheapestOfBank,
  costliestPricedMix,
  filterByBanks,
  interestSpread,
  monthlySpread,
  pricedMixesFor,
  toggleBank,
  winningPricedMix,
} from './pricedMixes';
import type { PricedMix } from './pricedMixes';
import { PanelBadge, StagePanel } from './ui';

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
 * המסך בנוי מלמעלה למטה לפי מה שדחוף לדעת: קודם ההצעה הזולה שיש כרגע, אחריה
 * מצב ההתמחרות, אחר כך המבנה שכולם מתמחרים, אחריו מה כל בנק נתן עליו, ולבסוף
 * דאשבורד שפותח הצעה אחת במלואה. זהו אותו מסך בדיוק אצל הלקוח ואצל היועץ
 * שעובד על התיק שלו — ההבדל היחיד הוא שליועץ יש כפתור שידור, וללקוח שקנה
 * ליווי אין הזנת ריביות.
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
  /** ההצעה שפתוחה בדאשבורד. null — הזולה ביותר, שנבחרת אוטומטית */
  const [featuredId, setFeaturedId] = useState<string | null>(null);

  const baseResult = useMemo(() => computeMix(finalMix.mix), [finalMix.mix]);
  const priced = useMemo(
    () => pricedMixesFor(savedMixes, finalMix.mix.id),
    [savedMixes, finalMix.mix.id]
  );
  const visible = useMemo(() => filterByBanks(priced, banks), [priced, banks]);
  const available = useMemo(() => banksWithOffers(priced), [priced]);

  /* ההצעה הזולה נגזרת מכל ההצעות ולא מהמסוננות: השורה העליונה אומרת מה הטוב
     ביותר שיש על השולחן, ולא מה הטוב ביותר מבין מה שסומן כרגע. */
  const winner = useMemo(() => winningPricedMix(priced), [priced]);
  const costliest = useMemo(() => costliestPricedMix(priced), [priced]);

  const featured = useMemo(() => {
    const chosen = featuredId ? priced.find((item) => item.mix.id === featuredId) : null;
    // הצעה שנמחקה או שעדיין לא נבחרה — נופלים לזולה ביותר
    return chosen ?? winner;
  }, [featuredId, priced, winner]);

  // הצעה חדשה שנכנסת ומשנה את הזוכה מתעדכנת מיד, כל עוד לא נבחרה הצעה ידנית
  useEffect(() => {
    if (featuredId && !priced.some((item) => item.mix.id === featuredId)) setFeaturedId(null);
  }, [featuredId, priced]);

  const offersPerBank = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of priced) counts[item.bank] = (counts[item.bank] ?? 0) + 1;
    return counts;
  }, [priced]);

  const takenNames = useMemo(() => savedMixes.map((item) => item.mix.name), [savedMixes]);
  const canPrice = (role === 'self' || role === 'advisor') && Boolean(onSavePriced);

  /** לחיצה על שם בנק מסננת אליו וגם מעלה את ההצעה הזולה שלו לדאשבורד */
  const onToggleBankChip = (bank: string) => {
    setBanks((current) => {
      const next = toggleBank(current, bank);
      if (next.includes(bank)) {
        const cheapest = cheapestOfBank(priced, bank);
        if (cheapest) setFeaturedId(cheapest.mix.id);
      } else if (featured?.bank === bank) {
        // ביטול הסימון של הבנק שההצעה שלו פתוחה מחזיר את הדאשבורד לזולה ביותר
        setFeaturedId(null);
      }
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* 1. המבנה שכל הבנקים מתמחרים — בלי ריביות, כי הן מה שעוד לא ידוע */}
      <StagePanel
        tone="locked"
        badge={
          <PanelBadge>
            <Lock className="h-3.5 w-3.5" />
            נעול לשינויים
          </PanelBadge>
        }
        title="התמהיל שהולך לתמחור"
        description="המבנה נקבע בשלב בניית התמהיל: מסלולים, סכומים ותקופות. כל בנק מתמחר בדיוק אותו — וזו הסיבה שאפשר להשוות בין ההצעות."
      >
        <TrackStrip tracks={finalMix.mix.tracks} variant="structure" />

        <p className="mt-3 text-center text-sm font-bold text-slate-600">
          {formatShekel(finalMix.mix.totalAmount)} · {finalMix.mix.tracks.length} מסלולים ·{' '}
          {formatDuration(finalMix.summary.months)}
        </p>
      </StagePanel>

      {/* 2. מצב ההתמחרות */}
      <OffersStatsRow
        offers={priced.length}
        banks={available}
        monthlyGap={monthlySpread(priced)}
        interestGap={interestSpread(priced)}
        formatMoney={formatShekel}
      />

      {/* שורת הבנקים להזנת ריביות — רק למי שמזין */}
      {canPrice && onSavePriced && (
        <StagePanel
          title="הזנת הריביות מהבנקים"
          description="לחיצה על שם בנק פותחת את טבלת הריביות שלו. אחרי השמירה הטבלה נסגרת, וההצעה מצטרפת מיד לטבלה שמתחת."
        >
          <BankPricingRow
            mix={finalMix.mix}
            takenNames={takenNames}
            offersPerBank={offersPerBank}
            onSave={onSavePriced}
          />
        </StagePanel>
      )}

      {/* 3. טבלת ההשוואה בין ההצעות, ומתחתיה הפילטרים — שניהם פתוחים תמיד */}
      <StagePanel
        badge={
          priced.length > 0 ? (
            <PanelBadge tone="emerald">{priced.length} הצעות</PanelBadge>
          ) : undefined
        }
        title="ההצעות שהתקבלו"
        description="בכל שורה הריביות שהבנק נקב יושבות בתוך המסלול שהן שייכות לו. לחיצה על שורה — או על שם בנק — פותחת את ההצעה שלו בדאשבורד שמתחת."
      >
        <div className="space-y-4">
          <BankOffersTable
            items={visible}
            featuredId={featured?.mix.id ?? null}
            onFeature={setFeaturedId}
            winnerId={winner?.mix.id ?? null}
            onRemove={onRemovePriced}
            broadcastIds={broadcastIds}
            onBroadcast={role === 'advisor' ? onBroadcast : undefined}
            emptyHint={
              role === 'advised'
                ? 'היועץ פונה לבנקים. כל הצעה שהוא ישדר אליכם תופיע כאן מיד, בלי צורך לרענן את הדף.'
                : 'עדיין לא נשמרה אף הצעה. לחצו למעלה על הבנק שחזר אליכם, הזינו את הריביות שנתן ולחצו ״שמור הצעה״.'
            }
          />

          <BankFilterRow
            banks={available}
            counts={offersPerBank}
            selectedBanks={banks}
            onToggleBank={onToggleBankChip}
            onClearBanks={() => {
              setBanks([]);
              setFeaturedId(null);
            }}
          />
        </div>
      </StagePanel>

      {/* 4. הדאשבורד — ההצעה שנבחרה, פתוחה במלואה */}
      <StagePanel
        title={
          featured && featured.mix.id === winner?.mix.id
            ? 'ההצעה הזולה ביותר — במלואה'
            : 'ההצעה שבחרתם — במלואה'
        }
        description="התמהיל, המספרים והגרפים של ההצעה שמוצגת. לחיצה על בנק באחד האזורים שלמעלה מחליפה אותה."
      >
        <div className="space-y-4">
          <PricedDashboard
            featured={featured}
            baseResult={baseResult}
            winnerId={winner?.mix.id ?? null}
            signedMixKey={signedMixKey ?? null}
          />

          <OfferComparisonArea
            cheapest={winner}
            featured={featured}
            costliest={costliest}
            signedMixKey={signedMixKey ?? null}
            onSelectForSigning={onSelectForSigning}
          />
        </div>
      </StagePanel>
    </div>
  );
}
