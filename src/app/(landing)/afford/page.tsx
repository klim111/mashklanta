import { Suspense } from 'react';
import { MortgagePlanningContent } from '@/components/mortgage-planning/MortgagePlanningTool';
import { LandingShell } from '@/components/landing/LandingShell';
import { landingMetadata } from '@/components/landing/landingMetadata';
import { getLandingContent } from '@/lib/landing-content-store';

export const generateMetadata = () => landingMetadata('affordability');

export default async function AffordLandingPage() {
  const content = await getLandingContent();
  return (
    <LandingShell toolId="affordability" content={content}>
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <MortgagePlanningContent entryFlow="affordability" />
      </Suspense>
    </LandingShell>
  );
}
