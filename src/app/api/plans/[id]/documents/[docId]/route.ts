import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { deletePlanDocument } from '@/lib/plan-documents';

interface RouteContext {
  params: Promise<{ id: string; docId: string }>;
}

/** הסרת מסמך שהועלה — רק בעל התהליך */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { docId } = await params;
  if (!(await deletePlanDocument(userId, docId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
