import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { advisorInbox } from '@/lib/conversation-store';

/** תיבת ההודעות של היועץ — כל השיחות עם הלקוחות שלו ועם לקוחות שעדיין לא שויכו */
export async function GET() {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await advisorInbox(advisorId));
}
