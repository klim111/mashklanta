'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookmarkCheck, FolderOpen, History, Home, PieChart, Plus, X } from 'lucide-react';
import { MixSummaryCard } from '../MixSummaryCard';
import type { SavedMix } from '../savedMixes';
import type { WorkspaceMix } from '../engine';
import { groupByProperty } from '../propertyContext';
import { formatShekel } from './primitives';

interface WorkspaceLandingProps {
  saved: SavedMix[];
  /** טיוטה מהפעם הקודמת, אם היועץ עזב את המסך בלי לשמור */
  draftMix: WorkspaceMix | null;
  onCreateNew: () => void;
  onOpenSaved: (item: SavedMix) => void;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
}

/**
 * מסך הפתיחה של הכלי. הכלי נפתח נקי — בלי נתונים משום תמהיל — ומציע שתי דרכים
 * להתחיל: בניית תמהיל חדש, או טעינת תמהיל שמור מהאזור האישי.
 */
export function WorkspaceLanding({
  saved,
  draftMix,
  onCreateNew,
  onOpenSaved,
  onResumeDraft,
  onDiscardDraft,
}: WorkspaceLandingProps) {
  const [picking, setPicking] = useState(false);
  const groups = useMemo(() => groupByProperty(saved, (item) => item.mix), [saved]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold text-slate-900">כלי תכנון המשכנתא</h1>
        <p className="text-sm text-slate-600 mt-1">
          בנו תמהיל חדש מאפס, או המשיכו לעבוד על תמהיל ששמרתם.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCreateNew}
          className="group rounded-2xl border-2 border-slate-200 bg-white p-6 text-right transition-all hover:border-blue-500 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
            <Plus className="h-5 w-5" />
          </span>
          <p className="mt-3 text-base font-bold text-slate-900">צור תמהיל חדש</p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            הזינו את סכום המשכנתא, הוסיפו מסלול אחרי מסלול עד לכיסוי מלא, ותנו שם לתמהיל.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPicking((open) => !open)}
          className="group rounded-2xl border-2 border-slate-200 bg-white p-6 text-right transition-all hover:border-blue-500 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white">
            <FolderOpen className="h-5 w-5" />
          </span>
          <p className="mt-3 text-base font-bold text-slate-900">טען תמהיל שמור מהאזור האישי</p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            {saved.length > 0
              ? `${saved.length} תמהילים שמורים. בחרו תמהיל וכל השדות והגרפים ייטענו איתו.`
              : 'עדיין אין תמהילים שמורים. כל תמהיל שתשמרו יופיע כאן ובאזור האישי.'}
          </p>
        </button>
      </div>

      {draftMix && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <History className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-900">
              יש תמהיל בעבודה שלא נשמר: {draftMix.name || 'ללא שם'}
            </p>
            <p className="text-[11px] text-amber-800">
              {formatShekel(draftMix.totalAmount)} · {draftMix.tracks.length} מסלולים
            </p>
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={onResumeDraft}>
            המשך מהמקום שהפסקתי
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onDiscardDraft}>
            <X className="h-3.5 w-3.5 ml-1" />
            מחק
          </Button>
        </div>
      )}

      {picking && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <BookmarkCheck className="h-4 w-4 text-blue-600" />
                תמהילים שמורים
              </p>
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <Link href="/saved-mixes">לאזור האישי</Link>
              </Button>
            </div>

            {saved.length === 0 ? (
              <div className="py-8 text-center">
                <PieChart className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  אין עדיין תמהילים שמורים. התחילו בבניית תמהיל חדש.
                </p>
              </div>
            ) : (
              // התמהילים מוצגים תחת הנכס שלהם, כדי שהבחירה תהיה בין חלופות לאותה עסקה
              groups.map((group) => (
                <div key={group.key} className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-slate-400" />
                    {group.address || `משכנתא בסך ${formatShekel(group.totalAmount)}`}
                    <span className="font-normal text-slate-400">
                      {group.items.length} תמהילים
                    </span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <MixSummaryCard
                        key={item.mix.id}
                        mix={item.mix}
                        summary={item.summary}
                        savedAt={item.savedAt}
                        onOpen={() => onOpenSaved(item)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
