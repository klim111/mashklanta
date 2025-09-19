import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'פעולות על משכנתא קיימת | משכלנתא',
  description: 'מיחזור משכנתא קיימת וגרירת משכנתא - שפר את תנאי המשכנתא שלך או העבר אותה לנכס חדש. כלים מתקדמים לאופטימיזציה של המשכנתא הקיימת שלך',
  keywords: ['מיחזור משכנתא', 'גרירת משכנתא', 'משכנתא קיימת', 'אופטימיזציה משכנתא', 'הקטנת תשלום חודשי', 'קיצור תקופת משכנתא'],
};

export default function ExistingMortgageLayout({
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
