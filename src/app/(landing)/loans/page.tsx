import { Suspense } from 'react';
import { LoanWorkspace } from '@/components/consumer-loans/LoanWorkspace';
import { LandingShell } from '@/components/landing/LandingShell';
import { landingMetadata } from '@/components/landing/landingMetadata';
import { getLandingContent } from '@/lib/landing-content-store';

export const generateMetadata = () => landingMetadata('loans');

export default async function LoansLandingPage() {
  const content = await getLandingContent();
  return (
    <LandingShell toolId="loans" content={content}>
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <LoanWorkspace />
      </Suspense>
    </LandingShell>
  );
}
