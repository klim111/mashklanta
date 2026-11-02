import { resetTokenIsValid } from '@/lib/password-reset';
import { ResetPasswordForm } from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

/** העמוד שנפתח מהקישור במייל "שכחתי סיסמה", או מפרטי הכניסה שהיועץ שלח */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; invite?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : '';
  const valid = token ? await resetTokenIsValid(token).catch(() => false) : false;
  // invite=1 — קישור לכניסה ראשונה שהיועץ שלח (src/lib/client-invite.ts)
  return <ResetPasswordForm token={token} initiallyValid={valid} invite={params.invite === '1'} />;
}
