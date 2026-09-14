import { NextRequest, NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import type { HandleUploadBody } from '@vercel/blob/client';
import { getServerAuth } from '@/lib/auth';
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  blobIsConfigured,
  canUploadToPlan,
  planDocumentFailure,
  planDocumentPrefix,
} from '@/lib/plan-documents';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * הנפקת הרשאת העלאה לדפדפן.
 *
 * הקובץ עצמו אינו עובר דרך השרת: פונקציה של Vercel מוגבלת לגוף בקשה קטן,
 * וקובץ סרוק של כמה מגה היה נחסם עוד לפני שהגיע לקוד. במקום זה השרת מנפיק
 * טוקן חד-פעמי, צר ככל האפשר — נתיב אחד בתוך התהליך, סוגי קבצים מותרים בלבד
 * וגודל מרבי — והדפדפן מעלה איתו ישירות לאחסון.
 *
 * הבדיקה מי רשאי להעלות נעשית כאן, לפני שהטוקן נוצר.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  if (!blobIsConfigured()) {
    return NextResponse.json(
      { error: 'אחסון הקבצים אינו מוגדר. חסר BLOB_READ_WRITE_TOKEN בסביבה.' },
      { status: 503 }
    );
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getServerAuth();
        const userId = session?.user?.id;
        if (!userId) throw new Error('נדרשת התחברות כדי להעלות מסמך');

        // הטוקן תקף רק לנתיב שבתוך התהליך הזה, ורק לבעליו
        if (!pathname.startsWith(planDocumentPrefix(id))) {
          throw new Error('נתיב הקובץ אינו שייך לתהליך הזה');
        }
        if (!(await canUploadToPlan(userId, id))) {
          throw new Error('אין הרשאה להעלות מסמכים לתהליך הזה');
        }

        return {
          allowedContentTypes: [...ALLOWED_DOCUMENT_TYPES],
          maximumSizeInBytes: MAX_DOCUMENT_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[plan-documents] token issue failed', error);
    const failure = planDocumentFailure(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
