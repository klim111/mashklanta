import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { ClientIntakeReport } from '@/components/principal-approval/ClientIntakeReport';

export const dynamic = 'force-dynamic';

/** הדוח המסכם של טופס פרטי הלקוח, באזור היועץ. הפרמטר הוא `Client.id` */
export default async function AdvisorClientDetailsReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerAuth();
  const { id } = await params;
  if (!session?.user) redirect(`/auth/login?callbackUrl=/advisor-dashboard/client/${id}/client-details`);
  if (session.user.role !== 'ADVISOR') redirect('/dashboard');
  return <ClientIntakeReport clientRecordId={id} />;
}
