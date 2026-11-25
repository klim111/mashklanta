import { NextRequest, NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import type { HandleUploadBody } from '@vercel/blob/client';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { LEAD_FILE_PREFIX } from '@/lib/lead-file-paths';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, blobIsConfigured, planDocumentFailure } from '@/lib/plan-documents';

/**
 * הרשאת העלאה לקובץ שמצרפים לפנייה ליועץ ("היוועצו איתנו"). גם אורח בלי חשבון
 * מעלה, ולכן הטוקן תקף רק לנתיב תחת `leads/`, לסוגי הקבצים המותרים ולגודל המרבי,
 * והקצב מוגבל לפי כתובת. הקובץ נבדק שוב כשהפנייה נשלחת.
 */
export async function POST(req: NextRequest) {
  if (!blobIsConfigured()) {
    return NextResponse.json({ error: 'אחסון הקבצים אינו מוגדר כרגע' }, { status: 503 });
  }
  const body = (await req.json()) as HandleUploadBody;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(LEAD_FILE_PREFIX) || pathname.includes('..')) {
          throw new Error('נתיב הקובץ אינו תקין');
        }
        const session = await getServerAuth();
        const who = session?.user?.id ?? ip;
        const limit = await rateLimit(`lead-upload:${who}`, { limit: session?.user?.id ? 30 : 10, windowSeconds: 3600 });
        if (!limit.allowed) throw new Error('הועלו יותר מדי קבצים. נסו שוב מאוחר יותר');
        return {
          allowedContentTypes: [...ALLOWED_DOCUMENT_TYPES],
          maximumSizeInBytes: MAX_DOCUMENT_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[lead-files] token issue failed', error);
    const failure = planDocumentFailure(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status === 500 ? 400 : failure.status });
  }
}
