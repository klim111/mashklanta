import { DigitalOfficeLanding } from '@/components/landing/DigitalOfficeLanding';
import { landingMetadata } from '@/components/landing/landingMetadata';
import { getLandingContent } from '@/lib/landing-content-store';

export const generateMetadata = () => landingMetadata('office');

export default async function DigitalOfficePage() {
  return <DigitalOfficeLanding content={await getLandingContent()} />;
}
