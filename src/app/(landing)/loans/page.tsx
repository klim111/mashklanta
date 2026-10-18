import { Suspense } from 'react';
import { LoanWorkspace } from '@/components/consumer-loans/LoanWorkspace';
import { LandingShell } from '@/components/landing/LandingShell';
import { landingMetadata } from '@/components/landing/landingMetadata';

export const metadata = landingMetadata('loans');

export default function LoansLandingPage() {
  return (
    <LandingShell toolId="loans">
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <LoanWorkspace />
      </Suspense>
    </LandingShell>
  );
}
