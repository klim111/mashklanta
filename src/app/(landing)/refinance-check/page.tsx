import MortgageRefinancePage from '@/app/mortgage-refinance/page';
import { LandingShell } from '@/components/landing/LandingShell';
import { landingMetadata } from '@/components/landing/landingMetadata';
import { getLandingContent } from '@/lib/landing-content-store';

export const generateMetadata = () => landingMetadata('refinance');

/** אותו כלי מיחזור כמו בפלטפורמה: בדיקה מהירה לאורח, הכלי המלא למשתמש רשום */
export default async function RefinanceLandingPage() {
  const content = await getLandingContent();
  return (
    <LandingShell toolId="refinance" content={content}>
      <MortgageRefinancePage />
    </LandingShell>
  );
}
