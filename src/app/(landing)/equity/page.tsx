import { Suspense } from 'react';
import EquityPlanningTool from '@/components/equity-planning/EquityPlanningTool';
import { LandingShell } from '@/components/landing/LandingShell';
import { landingMetadata } from '@/components/landing/landingMetadata';
import { getLandingContent } from '@/lib/landing-content-store';

export const generateMetadata = () => landingMetadata('equity');

export default async function EquityLandingPage() {
  const content = await getLandingContent();
  return (
    <LandingShell toolId="equity" content={content}>
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <EquityPlanningTool />
      </Suspense>
    </LandingShell>
  );
}
