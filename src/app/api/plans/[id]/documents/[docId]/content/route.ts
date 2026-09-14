import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { readPlanDocument } from '@/lib/plan-documents';

interface RouteContext {
  params: Promise<{ id: string; docId: string }>;
}

/**
 * הקובץ עצמו.
 *
 * זו הדרך היחידה להגיע אליו: האובייקט ב-Blob פרטי, והנתיב אליו אינו יוצא
 * מהשרת. כל בקשה נבדקת מחדש מול בעלות התהליך, והתשובה אינה נשמרת במטמון —
 * כדי שמסמך לא יישאר זמין אחרי יציאה מהחשבון.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { docId } = await params;
  const file = await readPlanDocument(userId, docId);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return new NextResponse(file.stream, {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
