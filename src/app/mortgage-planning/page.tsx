'use client';

import { Suspense } from 'react';
import { MortgagePlanningContent } from '@/components/mortgage-planning/MortgagePlanningTool';

export default function MortgagePlanning() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center text-gray-500">
          טוען...
        </div>
      }
    >
      <MortgagePlanningContent />
    </Suspense>
  );
}
