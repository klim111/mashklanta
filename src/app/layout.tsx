import './globals.css';
import { Providers } from '@/components/providers';

export const metadata = {
  title: 'Nadlanium - מחשבון משכנתא חכם',
  description: 'מחשבון משכנתא מתקדם עם ניהול מסמכים וניתוח נתונים',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
} 