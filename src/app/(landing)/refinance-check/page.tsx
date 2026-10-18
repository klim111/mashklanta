import MortgageRefinancePage from '@/app/mortgage-refinance/page';
import { LandingShell } from '@/components/landing/LandingShell';
import { landingMetadata } from '@/components/landing/landingMetadata';

export const metadata = landingMetadata('refinance');

/** אותו כלי מיחזור כמו בפלטפורמה: בדיקה מהירה לאורח, הכלי המלא למשתמש רשום */
export default function RefinanceLandingPage() {
  return (
    <LandingShell toolId="refinance">
      <MortgageRefinancePage />
    </LandingShell>
  );
}
