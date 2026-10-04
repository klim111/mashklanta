'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDemoRequest } from '@/demo/store';
import { deviceFromWidth } from '@/lib/site-analytics';
import { randomTrackingId, visitSessionId, visitorId } from '@/lib/visitor-ids';

/**
 * עמודים שלא נספרים: צד היועץ, הכניסה הנסתרת של היועץ (שהכתובת שלה לא תופיע
 * בטבלה), וההדגמה עם הנתונים הבדויים
 */
const IGNORED_PREFIXES = [
  '/advisor-dashboard',
  '/auth/team-entry',
  '/auth/advisor-verify',
  '/demo',
  '/video-call',
];

function send(body: Record<string, unknown>) {
  const payload = JSON.stringify(body);
  try {
    // ביציאה מהעמוד רק sendBeacon מובטח שיגיע
    if (body.type === 'duration' && navigator.sendBeacon?.('/api/track/visit', payload)) return;
  } catch {
    // נופלים ל-fetch
  }
  fetch('/api/track/visit', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
}

/**
 * רושם כל עמוד שנפתח באתר וכמה זמן היה גלוי למבקר, לדאשבורד הביקורים של
 * היועץ. זמן שבו הלשונית ברקע לא נספר. היועץ עצמו לא נספר.
 */
export function SiteVisitTracker() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const demo = useDemoRequest();
  const role = session?.user?.role;

  useEffect(() => {
    if (!pathname || demo || status === 'loading' || role === 'ADVISOR') return;
    if (IGNORED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return;

    const id = randomTrackingId();
    const vid = visitorId();
    const sid = visitSessionId();

    // מקור ההגעה נשמר רק בעמוד הראשון של הביקור
    let referrer = '';
    try {
      if (!window.sessionStorage.getItem('mk_ref_sent')) {
        referrer = document.referrer;
        window.sessionStorage.setItem('mk_ref_sent', '1');
      }
    } catch {
      referrer = document.referrer;
    }

    send({
      type: 'start',
      id,
      visitorId: vid,
      sessionId: sid,
      path: pathname,
      referrer,
      device: deviceFromWidth(window.innerWidth),
    });

    let visibleMs = 0;
    let visibleSince: number | null = document.visibilityState === 'visible' ? performance.now() : null;
    let lastSent = 0;

    const flush = () => {
      if (visibleSince !== null) {
        visibleMs += performance.now() - visibleSince;
        visibleSince = null;
      }
      const durationMs = Math.round(visibleMs);
      if (durationMs > lastSent) {
        lastSent = durationMs;
        send({ type: 'duration', id, visitorId: vid, durationMs });
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
      else if (visibleSince === null) visibleSince = performance.now();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [pathname, demo, status, role]);

  return null;
}
