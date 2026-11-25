import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'תמחור | משכלנתא',
  description:
    'גישה לפלטפורמה ב-₪49 לתהליך משכנתא, או מסלול בליווי יועץ משכנתאות משלב אחד ועד כל השלבים — המחיר נקבע לפי השלבים ומורכבות התיק, תמיד מתחת לממוצע בשוק, ומה ששולם על הפלטפורמה מקוזז.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
