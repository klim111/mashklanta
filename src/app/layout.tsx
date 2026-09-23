import './globals.css';
import { Assistant } from 'next/font/google';
import { Providers } from '@/components/providers';

// הגופן היחיד של הפלטפורמה. נטען מקומית בזמן הבנייה ונחשף כמשתנה --font-assistant
const assistant = Assistant({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-assistant',
});

export const metadata = {
  title: 'משכלנתא - מחשבון משכנתא חכם',
  description: 'מחשבון משכנתא מתקדם עם ניהול מסמכים וניתוח נתונים',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={assistant.variable}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
} 