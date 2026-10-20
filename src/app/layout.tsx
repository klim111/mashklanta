import './globals.css';
import { Assistant } from 'next/font/google';
import { Providers } from '@/components/providers';
import { AccessibilityMenu } from '@/components/a11y/AccessibilityMenu';
import { A11Y_BOOT_SCRIPT } from '@/components/a11y/a11yConfig';
import { PricingProvider } from '@/components/pricing/PricingProvider';
import { getPricing } from '@/lib/pricing-store';
import { getSiteContent } from '@/lib/site-content-store';
import { SiteContentRuntime } from '@/components/site-content/SiteContentRuntime';
import { SiteBanners } from '@/components/site-content/SiteBanners';
import { SITE_CONTENT_BOOT_STYLE, siteContentBootScript } from '@/components/site-content/siteContentBoot';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // המחירים והמסלולים שהיועץ הגדיר — לכל עמודי האתר
  const pricing = await getPricing();
  // הטקסטים שהיועץ החליף והבאנרים שהגדיר ב"תוכן האתר" — לכל עמודי האתר
  const siteContent = await getSiteContent();
  const siteContentBoot = siteContentBootScript(siteContent);
  return (
    // העדפות הנגישות מוסיפות מחלקות ל-html עוד לפני ההידרציה
    <html lang="he" dir="rtl" className={assistant.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT_SCRIPT }} />
        {siteContentBoot && (
          <>
            <style dangerouslySetInnerHTML={{ __html: SITE_CONTENT_BOOT_STYLE }} />
            <script dangerouslySetInnerHTML={{ __html: siteContentBoot }} />
          </>
        )}
      </head>
      <body>
        <AccessibilityMenu />
        <PricingProvider config={pricing}>
          <Providers>
            <SiteBanners content={siteContent} placement="top" />
            {children}
            <SiteBanners content={siteContent} placement="bottom" />
            <SiteBanners content={siteContent} placement="popup" />
          </Providers>
          <SiteContentRuntime content={siteContent} />
        </PricingProvider>
      </body>
    </html>
  );
} 