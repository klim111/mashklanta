import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { chatAttachment, resolveConversationAccess } from '@/lib/conversation-store';
import { streamStoredFile } from '@/lib/conversation-files';
import { attachmentResponse } from '@/lib/attachment-response';

interface RouteContext {
  params: Promise<{ messageId: string; attachmentId: string }>;
}

/** קובץ שצורף להודעת צ'אט — לצפייה, או להורדה (`?download=1`) */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, req.nextUrl.searchParams.get('clientUserId'));
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { messageId, attachmentId } = await params;
  const attachment = await chatAttachment(access, messageId, attachmentId);
  const stream = attachment?.blob ? await streamStoredFile(attachment.blob) : null;
  if (!attachment || !stream) return NextResponse.json({ error: 'הקובץ לא נמצא' }, { status: 404 });
  return attachmentResponse(stream, attachment, req.nextUrl.searchParams.get('download') === '1');
}
