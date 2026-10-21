import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { attachmentSource, resolveConversationAccess, saveAttachmentToPlan } from '@/lib/conversation-store';
import { streamStoredFile } from '@/lib/conversation-files';
import { attachmentResponse } from '@/lib/attachment-response';
import { MAX_STREAMED_ATTACHMENT_BYTES } from '@/lib/conversation';
import { planDocumentFailure } from '@/lib/plan-documents';

interface RouteContext {
  params: Promise<{ emailId: string; attachmentId: string }>;
}

/**
 * קובץ שצורף למייל נכנס — לצפייה (`inline`) או להורדה (`?download=1`).
 * הקובץ נמשך מספק המיילים בכל בקשה, אחרי בדיקת הגישה לשיחה, ואינו נשמר במטמון.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, req.nextUrl.searchParams.get('clientUserId'));
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { emailId, attachmentId } = await params;
  const download = req.nextUrl.searchParams.get('download') === '1';
  const source = await attachmentSource(access, emailId, attachmentId);
  if (!source) return NextResponse.json({ error: 'הקובץ לא נמצא' }, { status: 404 });

  // קובץ שצורף מהפלטפורמה — מוזרם מחנות הקבצים
  if (source.kind === 'blob') {
    const stream = await streamStoredFile(source.pathname);
    if (!stream) return NextResponse.json({ error: 'הקובץ לא נמצא' }, { status: 404 });
    return attachmentResponse(stream, source.attachment, download);
  }

  // קובץ גדול ממייל נכנס נפתח ישר מהקישור הזמני של ספק המיילים, בלי לעבור דרך הפונקציה
  if (source.attachment.size > MAX_STREAMED_ATTACHMENT_BYTES) return NextResponse.redirect(source.url);
  const response = await fetch(source.url, { cache: 'no-store' });
  if (!response.ok) return NextResponse.json({ error: 'הקובץ לא נמצא' }, { status: 404 });
  return attachmentResponse(Buffer.from(await response.arrayBuffer()), source.attachment, download);
}

/** שמירת הקובץ בתיק המסמכים של אחד התהליכים הפתוחים של הלקוח */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const access = await resolveConversationAccess(
    session.user,
    typeof body?.clientUserId === 'string' ? body.clientUserId : null
  );
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const limit = await rateLimit(`conversation-attachment:${access.viewerId}`, { limit: 30, windowSeconds: 3600 });
  if (!limit.allowed) return NextResponse.json({ error: 'יותר מדי שמירות. נסו שוב מאוחר יותר' }, { status: 429 });

  const { emailId, attachmentId } = await params;
  try {
    const result = await saveAttachmentToPlan(access, emailId, attachmentId, body?.planId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const failure = planDocumentFailure(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
