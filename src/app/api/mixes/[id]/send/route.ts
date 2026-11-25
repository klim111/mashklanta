import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { conversationFilePrefix } from '@/lib/conversation';
import { postChatMessage } from '@/lib/conversation-store';
import { blobIsConfigured } from '@/lib/plan-documents';
import { assignMixToClient, MixIncompleteError } from '@/lib/mixes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MAX_REPORT_BYTES = 4 * 1024 * 1024;

/**
 * שליחת תמהיל ללקוח: דוח ה-PDF שהיועץ הפיק בדפדפן נשמר בשיחה של הלקוח
 * ונשלח כהודעה בצ'אט, והתמהיל עצמו משויך ללקוח וגלוי לו — כך שהוא מופיע
 * אצלו גם בשלב בניית התמהיל.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!blobIsConfigured()) return NextResponse.json({ error: 'אחסון הקבצים אינו מוגדר כרגע' }, { status: 503 });

  const limit = await rateLimit(`mix-send:${userId}`, { limit: 20, windowSeconds: 600 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'נשלחו הרבה תמהילים ברצף. נסו שוב בעוד כמה דקות' }, { status: 429 });
  }

  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const clientId = form?.get('clientId');
  const message = form?.get('message');
  const fileName = form?.get('fileName');
  if (!(file instanceof Blob) || typeof clientId !== 'string' || !clientId) {
    return NextResponse.json({ error: 'חסרים פרטים לשליחה' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_REPORT_BYTES) {
    return NextResponse.json({ error: 'קובץ הדוח אינו תקין' }, { status: 413 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // רק PDF אמיתי — לא כל קובץ שהדפדפן טען שהוא PDF
  if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') {
    return NextResponse.json({ error: 'קובץ הדוח אינו PDF' }, { status: 415 });
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, advisorId: userId },
    select: { id: true, userId: true, name: true },
  });
  if (!client) return NextResponse.json({ error: 'הלקוח לא נמצא ברשימת הלקוחות שלך' }, { status: 403 });
  let assigned;
  try {
    assigned = await assignMixToClient(userId, id, client.id);
  } catch (error) {
    if (error instanceof MixIncompleteError) return NextResponse.json({ error: error.message }, { status: 422 });
    throw error;
  }
  if (!assigned) return NextResponse.json({ error: 'התמהיל לא נמצא' }, { status: 404 });

  const name =
    (typeof fileName === 'string' ? fileName.replace(/[\r\n"\\/]/g, '').trim().slice(0, 120) : '') || 'סיכום תמהיל.pdf';
  const blob = await put(`${conversationFilePrefix(client.userId)}mix-${id}.pdf`, Buffer.from(bytes), {
    access: 'private',
    contentType: 'application/pdf',
    addRandomSuffix: true,
  });

  const result = await postChatMessage(
    { clientUserId: client.userId, viewerId: userId, viewerRole: 'ADVISOR' },
    typeof message === 'string' ? message : '',
    [{ kind: 'upload', pathname: blob.pathname, fileName: name }]
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ mix: assigned, message: result.message }, { status: 201 });
}
