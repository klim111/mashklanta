'use client';

import React, { useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import { computeMix } from '@/components/mortgage-advisor/engine';
import type { MixResult } from '@/components/mortgage-advisor/engine';
import { MixRow } from '@/components/mortgage-advisor/workspace/MixRow';
import { WorkspaceCharts } from '@/components/mortgage-advisor/workspace/WorkspaceCharts';
import { MixComparison } from '@/components/mortgage-advisor/MixComparison';
import type { ComparisonEntry } from '@/components/mortgage-advisor/MixComparison';
import { bankTone } from './pricedMixes';
import type { PricedMix } from './pricedMixes';
import { StageEmpty } from './ui';

interface PricedDashboardProps {
  /** ההצעות המוצגות, מהזולה ליקרה */
  items: PricedMix[];
  /** ההצעה שפתוחה כרגע בראש הדאשבורד */
  featured: PricedMix | null;
  onFeature: (mixId: string) => void;
  /** התמהיל כפי שתוכנן — הבסיס שמולו נמדדת ההצעה בגרפים */
  baseResult: MixResult;
  winnerId: string | null;
  signedMixKey?: string | null;
  onSelectForSigning?: (mixId: string) => void;
}

/**
 * הדאשבורד של ההצעות.
 *
 * בראשו ההצעה שנבחרה — כברירת מחדל הזולה — בתצוגת תמהיל מלאה עם כל הנתונים.
 * "הצג פרטים" פותח מתחתיה את הגרפים ואת טבלת ההשוואה בין כל ההצעות, מסודרות
 * מהזולה ליקרה. לחיצה על שורת בנק כאן או למעלה מחליפה את ההצעה שבראש, בלי
 * לטעון מחדש דבר.
 */
export function PricedDashboard({
  items,
  featured,
  onFeature,
  baseResult,
  winnerId,
  signedMixKey,
  onSelectForSigning,
}: PricedDashboardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const result = useMemo(
    () => (featured ? computeMix(featured.mix) : null),
    [featured]
  );

  const entries = useMemo<ComparisonEntry[]>(
    () =>
      items.map((item) => ({
        id: item.mix.id,
        label: `${item.bank} · ${item.mix.name}`,
        mix: item.mix,
        recordId: item.recordId,
        current: item.mix.id === featured?.mix.id,
        isFinal: signedMixKey === item.mix.id,
      })),
    [items, featured?.mix.id, signedMixKey]
  );

  if (!featured || !result) {
    return (
      <StageEmpty>
        כשתתקבל ההצעה הראשונה היא תיפתח כאן במלואה — כל המסלולים, הגרפים וההשוואה מול שאר
        ההצעות.
      </StageEmpty>
    );
  }

  const tone = bankTone(featured.bank);

  return (
    <div className="space-y-4">
      {/* ההצעה שבמוקד — תמהיל מלא עם כל הנתונים */}
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

          <MixRow
            mix={featured.mix}
            summary={featured.summary}
            result={result}
            expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
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

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-800 transition-colors hover:bg-slate-50"
        >
          {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {detailsOpen ? 'הסתר פרטים' : 'הצג פרטים'}
          {!detailsOpen && items.length > 1 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              השוואה בין {items.length} הצעות
            </span>
          )}
        </button>
      </div>

      {detailsOpen && (
        <MixComparison
          entries={entries}
          allowSelectFinal={Boolean(onSelectForSigning)}
          onSelectFinal={onSelectForSigning}
          selectFinalLabel="בחר תמהיל זה כתמהיל סופי לחתימה"
          selectFinalConfirm="לבחור את ההצעה הזו כתמהיל הסופי לחתימה? היא תופיע באזור האישי כ׳המשכנתא שלי׳, ומולה יאומתו מסמכי הבנק בשלב החתימה."
          selectedFinalLabel="זה התמהיל שנבחר לחתימה"
        />
      )}

      {/* לחיצה על שורת בנק כאן מחליפה את ההצעה שבראש הדאשבורד */}
      {items.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {items.map((item) => {
            const itemTone = bankTone(item.bank);
            const active = item.mix.id === featured.mix.id;
            return (
              <button
                key={item.mix.id}
                type="button"
                onClick={() => onFeature(item.mix.id)}
                aria-pressed={active}
                style={
                  active
                    ? { backgroundColor: itemTone.dot, borderColor: itemTone.dot }
                    : { borderColor: itemTone.dot }
                }
                className={`rounded-2xl border-2 px-4 py-2 text-sm font-black transition-all ${
                  active ? 'text-white shadow-md' : 'bg-white text-slate-800 hover:shadow-sm'
                }`}
              >
                {item.bank}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
