'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AdvisorBackBar, countAdvisorVisit } from './AdvisorBackBar';

const ROOT = '/advisor-dashboard';

/** לאן "חזרה" מובילה כשאין עמוד קודם בהיסטוריה (קישור שנפתח בלשונית חדשה) */
export function parentOf(pathname: string): string {
  const client = pathname.match(/^\/advisor-dashboard\/client\/([^/]+)(\/.*)?$/);
  if (client) {
    return client[2] ? `${ROOT}/client/${client[1]}` : `${ROOT}?section=clients`;
  }
  if (pathname.startsWith(`${ROOT}/tools`)) return `${ROOT}?section=tools`;
  return ROOT;
}

/**
 * המסגרת של אזור היועץ. מציבה את advisor-type על <html> — כך גם חלונות
 * ותפריטים שנפתחים מחוץ לעמוד מקבלים את הכיתוב המוגדל — ומוסיפה את שורת
 * החזרה בכל מסך פנימי. הלוח הראשי מציג את הכפתורים בעצמו (AdvisorShell).
 */
export function AdvisorPageFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ROOT;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('advisor-type');
    return () => root.classList.remove('advisor-type');
  }, []);

  useEffect(() => {
    countAdvisorVisit();
  }, [pathname]);

  const inner = pathname !== ROOT && pathname !== `${ROOT}/`;
  return (
    <div className="advisor-type">
      {inner && <AdvisorBackBar fallbackHref={parentOf(pathname)} />}
      {children}
    </div>
  );
}
