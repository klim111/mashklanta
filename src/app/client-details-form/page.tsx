import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { ClientIntakeForm } from '@/components/principal-approval/ClientIntakeForm';

export const metadata = {
  title: 'טופס פרטי הלקוח',
  description: 'כל הפרטים לבקשת המשכנתא בטופס אחד: לווים והכנסות, הלוואה ונכס, מקורות מימון, חשבונות בנק וערבים',
};

export const dynamic = 'force-dynamic';

/**
 * טופס פרטי הלקוח. היועץ שולח ללקוח קישור לכאן מתוך דף הלקוח; לקוח שלא מחובר
 * עובר קודם לכניסה וחוזר ישר לטופס.
 *
 * יועץ שפותח את הקישור עם `?client=<Client.id>` רואה את הטופס של אותו לקוח.
 */
export default async function ClientDetailsFormPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const session = await getServerAuth();
  if (!session?.user) redirect('/auth/login?callbackUrl=/client-details-form');

  const { client } = await searchParams;
  if (session.user.role === 'ADVISOR') {
    if (client) return <ClientIntakeForm clientRecordId={client} />;
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center" dir="rtl">
        <h1 className="text-subtitle font-bold text-slate-900">הטופס הזה מיועד ללקוח</h1>
        <p className="mt-2 text-base text-slate-600">
          כדי לראות מה לקוח מילא, פתחו את דף הלקוח באזור היועץ ולחצו "צפייה בדוח המסכם".
        </p>
        <Link href="/advisor-dashboard" className="mt-5 inline-block font-semibold text-blue-600 hover:underline">
          לאזור היועץ
        </Link>
      </div>
    );
  }
  return <ClientIntakeForm />;
}
