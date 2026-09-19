'use client';

import React, { useMemo, useState } from 'react';
import { BadgePercent, Building2, Crown, Gavel } from 'lucide-react';
import { computeMix } from '@/components/mortgage-advisor/engine';
import type { MixResult } from '@/components/mortgage-advisor/engine';
import { MixRow } from '@/components/mortgage-advisor/workspace/MixRow';
import { WorkspaceCharts } from '@/components/mortgage-advisor/workspace/WorkspaceCharts';
import { bankTone } from './pricedMixes';
import type { PricedMix } from './pricedMixes';
import { StageEmpty } from './ui';

/**
 * הדאשבורד של ההצעה.
 *
 * כברירת מחדל זו ההצעה הזולה ביותר, פתוחה במלואה — התמהיל, המספרים והגרפים —
 * בלי שצריך ללחוץ על דבר. מי שנכנס למסך רואה מיד מה ההצעה הטובה ביותר שיש
 * כרגע. לחיצה על בנק באחד האזורים שמעל מחליפה את ההצעה שמוצגת כאן.
 */
export function PricedDashboard({
  featured,
  baseResult,
  winnerId,
  signedMixKey,
  onSelectForSigning,
  emptyHint,
  offerBadge,
  signLabel,
}: {
  featured: PricedMix | null;
  /** התמהיל כפי שתוכנן — הבסיס שמולו נמדדת ההצעה בגרפים */
  baseResult: MixResult;
  winnerId: string | null;
  signedMixKey?: string | null;
  /** בחירת ההצעה שמוצגת כתמהיל הסופי לחתימה */
  onSelectForSigning?: (mixId: string) => void;
  /** מה נאמר כשעדיין אין הצעה להציג */
  emptyHint: string;
  /**
   * התווית שעל ההצעה. ברירת המחדל היא "ההצעה הזולה ביותר" על ההצעה הזוכה;
   * במיחזור, שבו מתמחר בנק אחד, התווית מתארת את ההצעה עצמה ומוצגת על כל הצעה.
   */
  offerBadge?: { label: string; everyOffer?: boolean };
  /** הכיתוב על כפתור בחירת ההצעה ועל התווית שלה אחרי הבחירה */
  signLabel?: { badge: string; button: string; confirm: string };
}) {
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const result = useMemo(() => (featured ? computeMix(featured.mix) : null), [featured]);

  if (!featured || !result) {
    return <StageEmpty>{emptyHint}</StageEmpty>;
  }

  const tone = bankTone(featured.bank);

  return (
    <div className="overflow-hidden rounded-3xl border-2" style={{ borderColor: tone.dot }}>
      <div className="h-1.5 w-full" style={{ backgroundColor: tone.dot }} />

      <div className="bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black text-white"
            style={{ backgroundColor: tone.dot }}
          >
            <Building2 className="h-4 w-4" />
            בנק {featured.bank}
          </span>
          {(offerBadge?.everyOffer || featured.mix.id === winnerId) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-sm font-black text-white">
              {offerBadge?.everyOffer ? (
                <BadgePercent className="h-4 w-4" />
              ) : (
                <Crown className="h-4 w-4" />
              )}
              {offerBadge?.label ?? 'ההצעה הזולה ביותר'}
            </span>
          )}
          {featured.mix.id === signedMixKey && (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-black text-white">
              {signLabel?.badge ?? 'נבחר לחתימה'}
            </span>
          )}
        </div>

        {/*
          השורה פתוחה תמיד: הדאשבורד הוא המקום שבו רואים הכול, ולכן הגרפים
          אינם מוסתרים מאחורי לחיצה.
        */}
        <MixRow
          mix={featured.mix}
          summary={featured.summary}
          result={result}
          expanded
          showExpandIcon={false}
          focusTrackId={focusTrackId}
          onFocusTrack={setFocusTrackId}
          hint="לחצו על מסלול לנתונים ולגרפים שלו"
          detail={
            <div className="border-t border-slate-100 p-2">
              <WorkspaceCharts
                result={result}
                baseResult={baseResult}
                scenarioActive={false}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                focusTrackId={focusTrackId}
                onFocusTrack={setFocusTrackId}
                showForecasts={false}
                showCompositionStrip={false}
              />
            </div>
          }
        />

        {/* בחירת ההצעה שמוצגת כתמהיל הסופי לחתימה */}
        {onSelectForSigning && featured.mix.id !== signedMixKey && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    signLabel?.confirm ??
                      'לבחור את ההצעה הזו כתמהיל הסופי לחתימה? היא תופיע באזור האישי כ׳המשכנתא שלי׳, ומולה יאומתו מסמכי הבנק בשלב החתימה.'
                  )
                ) {
                  onSelectForSigning(featured.mix.id);
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-slate-700"
            >
              <Gavel className="h-4 w-4" />
              {signLabel?.button ?? 'בחר תמהיל זה כתמהיל סופי לחתימה'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
