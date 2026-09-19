'use client';

import { useEffect, useState } from 'react';
import { planDocumentRequirements } from '@/lib/plan-document-catalog';
import type { DocumentRequirement } from '@/lib/plan-document-catalog';
import type { PlanData } from '@/lib/mortgage-plan';

/**
 * רשימת המסמכים שהתהליך דורש, לחלון ההעלאה.
 *
 * כשנתוני התהליך כבר ביד (בתוך שלב, למשל) הם מועברים ישירות; כשהחלון נפתח
 * מהאזור האישי או מלוח השנה יש רק מזהה, ואז הנתונים נטענים פעם אחת. כך
 * בחירת סוג המסמך מציגה תמיד את אותה רשימה שמוצגת בתיק.
 */
export function usePlanRequirements(planId: string, data?: PlanData): DocumentRequirement[] {
  const [loaded, setLoaded] = useState<PlanData | null>(null);

  useEffect(() => {
    if (data || !planId) return;
    let cancelled = false;
    void fetch(`/api/plans/${planId}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body?.data) setLoaded(body.data as PlanData);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [planId, data]);

  const source = data ?? loaded;
  return source ? planDocumentRequirements(source) : [];
}
