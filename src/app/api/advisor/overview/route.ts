import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { getAdvisorOverview } from '@/lib/advisor';

/** תמונת המצב של ראש לוח הבקרה: מונים, סדר היום והפגישות הקרובות */
export async function GET() {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(await getAdvisorOverview(advisorId));
}
