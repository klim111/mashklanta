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
  title: 'משכלנתא - הפלטפורמה המתקדמת בארץ לניתוח וניהול משכנתאות',
  description:
    'הפלטפורמה המתקדמת בארץ לניתוח וניהול משכנתאות: תכנון, בניית תמהיל, השוואת אישורים עקרוניים וליווי יועץ עד החתימה בבנק.',
  openGraph: {
    title: 'משכלנתא - הפלטפורמה המתקדמת בארץ לניתוח וניהול משכנתאות',
    description:
      'הפלטפורמה המתקדמת בארץ לניתוח וניהול משכנתאות: תכנון, בניית תמהיל, השוואת אישורים עקרוניים וליווי יועץ עד החתימה בבנק.',
    siteName: 'משכלנתא',
    locale: 'he_IL',
    type: 'website',
  },
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