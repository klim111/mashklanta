import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { listAdvisorRequests } from '@/lib/advisor-order-store';

/** בקשות הליווי ששולמו ומופנות ליועץ המחובר */
export async function GET(_req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(await listAdvisorRequests(advisorId));
}
