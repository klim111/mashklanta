'use client';

import type { ReactNode } from 'react';
import { Calculator, CreditCard, ExternalLink, FolderOpen, Home, RefreshCw } from 'lucide-react';
import { actFrameName, actFrameUrl } from '@/components/frame-mode/frameMode';

/** פותח את תיק הלקוח המתעניין בלשונית שבה היועץ עובד בשם הלקוח (src/lib/act-as.ts) */
export function openProspectWindow(clientId: string, path = '/dashboard/client-file') {
  window.open(actFrameUrl(clientId, path), actFrameName(clientId));
}

/**
 * הכרטיס של לקוח מתעניין בדף הלקוח: שלושת המסלולים — משכנתא חדשה, מיחזור
 * וליווי כלכלת המשפחה — ובונה התמהילים. כל אחד נפתח בלשונית של התיק, שבה
 * הפלטפורמה נראית כמו אצל לקוח רשום, וכל מה שמוזן נשמר תחת הלקוח.
 */
export function ProspectFileCard({ clientId, email }: { clientId: string; email: string }) {
  const button = (icon: ReactNode, label: string, path: string) => (
    <button
      type="button"
      onClick={() => openProspectWindow(clientId, path)}
      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-sm font-black text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50"
    >
      {icon}
      {label}
      <ExternalLink className="h-3.5 w-3.5 text-emerald-500" />
    </button>
  );

  return (
    <section dir="rtl" className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5">
      <p className="flex items-center gap-2 text-sm font-black text-emerald-900">
        <FolderOpen className="h-4 w-4" />
        תיק לקוח מתעניין · עדיין לא נרשם
      </p>
      <p className="mt-1 text-sm text-emerald-900/80">
        הכלים נפתחים בלשונית של התיק, כמו שהלקוח יראה אותם. מה שתזינו נשמר כאן.{' '}
        {email
          ? `כשהלקוח יירשם עם ${email}, התיק יעבור לחשבון שלו.`
          : 'הוסיפו לתיק מייל, כדי שהתיק יעבור ללקוח כשיירשם.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {button(<Home className="h-4 w-4" />, 'משכנתא חדשה', '/dashboard/client-file')}
        {button(<RefreshCw className="h-4 w-4" />, 'מיחזור', '/mortgage-refinance')}
        {button(<CreditCard className="h-4 w-4" />, 'ליווי כלכלת המשפחה', '/consumer-loans')}
        {button(<Calculator className="h-4 w-4" />, 'בונה התמהילים', '/mortgage-advisor')}
      </div>
    </section>
  );
}
