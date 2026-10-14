import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { listDepartedClients } from '@/lib/account-deletion';

/** לקוחות שהסירו את החשבון, עם רשומות התשלום שנשמרו מהם */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ clients: await listDepartedClients(userId) });
}
