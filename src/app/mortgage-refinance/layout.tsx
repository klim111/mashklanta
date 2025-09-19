import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'מיחזור משכנתא קיימת | משכלנתא',
  description: 'מיחזור משכנתא קיימת - סריקת דוח יתרות לסילוק או הזנה ידנית של פרטי המשכנתא הנוכחית. כלים מתקדמים לניתוח אפשרויות מיחזור',
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
