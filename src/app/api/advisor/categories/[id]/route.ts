import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { deleteMixCategory } from '@/lib/advisor';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** מחיקת קטגוריה. התמהילים שהיו בה נשארים, ועוברים ל"ללא קטגוריה" */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const removed = await deleteMixCategory(advisorId, id);
  if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
