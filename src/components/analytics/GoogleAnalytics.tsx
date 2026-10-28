'use client';

import Script from 'next/script';
import { useSession } from 'next-auth/react';
import { useDemoRequest } from '@/demo/store';
import { GA_MEASUREMENT_ID } from '@/lib/gtag';

/**
 * התג של Google Analytics. כמו מונה הביקורים הפנימי, הוא לא נטען אצל היועץ
 * ולא בהדגמה עם הנתונים הבדויים. מעברים בין עמודים בתוך האתר נספרים ב-GA4
 * עצמו (מדידה משופרת של שינויי היסטוריה בדפדפן).
 */
export function GoogleAnalytics() {
  const { data: session, status } = useSession();
  const demo = useDemoRequest();

  if (!GA_MEASUREMENT_ID || demo || status === 'loading' || session?.user?.role === 'ADVISOR') return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
