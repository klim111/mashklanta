'use client';

import React, { useMemo, useState } from 'react';
import { Building2, Crown } from 'lucide-react';
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
}: {
  featured: PricedMix | null;
  /** התמהיל כפי שתוכנן — הבסיס שמולו נמדדת ההצעה בגרפים */
  baseResult: MixResult;
  winnerId: string | null;
  signedMixKey?: string | null;
}) {
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const result = useMemo(() => (featured ? computeMix(featured.mix) : null), [featured]);

  if (!featured || !result) {
    return (
      <StageEmpty>
        כשתתקבל ההצעה הראשונה היא תיפתח כאן במלואה — כל המסלולים, המספרים והגרפים.
      </StageEmpty>
    );
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
          {featured.mix.id === winnerId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-sm font-black text-white">
              <Crown className="h-4 w-4" />
              ההצעה הזולה ביותר
            </span>
          )}
          {featured.mix.id === signedMixKey && (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-black text-white">
              נבחר לחתימה
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
              />
            </div>
          }
        />
      </div>
    </div>
  );
}
