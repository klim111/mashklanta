import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'הצהרת נגישות | משכלנתא',
  description:
    'הצהרת הנגישות של משכלנתא: ההתאמות שבוצעו באתר לפי תקן ישראלי 5568, תפריט הנגישות, מגבלות ידועות ופרטי רכז הנגישות.',
};

export default function AccessibilityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
