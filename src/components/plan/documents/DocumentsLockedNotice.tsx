'use client';

import { PaidFeatureNotice } from '@/components/access/PaidFeatureLock';

/**
 * תיק המסמכים נעול: התהליך לא שולם, או שהסתיים חודש הגישה. התיק נפתח עם
 * רכישת החבילה, והקבצים שכבר בו נשמרים ומחכים.
 */
export function DocumentsLockedNotice({ planId }: { planId: string }) {
  return <PaidFeatureNotice feature="documents" checkoutHref={`/dashboard/checkout?planId=${encodeURIComponent(planId)}`} />;
}
