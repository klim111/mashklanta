'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useDemoRequest } from '@/demo/store';
import { frameMode } from '@/components/frame-mode/frameMode';
import { GA_MEASUREMENT_ID } from '@/lib/gtag';
import { isStaffDevice } from '@/lib/staff-device';

/**
 * התג של Google Analytics. כמו מונה הביקורים הפנימי, הוא לא נטען אצל היועץ
 * (גם לא בדפדפן שהיועץ התחבר ממנו, src/lib/staff-device.ts) ולא בהדגמה עם הנתונים הבדויים. מעברים בין עמודים בתוך האתר נספרים ב-GA4
 * עצמו (מדידה משופרת של שינויי היסטוריה בדפדפן).
 */
export function GoogleAnalytics() {
  const { data: session, status } = useSession();
  const demo = useDemoRequest();
  // הסימון נקרא אחרי הטעינה בדפדפן, כדי שהשרת והדפדפן יציגו את אותו דבר
  const [staff, setStaff] = useState<boolean | null>(null);
  useEffect(() => setStaff(isStaffDevice()), [session?.user?.role]);

  if (!GA_MEASUREMENT_ID || demo || frameMode() || status === 'loading' || staff !== false || session?.user?.role === 'ADVISOR') {
    return null;
  }

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
