import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import {
  MAX_DOCUMENT_BYTES,
  isAllowedDocumentType,
  listPlanDocuments,
  uploadPlanDocument,
} from '@/lib/plan-documents';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** המסמכים שהועלו לתהליך — ללקוח וליועץ שמלווה אותו */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  return NextResponse.json(await listPlanDocuments(userId, id));
}

/**
 * העלאת מסמך.
 *
 * הקובץ עובר דרך השרת ולא ישירות ל-Blob: כך ההרשאה נבדקת לפני שנכתב משהו,
 * והכתובת של האובייקט אינה מגיעה לדפדפן בשום שלב.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const key = form?.get('key');
  const name = form?.get('name');

  if (!(file instanceof File) || typeof key !== 'string' || typeof name !== 'string') {
    return NextResponse.json({ error: 'נדרש קובץ ומזהה מסמך' }, { status: 400 });
  }
  if (!isAllowedDocumentType(file.type)) {
    return NextResponse.json({ error: 'אפשר להעלות PDF או תמונה בלבד' }, { status: 415 });
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: 'הקובץ גדול מדי — עד 15MB' }, { status: 413 });
  }

  const document = await uploadPlanDocument(userId, id, {
    key,
    name,
    fileName: file.name,
    contentType: file.type,
    body: await file.arrayBuffer(),
  });

  if (!document) return NextResponse.json({ error: 'ההעלאה נדחתה' }, { status: 403 });
  return NextResponse.json(document, { status: 201 });
}
