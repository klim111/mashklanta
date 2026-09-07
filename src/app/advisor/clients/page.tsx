import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { AdvisorClientList } from '@/components/principal-approval/AdvisorClientList';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'הלקוחות שלי — צד היועץ',
};

export default async function AdvisorClientsPage() {
  const session = await getServerAuth();
  if (!session?.user) redirect('/auth/login?callbackUrl=/advisor/clients');
  return <AdvisorClientList />;
}
