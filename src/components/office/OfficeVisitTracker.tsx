'use client';

import { useEffect } from 'react';
import { OFFICE_COOKIE, OFFICE_COOKIE_DAYS } from '@/lib/office';

/**
 * שומר בדפדפן את המשרד שדרכו הגולש הגיע. מי שנרשם אחר כך — גם אם עבר בדרך
 * לכלי חינמי — משויך ליועץ של המשרד (src/lib/advisor-link.ts). המשרד האחרון
 * שביקר בו קובע.
 */
export function rememberOffice(slug: string) {
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${OFFICE_COOKIE}=${encodeURIComponent(slug)}; Max-Age=${
      OFFICE_COOKIE_DAYS * 24 * 3600
    }; Path=/; SameSite=Lax${secure}`;
  } catch {
    // דפדפן שחוסם עוגיות: הגולש פשוט ישויך ליועץ של הפלטפורמה
  }
}

export function OfficeVisitTracker({ slug }: { slug: string }) {
  useEffect(() => {
    rememberOffice(slug);
  }, [slug]);
  return null;
}
