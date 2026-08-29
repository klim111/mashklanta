'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { MortgageWorkspace } from '@/components/mortgage-advisor/MortgageWorkspace';
import { ArrowRight } from 'lucide-react';

function MixPlannerBody() {
  const searchParams = useSearchParams();
  const mixKey = searchParams.get('mix');

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
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
      <MortgageWorkspace
        skipPropertySetup
        startInSetup={!mixKey}
        soloMixKey={mixKey || undefined}
        activeMixKey={mixKey}
      />
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
