import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { PrincipalApproval } from '@/components/principal-approval/PrincipalApproval';

export const dynamic = 'force-dynamic';

/** Advisor-side view of a specific client's principal-approval file. */
export default async function AdvisorPrincipalApprovalPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getServerAuth();
  const { clientId } = await params;
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=/advisor/clients/${clientId}/principal-approval`);
  }
  return <PrincipalApproval clientId={clientId} />;
}
