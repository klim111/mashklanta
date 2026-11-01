'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CreditCard, Home, Loader2, RefreshCw } from 'lucide-react';

interface PlanRow {
  id: string;
  name: string;
  kind: 'NEW' | 'REFINANCE' | string;
  updatedAt: string;
}

/**
 * תיק לקוח מתעניין — בחירת הכלי (src/lib/prospect-client.ts).
 *
 * העמוד נפתח בחלון שבו היועץ עובד בשם הלקוח, בתוך הפגישה או בלשונית: משכנתא
 * חדשה פותחת את חמשת השלבים, מיחזור את כלי המיחזור, וליווי כלכלת המשפחה את
 * תכנון ההלוואות הצרכניות. כל מה שמוזן נשמר בחשבון של הלקוח, וכשהוא יירשם
 * הוא יראה אותו אצלו.
 */
export default function ClientFilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const acting = Boolean(session?.user?.actingAdvisorId);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let alive = true;
    fetch('/api/plans', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: PlanRow[]) => alive && setPlans(Array.isArray(rows) ? rows : []))
      .catch(() => alive && setPlans([]));
    return () => {
      alive = false;
    };
  }, [status]);

  // לקוח רגיל שהגיע לכאן — לאזור האישי שלו
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/login');
    else if (status === 'authenticated' && !acting) router.replace('/dashboard');
  }, [status, acting, router]);

  const newMortgage = plans?.find((plan) => plan.kind !== 'REFINANCE') ?? null;

  const openMortgage = async () => {
    if (newMortgage) {
      router.push(`/dashboard/plans/${newMortgage.id}`);
      return;
    }
    setOpening(true);
    setError(null);
    const response = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'משכנתא חדשה' }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    if (!response?.ok || !body?.id) {
      setOpening(false);
      setError(body?.error ?? 'לא הצלחנו לפתוח את התהליך. נסו שוב');
      return;
    }
    router.push(`/dashboard/plans/${body.id}`);
  };

  if (status !== 'authenticated' || !acting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 pb-24 pt-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold text-emerald-700">תיק לקוח מתעניין</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">{session?.user?.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          בחרו במה עובדים. כל מה שתזינו נשמר בתיק של הלקוח, וכשהוא יירשם לפלטפורמה עם המייל שרשום בתיק, הוא יראה את
          הכול באזור האישי שלו.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <PathCard
            icon={<Home className="h-7 w-7" />}
            title="משכנתא חדשה"
            text="חמשת השלבים: ניתוח, בקשות, תמהיל, מכרז וחתימה"
            action={newMortgage ? 'להמשך התהליך' : 'פתיחת תהליך'}
            busy={opening}
            onClick={() => void openMortgage()}
          />
          <PathCard
            icon={<RefreshCw className="h-7 w-7" />}
            title="מיחזור"
            text="כלי המיחזור: המשכנתא הקיימת מול מה שאפשר לקבל היום"
            action="לכלי המיחזור"
            href="/mortgage-refinance"
          />
          <PathCard
            icon={<CreditCard className="h-7 w-7" />}
            title="ליווי כלכלת המשפחה"
            text="תכנון ההלוואות הצרכניות: איחוד, פריסה וסגירה מוקדמת"
            action="לתכנון ההלוואות"
            href="/consumer-loans"
          />
        </div>

        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}

        {plans && plans.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-black text-slate-700">התהליכים בתיק</h2>
            <div className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {plans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/dashboard/plans/${plan.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
                >
                  <span className="font-bold text-slate-800">
                    {plan.name} · {plan.kind === 'REFINANCE' ? 'מיחזור' : 'משכנתא חדשה'}
                  </span>
                  <ArrowLeft className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 text-xs text-slate-500">
          כפתור &quot;כלים&quot; בפינה פותח כל כלי אחר, כמו בונה התמהילים, גם הוא שומר בתיק.
        </p>
      </div>
    </main>
  );
}

function PathCard({
  icon,
  title,
  text,
  action,
  href,
  onClick,
  busy,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action: string;
  href?: string;
  onClick?: () => void;
  busy?: boolean;
}) {
  const body = (
    <>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
        {icon}
      </span>
      <span className="mt-4 block text-xl font-black text-slate-900">{title}</span>
      <span className="mt-1 block text-sm text-slate-600">{text}</span>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-emerald-700">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {action}
        <ArrowLeft className="h-4 w-4" />
      </span>
    </>
  );
  const className =
    'group block rounded-3xl border border-slate-200 bg-white p-5 text-right shadow-sm transition-colors hover:border-emerald-300';
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" disabled={busy} onClick={onClick} className={`${className} w-full disabled:opacity-60`}>
      {body}
    </button>
  );
}
