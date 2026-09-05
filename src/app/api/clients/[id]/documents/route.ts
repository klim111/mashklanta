import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { findAccessibleClient } from '@/lib/clients';
import { DOCUMENT_STATUSES } from '@/lib/client-process';
import type { ClientDocumentStatus } from '@/lib/client-process';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isStatus(value: unknown): value is ClientDocumentStatus {
  return typeof value === 'string' && (DOCUMENT_STATUSES as readonly string[]).includes(value);
}

/**
 * עדכון סטטוס של מסמך ברשימת המסמכים של הלקוח.
 *
 * גם היועץ וגם הלקוח יכולים לסמן שמסמך הוגש — הלקוח מדווח, והיועץ מאשר או
 * דוחה אחרי שבדק.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const client = await findAccessibleClient(userId, id);
  if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const documentId = typeof body?.documentId === 'string' ? body.documentId : '';
  if (!documentId || !isStatus(body?.status)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const document = await prisma.clientDocument.findFirst({
    where: { id: documentId, clientId: id },
  });
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const status = body.status;
  const updated = await prisma.clientDocument.update({
    where: { id: documentId },
    data: {
      status,
      // תאריך ההגשה נקבע בפעם הראשונה שהמסמך מסומן כהוגש, ומתאפס כשהוא חוזר להיות חסר
      submittedAt: status === 'PENDING' ? null : document.submittedAt ?? new Date(),
      note: typeof body?.note === 'string' ? body.note.trim() || null : document.note,
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    submittedAt: updated.submittedAt?.toISOString() ?? null,
    note: updated.note,
  });
}
