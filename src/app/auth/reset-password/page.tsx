import { resetTokenIsValid } from '@/lib/password-reset';
import { ResetPasswordForm } from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

/** העמוד שנפתח מהקישור במייל "שכחתי סיסמה" */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : '';
  const valid = token ? await resetTokenIsValid(token).catch(() => false) : false;
  return <ResetPasswordForm token={token} initiallyValid={valid} />;
}
