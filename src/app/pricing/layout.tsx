import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'תמחור | משכלתנא',
  description:
    'כל שלב במשכנתא מתומחר בנפרד. מסלול עצמאי ב-₪120 לחודש, ליווי מלא ב-₪6,000, או שילוב חופשי — משלמים רק על השלבים שהיועץ מבצע.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
