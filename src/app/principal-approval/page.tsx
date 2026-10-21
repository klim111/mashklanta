import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { PrincipalApproval } from '@/components/principal-approval/PrincipalApproval';

export const metadata = {
  title: 'אישור עקרוני — איסוף פרטי הבקשה',
  description: 'איסוף ושמירה של כל פרטי הלווים, ההכנסות, החשבונות ומקורות המימון לקראת אישור עקרוני',
};

export const dynamic = 'force-dynamic';

/** Client-side view of the principal-approval intake. */
export default async function PrincipalApprovalPage() {
  const session = await getServerAuth();
  if (!session?.user) redirect('/auth/login?callbackUrl=/principal-approval');
  return <PrincipalApproval />;
}
