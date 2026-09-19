import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'תמחור | משכלתנא',
  description:
    'כל שלב במשכנתא מתומחר בנפרד. גישה לפלטפורמה ב-₪49 לחודש, ליווי מלא ב-₪6,000, או ליווי משולב לשלבים שתבחרו — מה ששולם על הפלטפורמה מקוזז, ותמיד משלמים את המחיר הנמוך.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
