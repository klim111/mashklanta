'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, GitCompareArrows } from 'lucide-react';
import { MixComparison } from '../MixComparison';
import type { ComparisonEntry } from '../MixComparison';
import { WorkspaceCharts } from './WorkspaceCharts';
import type { MixResult } from '../engine';

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
}

/**
 * הניתוח הגרפי וההשוואה חיים באותו אזור. ברירת המחדל היא הניתוח הגרפי של
 * התמהיל שבניתוח, וסימון תמהילים להשוואה מעביר מיד ללשונית ההשוואה.
 */
export function AnalysisTabs({
  result,
  baseResult,
  scenarioActive,
  selectedMonth,
  onSelectMonth,
  entries,
  comparedCount,
}: AnalysisTabsProps) {
  const [tab, setTab] = useState<AnalysisTab>('charts');

  const previousCount = useRef(comparedCount);
  useEffect(() => {
    const previous = previousCount.current;
    previousCount.current = comparedCount;
    // המעבר קורה ברגע שנבחר תמהיל להשוואה, ולא בכל רינדור, כדי שהיועץ יוכל
    // לחזור לניתוח הגרפי בלי שהלשונית תיחטף ממנו
    if (previous === 0 && comparedCount > 0) setTab('comparison');
  }, [comparedCount]);

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as AnalysisTab)} dir="rtl">
      <TabsList className="h-11">
        <TabsTrigger value="charts" className="text-xs sm:text-sm">
          <BarChart3 className="h-4 w-4 ml-1.5" />
          ניתוח גרפי
        </TabsTrigger>
        <TabsTrigger value="comparison" className="text-xs sm:text-sm">
          <GitCompareArrows className="h-4 w-4 ml-1.5" />
          השוואה
          {comparedCount > 0 && (
            <span className="mr-1.5 rounded-full bg-white/25 px-1.5 text-[10px] font-semibold">
              {comparedCount + 1}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="charts">
        <WorkspaceCharts
          result={result}
          baseResult={baseResult}
          scenarioActive={scenarioActive}
          selectedMonth={selectedMonth}
          onSelectMonth={onSelectMonth}
        />
      </TabsContent>

      <TabsContent value="comparison">
        <MixComparison entries={entries} />
      </TabsContent>
    </Tabs>
  );
}
