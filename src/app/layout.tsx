import './globals.css';
import localFont from 'next/font/local';
import { Providers } from '@/components/providers';
import { AccessibilityMenu } from '@/components/a11y/AccessibilityMenu';
import { NativeAppBridge } from '@/components/native-app/NativeAppBridge';
import { A11Y_BOOT_SCRIPT } from '@/components/a11y/a11yConfig';
import { PricingProvider } from '@/components/pricing/PricingProvider';
import { getPricing } from '@/lib/pricing-store';

/**
 * הגופן היחיד של הפלטפורמה, Assistant, כקובץ משתנה אחד (משקלים 200–800, עברית ולטינית)
 * שנמצא בפרויקט — בלי הורדה מ-Google Fonts בזמן הבנייה, שנכשלה ב-Vercel.
 * נחשף כמשתנה --font-assistant. רישיון: public/fonts/Assistant-OFL.txt
 */
const assistant = localFont({
  src: './fonts/Assistant-Variable.woff2',
  weight: '200 800',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // המחירים והמסלולים שהיועץ הגדיר — לכל עמודי האתר
  const pricing = await getPricing();
  return (
    // העדפות הנגישות מוסיפות מחלקות ל-html עוד לפני ההידרציה
    <html lang="he" dir="rtl" className={assistant.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT_SCRIPT }} />
      </head>
      <body>
        <NativeAppBridge />
        <AccessibilityMenu />
        <PricingProvider config={pricing}>
          <Providers>
            {children}
          </Providers>
        </PricingProvider>
      </body>
    </html>
  );
} 