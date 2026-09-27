import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import {
  isAllowedDocumentType,
  listPlanDocuments,
  planDocumentFailure,
  recordPlanDocument,
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
  try {
    return NextResponse.json(await listPlanDocuments(userId, id));
  } catch (error) {
    console.error('[plan-documents] list failed', error);
    const failure = planDocumentFailure(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

/**
 * רישום קובץ שהדפדפן כבר העלה.
 *
 * ההעלאה עצמה נעשית ישירות מול האחסון עם טוקן מוגבל, וכאן נשמרת הרשומה
 * שמקשרת את הקובץ למסמך שהוא ממלא בתיק.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const key = typeof body?.key === 'string' ? body.key : '';
  const name = typeof body?.name === 'string' ? body.name : '';
  const fileName = typeof body?.fileName === 'string' ? body.fileName : '';
  const contentType = typeof body?.contentType === 'string' ? body.contentType : '';
  const blobPath = typeof body?.blobPath === 'string' ? body.blobPath : '';
  const size = Number(body?.size);

  if (!key || !name || !fileName || !blobPath || !Number.isFinite(size)) {
    return NextResponse.json({ error: 'חסרים פרטי המסמך' }, { status: 400 });
  }
  if (!isAllowedDocumentType(contentType)) {
    return NextResponse.json({ error: 'אפשר להעלות PDF או תמונה בלבד' }, { status: 415 });
  }

  try {
    const document = await recordPlanDocument(userId, id, {
      key,
      name,
      fileName,
      contentType,
      size,
      blobPath,
    });
    if (!document) return NextResponse.json({ error: 'ההעלאה נדחתה' }, { status: 403 });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('[plan-documents] record failed', error);
    const failure = planDocumentFailure(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
