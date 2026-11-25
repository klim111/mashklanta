import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { deleteAdvisorNote, setNoteVisibility } from '@/lib/advisor';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** שליחת הערה אישית ללקוח, או החזרתה להערה אישית */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (body?.visibility !== 'SHARED' && body?.visibility !== 'PRIVATE') {
    return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
  }

  const note = await setNoteVisibility(advisorId, id, body.visibility);
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(note);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const removed = await deleteAdvisorNote(advisorId, id);
  if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
