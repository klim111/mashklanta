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
export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { docId } = await params;
  const file = await readPlanDocument(userId, docId);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  /* `?download=1` מוריד את הקובץ במקום להציג אותו בדפדפן */
  const download = req.nextUrl.searchParams.get('download') === '1';

  return new NextResponse(file.stream, {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(
        file.fileName
      )}`,
      /*
        `no-store` מנע מהדפדפן להציג PDF: מציג ה-PDF המובנה קורא את הקובץ
        בבקשות טווח, ובלי מטמון פרטי הוא נכשל ומציג עמוד ריק. `private` עם
        `must-revalidate` שומר שהקובץ לא ייחשף אחרי יציאה מהחשבון, ועדיין
        מאפשר את הקריאה החוזרת שהמציג צריך.
      */
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
