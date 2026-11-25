import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { DOCUMENTS_LOCKED_MESSAGE, documentsLockedFor } from '@/lib/plan-documents-lock';
import {
  deletePlanDocument,
  planDocumentFailure,
  updatePlanDocumentMeta,
} from '@/lib/plan-documents';

interface RouteContext {
  params: Promise<{ id: string; docId: string }>;
}

/** הסרת מסמך שהועלה — רק בעל התהליך */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, docId } = await params;
  if (await documentsLockedFor(userId, id)) return NextResponse.json({ error: DOCUMENTS_LOCKED_MESSAGE, locked: true }, { status: 402 });
  if (!(await deletePlanDocument(userId, id, docId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/** שיוך המסמך לקטגוריה ולשלב — רק בעל התהליך */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, docId } = await params;
  const body = await req.json().catch(() => null);
  try {
    if (await documentsLockedFor(userId, id)) return NextResponse.json({ error: DOCUMENTS_LOCKED_MESSAGE, locked: true }, { status: 402 });
    const document = await updatePlanDocumentMeta(userId, id, docId, {
      category: typeof body?.category === 'string' ? body.category : null,
      stage: typeof body?.stage === 'string' ? body.stage : null,
    });
    if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(document);
  } catch (error) {
    console.error('[plan-documents] update failed', error);
    const failure = planDocumentFailure(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
