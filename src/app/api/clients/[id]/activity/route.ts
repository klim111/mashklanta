import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { getClientActivity } from '@/lib/client-activity';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** סיכום הפעילות של הלקוח — לטאב "סיכום פעילות" ולוח הבקרה שבדף הלקוח אצל היועץ */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const activity = await getClientActivity(advisorId, id);
  if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(activity);
}
