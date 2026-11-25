import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import {
  advisorOwnsClient,
  createAdvisorNote,
  listClientNotes,
  listSharedNotesForUser,
} from '@/lib/advisor';
import { asPlanStage } from '@/lib/advisor-crm';

/**
 * ההערות בשלבי הלקוח.
 *
 * ליועץ מוחזרות כל ההערות של הלקוח שביקש, כולל האישיות. ללקוח מוחזרות אך ורק
 * ההערות שהיועץ בחר לשלוח אליו — הערה אישית לעולם אינה עוזבת את צד היועץ.
 */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json(await listSharedNotesForUser(userId));
  }

  const clientId = req.nextUrl.searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ error: 'נדרש מזהה לקוח' }, { status: 400 });
  if (!(await advisorOwnsClient(userId, clientId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(await listClientNotes(clientId));
}

/** כתיבת הערה בשלב. `visibility` הוא הבחירה בין הערה אישית לשליחה ללקוח */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const clientId = typeof body?.clientId === 'string' ? body.clientId : '';
  const stage = asPlanStage(body?.stage);
  const text = typeof body?.body === 'string' ? body.body.trim() : '';

  if (!clientId || !stage || !text) {
    return NextResponse.json({ error: 'נדרשים לקוח, שלב ותוכן להערה' }, { status: 400 });
  }

  const note = await createAdvisorNote({
    advisorId,
    clientId,
    stage,
    body: text,
    visibility: body?.visibility === 'SHARED' ? 'SHARED' : 'PRIVATE',
  });

  if (!note) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(note, { status: 201 });
}
