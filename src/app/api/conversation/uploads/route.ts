import { NextRequest, NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import type { HandleUploadBody } from '@vercel/blob/client';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { resolveConversationAccess } from '@/lib/conversation-store';
import { conversationFilePrefix } from '@/lib/conversation';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, blobIsConfigured, planDocumentFailure } from '@/lib/plan-documents';

/**
 * הרשאת העלאה לקובץ שמצרפים בהתכתבות (מייל או צ'אט). כמו בתיק המסמכים, הקובץ
 * עולה מהדפדפן ישר לחנות הקבצים, והטוקן תקף רק לנתיב של השיחה הזו, לסוגי
 * הקבצים המותרים ולגודל המרבי. `clientPayload` — הלקוח, כשהיועץ מעלה.
 */
export async function POST(req: NextRequest) {
  if (!blobIsConfigured()) {
    return NextResponse.json({ error: 'אחסון הקבצים אינו מוגדר כרגע' }, { status: 503 });
  }
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getServerAuth();
        if (!session?.user?.id) throw new Error('נדרשת התחברות כדי לצרף קובץ');
        const access = await resolveConversationAccess(session.user, clientPayload || null);
        if (!access) throw new Error('אין הרשאה לצרף קבצים לשיחה הזו');
        if (!pathname.startsWith(conversationFilePrefix(access.clientUserId))) {
          throw new Error('נתיב הקובץ אינו שייך לשיחה הזו');
        }
        const limit = await rateLimit(`conversation-upload:${access.viewerId}`, { limit: 60, windowSeconds: 3600 });
        if (!limit.allowed) throw new Error('יותר מדי קבצים. נסו שוב מאוחר יותר');
        return {
          allowedContentTypes: [...ALLOWED_DOCUMENT_TYPES],
          maximumSizeInBytes: MAX_DOCUMENT_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[conversation-files] token issue failed', error);
    const failure = planDocumentFailure(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status === 500 ? 400 : failure.status });
  }
}
