import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import { SITE_CONTACT } from '@/lib/site-contact';

/**
 * שורת התחתית הצנועה של המסכים הפנימיים: פרטי הקשר וקישורים למסמכים
 * המשפטיים. במסכים הציבוריים מופיע הפוטר המלא (components/ui/footer).
 */
export function SiteLegalStrip({ className = '' }: { className?: string }) {
  return (
    <footer
      dir="rtl"
      className={`border-t border-slate-200 bg-white px-4 py-4 text-2xs text-slate-500 sm:px-6 xl:px-8 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="font-bold text-slate-600">
            © {new Date().getFullYear()} {SITE_CONTACT.brand}
          </span>
          <a
            href={SITE_CONTACT.phoneHref}
            className="inline-flex items-center gap-1.5 hover:text-blue-700"
            aria-label={`טלפון: ${SITE_CONTACT.phone}`}
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            <span dir="ltr">{SITE_CONTACT.phone}</span>
          </a>
          <a
            href={SITE_CONTACT.emailHref}
            className="inline-flex items-center gap-1.5 hover:text-blue-700"
            aria-label={`אימייל: ${SITE_CONTACT.email}`}
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            <span dir="ltr">{SITE_CONTACT.email}</span>
          </a>
        </div>
        <nav aria-label="מסמכים משפטיים" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-blue-700">
            תנאי שימוש
          </Link>
          <Link href="/privacy" className="hover:text-blue-700">
            מדיניות פרטיות
          </Link>
        </nav>
      </div>
    </footer>
  );
}
