import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'כלי תכנון המשכנתא | משכלנתא',
  description: 'כלי תכנון חכם למשכנתא המשלב בינה מלאכותית ואלגוריתמים כלכליים מתקדמים. חישוב מחיר נכס מקסימלי, תכנון משכנתא לנכס קיים ועוד',
  keywords: ['תכנון משכנתא', 'מחשבון משכנתא', 'דירה ראשונה', 'דירה חליפית', 'דירה להשקעה', 'הון עצמי', 'יועץ משכנתא AI'],
  openGraph: {
    title: 'כלי תכנון המשכנתא | משכלנתא',
    description: 'כלי תכנון חכם למשכנתא המשלב בינה מלאכותית ואלגוריתמים כלכליים מתקדמים',
    type: 'website',
  }
};

export default function MortgagePlanningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
