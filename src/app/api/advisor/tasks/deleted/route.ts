import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { listDeletedAdvisorTasks } from '@/lib/advisor';

/** רישום המשימות שהיועץ מחק */
export async function GET() {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(await listDeletedAdvisorTasks(advisorId));
}
