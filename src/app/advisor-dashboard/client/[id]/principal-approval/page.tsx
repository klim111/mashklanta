import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { PrincipalApproval } from '@/components/principal-approval/PrincipalApproval';

export const dynamic = 'force-dynamic';

/**
 * Advisor-side view of a client's principal-approval file.
 * The route parameter is the `Client` record id, matching the sibling advisor
 * screens under /advisor-dashboard/client/[id].
 */
export default async function AdvisorPrincipalApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerAuth();
  const { id } = await params;
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=/advisor-dashboard/client/${id}/principal-approval`);
  }
  return <PrincipalApproval clientRecordId={id} />;
}
