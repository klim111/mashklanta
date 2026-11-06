import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { leadFileForAdvisor } from '@/lib/advisor-leads';
import { streamStoredFile } from '@/lib/conversation-files';
import { attachmentResponse } from '@/lib/attachment-response';

interface RouteContext {
  params: Promise<{ id: string; fileId: string }>;
}

/** קובץ שהלקוח צירף לפנייה — נפתח אצל היועץ דרך הפלטפורמה, לא בכתובת ישירה */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, fileId } = await params;
  const file = await leadFileForAdvisor(advisorId, id, fileId);
  if (!file?.blob) return NextResponse.json({ error: 'הקובץ לא נמצא' }, { status: 404 });
  const stream = await streamStoredFile(file.blob);
  if (!stream) return NextResponse.json({ error: 'הקובץ לא נמצא' }, { status: 404 });
  return attachmentResponse(stream, file, req.nextUrl.searchParams.get('download') === '1');
}
