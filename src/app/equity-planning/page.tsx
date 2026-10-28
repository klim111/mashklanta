'use client';

import { Suspense } from 'react';
import NavBar from '@/components/ui/navbar';
import EquityPlanningTool from '@/components/equity-planning/EquityPlanningTool';

export default function EquityPlanningPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm">
        <NavBar />
      </div>

      {/* קישור החזרה קורא את ?fromPlan מהכתובת — ולכן צריך גבול Suspense */}
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <EquityPlanningTool />
      </Suspense>
    </div>
  );
}
