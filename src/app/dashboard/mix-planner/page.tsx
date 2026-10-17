'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { MortgageWorkspace } from '@/components/mortgage-advisor/MortgageWorkspace';
import { ArrowRight, Loader2 } from 'lucide-react';
import { PaidFeatureNotice } from '@/components/access/PaidFeatureLock';
import { usePlatformAccess } from '@/components/service-flow/usePlatformAccess';
import { useKnownDetails } from '@/components/known-details/useKnownDetails';

function MixPlannerBody() {
  const searchParams = useSearchParams();
  const mixKey = searchParams.get('mix');
  const { access, ready: accessReady } = usePlatformAccess();
  // מחיר הנכס, סכום המשכנתא וההון העצמי שכבר הוזנו בפלטפורמה — התמהיל הראשון
  // נפתח איתם במקום סכום ברירת מחדל, ולכן הכלי ממתין להם
  const { details: known, ready: knownReady } = useKnownDetails();
  const ready = accessReady && knownReady;
  const seed = useMemo(
    () =>
      known
        ? {
            dealType: known.dealType ?? undefined,
            totalAmount: known.mortgageAmount ?? undefined,
            propertyValue: known.propertyValue ?? undefined,
            equity: known.equity ?? undefined,
          }
        : undefined,
    [known]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לאזור האישי
          </Link>
          <p className="text-sm font-black text-slate-900">כלי תכנון משכנתאות · תמהילים ללא שיוך לנכס</p>
        </div>
      </div>
      {/* הכלי פתוח ללקוח שרכש חבילה; לאחרים הקישורים נשארים ומסבירים מתי ייפתח */}
      {!ready ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
        </div>
      ) : access.paidClient ? (
        <MortgageWorkspace
          soloMixKey={mixKey || undefined}
          activeMixKey={mixKey}
          defaultSetupSeed={seed}
          hideSiteLinks
        />
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
          <PaidFeatureNotice feature="mix" />
        </div>
      )}
    </div>
  );
}

export default function MixPlannerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <MixPlannerBody />
    </Suspense>
  );
}
