import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { attachmentLink, resolveConversationAccess, saveAttachmentToPlan } from '@/lib/conversation-store';
import { MAX_STREAMED_ATTACHMENT_BYTES } from '@/lib/conversation';
import { isAllowedDocumentType, planDocumentFailure } from '@/lib/plan-documents';

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
  const link = await attachmentLink(access, emailId, attachmentId);
  if (!link) return NextResponse.json({ error: 'הקובץ לא נמצא' }, { status: 404 });
  // קובץ גדול נפתח ישר מהקישור הזמני של ספק המיילים, בלי לעבור דרך הפונקציה
  if (link.attachment.size > MAX_STREAMED_ATTACHMENT_BYTES) return NextResponse.redirect(link.url);

  const response = await fetch(link.url, { cache: 'no-store' });
  if (!response.ok) return NextResponse.json({ error: 'הקובץ לא נמצא' }, { status: 404 });
  const file = { bytes: new Uint8Array(await response.arrayBuffer()), attachment: link.attachment };

  /*
    רק PDF ותמונה מוצגים בדפדפן. כל סוג אחר — ובמיוחד HTML שמישהו צירף — יורד
    כקובץ בלבד, כדי שלא ירוץ בדומיין של הפלטפורמה
  */
  const previewable = isAllowedDocumentType(file.attachment.contentType);
  const download = req.nextUrl.searchParams.get('download') === '1' || !previewable;
  return new NextResponse(Buffer.from(file.bytes), {
    headers: {
      'Content-Type': previewable ? file.attachment.contentType : 'application/octet-stream',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(
        file.attachment.fileName
      )}`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
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
