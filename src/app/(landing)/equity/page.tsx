import { Suspense } from 'react';
import EquityPlanningTool from '@/components/equity-planning/EquityPlanningTool';
import { LandingShell } from '@/components/landing/LandingShell';
import { landingMetadata } from '@/components/landing/landingMetadata';

export const metadata = landingMetadata('equity');

export default function EquityLandingPage() {
  return (
    <LandingShell toolId="equity">
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <EquityPlanningTool />
      </Suspense>
    </LandingShell>
  );
}
