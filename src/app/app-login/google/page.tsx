import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { AuthLogo } from '@/components/auth/AuthPageParts';
import { isValidChallenge } from '@/lib/app-handoff';
import { safeCallbackUrl } from '@/lib/registration';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

/**
 * נפתח מהאפליקציה לנייד בדפדפן של המערכת: מתחבר עם Google, ובסוף חוזר
 * לאפליקציה דרך /api/auth/app-handoff. ראו src/lib/app-handoff.ts.
 */
export default async function AppGoogleLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const challenge = typeof params.challenge === 'string' ? params.challenge : '';
  const next = safeCallbackUrl(typeof params.next === 'string' ? params.next : null) ?? '/dashboard';
  const valid = isValidChallenge(challenge);
  const callbackUrl = `/api/auth/app-handoff?${new URLSearchParams({ challenge, next }).toString()}`;

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-10 sm:items-center sm:p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="mb-6 text-center">
            <AuthLogo />
            <h1 className="text-title font-bold text-slate-900">התחברות לאפליקציית משכלנתא</h1>
            <p className="mt-2 text-slate-600">
              {valid
                ? 'ממשיכים עם Google. בסוף תחזרו לאפליקציה מחוברים.'
                : 'הקישור הזה לא תקף. חזרו לאפליקציה ונסו להתחבר שוב.'}
            </p>
          </div>
          {valid && <GoogleAuthButton label="המשך עם Google" callbackUrl={callbackUrl} autoStart />}
        </div>
      </div>
    </div>
  );
}
