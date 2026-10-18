import { Suspense } from 'react';
import { MortgagePlanningContent } from '@/components/mortgage-planning/MortgagePlanningTool';
import { LandingShell } from '@/components/landing/LandingShell';
import { landingMetadata } from '@/components/landing/landingMetadata';

export const metadata = landingMetadata('affordability');

export default function AffordLandingPage() {
  return (
    <LandingShell toolId="affordability">
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <MortgagePlanningContent entryFlow="affordability" />
      </Suspense>
    </LandingShell>
  );
}
