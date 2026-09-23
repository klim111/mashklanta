'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, GitCompareArrows, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MixComparison } from '../MixComparison';
import type { ComparisonEntry } from '../MixComparison';
import { WorkspaceCharts } from './WorkspaceCharts';
import type { MixResult } from '../engine';
import { demoId } from '@/demo/demo-attr';

type AnalysisTab = 'charts' | 'comparison';

interface AnalysisTabsProps {
  /** התמהיל שבניתוח — הגרפים משתנים לפי השורה שנבחרה אחרונה */
  result: MixResult;
  baseResult: MixResult;
  scenarioActive: boolean;
  selectedMonth: number | null;
  onSelectMonth: (month: number | null) => void;
  entries: ComparisonEntry[];
  /** מספר התמהילים שסומנו בווי להשוואה */
  comparedCount: number;
  allowSelectFinal?: boolean;
  onSelectFinal?: (entryId: string) => void;
  /** המסלול שמוצג באזור הגרפים. null — כל התמהיל */
  focusTrackId?: string | null;
  onFocusTrack?: (trackId: string | null) => void;
  /**
   * סרגל בחירת התמהילים להשוואה. הוא חי כאן, בתוך לשונית ההשוואה, ולא מתחת
   * לאזור העבודה — שם הוא דחף את הדאשבורד אל מחוץ למסך.
   */
  comparePicker?: React.ReactNode;
  /** המודול יושב בעמודה שלצד אזור העבודה — גרפים בשתי עמודות ונמוכים יותר */
  split?: boolean;
}

/**
 * הניתוח הגרפי וההשוואה חיים באותו מודול. ברירת המחדל היא הניתוח הגרפי של
 * התמהיל שבניתוח, וסימון תמהילים להשוואה מעביר מיד ללשונית ההשוואה.
 *
 * כפתורי המעבר והוספת תמהיל להשוואה יושבים בכותרת המודול עצמו, ולא בשורה
 * נפרדת מעליו — כך הגרפים מתחילים גבוה יותר ונשארים על המסך.
 */
export function AnalysisTabs({
  result,
  baseResult,
  scenarioActive,
  selectedMonth,
  onSelectMonth,
  entries,
  comparedCount,
  allowSelectFinal,
  onSelectFinal,
  focusTrackId = null,
  onFocusTrack,
  comparePicker,
  split = false,
}: AnalysisTabsProps) {
  const [tab, setTab] = useState<AnalysisTab>('charts');
  /**
   * הסרגל נפתח כשנכנסים להשוואה בלי שנבחר דבר, ונסגר ברגע שנבחר תמהיל — כדי
   * שההשוואה עצמה תקבל את המסך. "הוסף תמהיל להשוואה" פותח אותו שוב.
   */
  const [pickerOpen, setPickerOpen] = useState(false);

  const previousCount = useRef(comparedCount);
  useEffect(() => {
    const previous = previousCount.current;
    previousCount.current = comparedCount;
    // המעבר קורה ברגע שנבחר תמהיל להשוואה, ולא בכל רינדור, כדי שהיועץ יוכל
    // לחזור לניתוח הגרפי בלי שהלשונית תיחטף ממנו
    if (previous === 0 && comparedCount > 0) setTab('comparison');
    // בחירה סוגרת את הסרגל ומפנה את המסך להשוואה עצמה
    if (comparedCount > previous) setPickerOpen(false);
  }, [comparedCount]);

  const openComparison = () => {
    setTab('comparison');
    if (comparedCount === 0) setPickerOpen(true);
  };

  const openPicker = () => {
    setTab('comparison');
    setPickerOpen(true);
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (value === 'comparison') openComparison();
        else setTab(value as AnalysisTab);
      }}
      dir="rtl"
    >
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList className="h-10 justify-start overflow-x-auto">
              <TabsTrigger value="charts" className="text-xs sm:text-sm" {...demoId('ws-tab-charts')}>
                <BarChart3 className="h-4 w-4 ml-1.5" />
                ניתוח גרפי
              </TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs sm:text-sm" {...demoId('ws-tab-comparison')}>
                <GitCompareArrows className="h-4 w-4 ml-1.5" />
                השוואה
                {comparedCount > 0 && (
                  <span className="mr-1.5 rounded-full bg-white/25 px-1.5 text-2xs font-semibold">
                    {comparedCount + 1}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            {comparePicker && (
              <Button
                size="sm"
                variant={tab === 'comparison' && pickerOpen ? 'default' : 'outline'}
                className="h-9 text-xs"
                onClick={() => (tab === 'comparison' && pickerOpen ? setPickerOpen(false) : openPicker())}
              >
                <Plus className="ml-1 h-3.5 w-3.5" />
                הוסף תמהיל להשוואה
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <TabsContent value="charts" className="mt-0">
            <WorkspaceCharts
              bare
              split={split}
              result={result}
              baseResult={baseResult}
              scenarioActive={scenarioActive}
              selectedMonth={selectedMonth}
              onSelectMonth={onSelectMonth}
              focusTrackId={focusTrackId}
              onFocusTrack={onFocusTrack}
            />
          </TabsContent>

          <TabsContent value="comparison" className="mt-0 space-y-2">
            {comparePicker && pickerOpen && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-2xs font-bold text-slate-600">
                    סמנו את התמהילים שייכנסו להשוואה
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-2xs"
                    onClick={() => setPickerOpen(false)}
                  >
                    <X className="ml-1 h-3.5 w-3.5" />
                    סגור
                  </Button>
                </div>
                {comparePicker}
              </div>
            )}

            <MixComparison
              bare
              entries={entries}
              allowSelectFinal={allowSelectFinal}
              onSelectFinal={onSelectFinal}
            />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
