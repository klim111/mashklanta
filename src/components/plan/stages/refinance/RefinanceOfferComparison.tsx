'use client';

import React, { useMemo } from 'react';
import type { RefinanceMixData } from '@/lib/mortgage-plan';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { toLegacyMix } from '@/components/mortgage-advisor/engine';
import { calculateMortgageMix, formatCurrency } from '@/components/mortgage-advisor/mortgageCalculations';
import { mixWithRemainingTerms } from '@/lib/refinance';
import {
  ComparisonCharts,
  MixResultRow,
  MixRowsHeader,
  NoChangeNotice,
  StateBlocksRow,
  mixStatsOf,
  snapshotOf,
} from '@/components/mortgage-refinance/RefinanceResultsDashboard';
import { mortgageMixOf } from '@/components/mortgage-refinance/refinancePlan';
import { PanelBadge, StagePanel } from '../auction/ui';

/**
 * ההצעה שהבנק נתן מול המשכנתא המקורית.
 *
 * זו אותה השוואה של כלי המיחזור — שורות הבלוקים, שורות התמהיל והגרפים —
 * כשהבסיס הוא המשכנתא כפי שהלקוח הזין אותה במסך הראשון, והתרחיש הוא
 * ההצעה שהבנק החזיר על התמהיל שנבנה. התמהיל המתוכנן מופיע ביניהם, כדי
 * לראות גם כמה ההצעה רחוקה ממה שביקשנו.
 */
export function RefinanceOfferComparison({
  refinance,
  offer,
  offerBank,
}: {
  refinance: RefinanceMixData;
  /** ההצעה המתומחרת שמושווים — הזולה, או זו שנבחרה */
  offer: SavedMix | null;
  offerBank?: string | null;
}) {
  const originalCalc = useMemo(
    () => calculateMortgageMix(mixWithRemainingTerms(mortgageMixOf(refinance.currentMix, refinance.savedAt))),
    [refinance]
  );
  const plannedCalc = useMemo(
    () => calculateMortgageMix(mortgageMixOf(refinance.refinancedMix, refinance.savedAt)),
    [refinance]
  );
  const offerCalc = useMemo(() => (offer ? calculateMortgageMix(toLegacyMix(offer.mix)) : null), [offer]);

  const monthsOf = (calc: typeof originalCalc) =>
    Object.fromEntries(calc.trackCalculations.map((tc) => [tc.track.id, tc.amortSchedule.length]));

  const offerTitle = offerBank ? `ההצעה של בנק ${offerBank}` : 'ההצעה של הבנק';

  return (
    <StagePanel
      tone="accent"
      badge={<PanelBadge tone="emerald">מול המשכנתא המקורית</PanelBadge>}
      title="ההצעה מול המשכנתא המקורית"
      description="המשכנתא כפי שהזנתם אותה בכלי המיחזור, מול הריביות שהבנק הציע לתמהיל שבניתם — בכל הפרמטרים, בטבלה ובגרפים."
    >
      <div className="space-y-2.5" dir="rtl">
        <StateBlocksRow
          title="המשכנתא המקורית"
          caption={`${refinance.bank} · ${formatCurrency(refinance.currentMix.totalAmount)} קרן`}
          snapshot={snapshotOf(originalCalc)}
          tone="current"
        />

        {offerCalc ? (
          <StateBlocksRow
            title={offerTitle}
            caption="לפי הריביות שהוזנו לתמהיל למיחזור"
            snapshot={snapshotOf(offerCalc)}
            baseline={snapshotOf(originalCalc)}
            tone="refinanced"
          />
        ) : (
          <NoChangeNotice text="עדיין לא הוזנה הצעה — הזינו למעלה את הריביות שהבנק נתן לתמהיל, וההשוואה תופיע כאן." />
        )}

        <div className="space-y-2 border-t border-slate-100 pt-2.5">
          <MixRowsHeader />
          <MixResultRow
            title="המשכנתא המקורית"
            subtitle="כפי שהוזנה בכלי המיחזור"
            stats={mixStatsOf(originalCalc)}
            tone="current"
            tracks={refinance.currentMix.tracks}
            trackMonths={monthsOf(originalCalc)}
          />
          <MixResultRow
            title="התמהיל שביקשנו"
            subtitle="לפי ריביות התכנון"
            stats={mixStatsOf(plannedCalc)}
            baseline={mixStatsOf(originalCalc)}
            tone="track"
            tracks={refinance.refinancedMix.tracks}
            trackMonths={monthsOf(plannedCalc)}
          />
          {offerCalc && offer && (
            <MixResultRow
              title={offerTitle}
              subtitle={offer.mix.name}
              stats={mixStatsOf(offerCalc)}
              baseline={mixStatsOf(originalCalc)}
              tone="refinanced"
              tracks={offer.mix.tracks}
              trackMonths={monthsOf(offerCalc)}
            />
          )}
        </div>

        <div className="border-t border-slate-100 pt-2.5">
          <ComparisonCharts
            title="המשכנתא כולה"
            hint={
              offerCalc
                ? 'המשכנתא המקורית מול ההצעה של הבנק.'
                : 'המשכנתא המקורית מול התמהיל שביקשנו — עד שתוזן הצעה.'
            }
            baseCalc={originalCalc}
            refinedCalc={offerCalc ?? plannedCalc}
            scenarioName={offerCalc ? 'הצעת הבנק' : 'התמהיל שביקשנו'}
          />
        </div>
      </div>
    </StagePanel>
  );
}
