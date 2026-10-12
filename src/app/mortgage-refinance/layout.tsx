import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'מיחזור משכנתא קיימת | משכלנתא',
  description: 'מיחזור משכנתא קיימת — הזנת פרטי המשכנתא הנוכחית ובדיקה מול ריביות בנק ישראל. כלים מתקדמים לניתוח אפשרויות מיחזור',
  keywords: ['מיחזור משכנתא', 'דוח יתרות לסילוק', 'הקטנת תשלום חודשי', 'קיצור תקופת משכנתא', 'אופטימיזציה משכנתא'],
};

export default function MortgageRefinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
