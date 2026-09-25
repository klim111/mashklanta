import './globals.css';
import { Assistant } from 'next/font/google';
import { Providers } from '@/components/providers';
import { AccessibilityMenu } from '@/components/a11y/AccessibilityMenu';
import { A11Y_BOOT_SCRIPT } from '@/components/a11y/a11yConfig';
import { Analytics } from '@vercel/analytics/next';

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
    // העדפות הנגישות מוסיפות מחלקות ל-html עוד לפני ההידרציה
    <html lang="he" dir="rtl" className={assistant.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT_SCRIPT }} />
      </head>
      <body>
        <AccessibilityMenu />
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
} 