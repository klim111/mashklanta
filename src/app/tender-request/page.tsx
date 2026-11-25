import Link from 'next/link';
import { getServerAuth } from '@/lib/auth';
import { ClientIntakeForm } from '@/components/principal-approval/ClientIntakeForm';

export const metadata = {
  title: 'הגישו בקשות לכל הבנקים — מכרז ריביות',
  description: 'ממלאים פעם אחת את הפרטים, ומשכלנתא עושה מכרז ריביות מול כל הבנקים. הבדיקה בחינם, ומשלמים רק אחרי שהושגו הריביות.',
};

export const dynamic = 'force-dynamic';

/**
 * בקשה מהעמוד הראשי (src/lib/principal-approval/intake-request.ts). לקוח מחובר
 * ממלא את התיק שלו; מבקר שלא מחובר ממלא בדפדפן, ובשליחה נפתח לו תיק אצל היועץ.
 */
export default async function Page() {
  const session = await getServerAuth();
  if (session?.user?.role === 'ADVISOR') {
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center" dir="rtl">
        <h1 className="text-subtitle font-bold text-slate-900">הטופס הזה מיועד ללקוחות</h1>
        <p className="mt-2 text-base text-slate-600">בקשות שנשלחו ממנו מופיעות אצלכם ברשימת הלקוחות.</p>
        <Link href="/advisor-dashboard" className="mt-5 inline-block font-semibold text-blue-600 hover:underline">
          לאזור היועץ
        </Link>
      </div>
    );
  }
  return <ClientIntakeForm mode="TENDER" local={!session?.user} />;
}
