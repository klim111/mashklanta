import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { listChatMessages, postChatMessage, resolveConversationAccess } from '@/lib/conversation-store';
import { createLead } from '@/lib/advisor-leads';
import { REQUEST_KIND_LABELS, parseRequestKind } from '@/lib/advisor-requests';
import { cleanSourcePath } from '@/lib/page-labels';

/**
 * הצ'אט בין הלקוח ליועץ. לקוח מקבל תמיד את השיחה שלו; יועץ מציין את הלקוח
 * ב-`clientUserId`, והגישה נבדקת מול הלקוחות שהוא מלווה.
 */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, req.nextUrl.searchParams.get('clientUserId'));
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await listChatMessages(access));
}

export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const access = await resolveConversationAccess(
    session.user,
    typeof body?.clientUserId === 'string' ? body.clientUserId : null
  );
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const limit = await rateLimit(`chat:${access.viewerId}`, { limit: 30, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'נשלחו הרבה הודעות ברצף. נסו שוב בעוד רגע' },
      { status: 429, headers: { 'Retry-After': String(limit.resetInSeconds) } }
    );
  }

  /*
    לקוח שסימן בצ׳אט סוג פנייה (ליווי, פגישה, שאלה, הצעת מחיר): ההודעה נפתחת
    בשם הסוג, ונפתחת גם פנייה אצל היועץ — עם מייל לפי הסוג, במקום ההתראה
    הרגילה על הודעה חדשה
  */
  const kind = access.viewerRole === 'CLIENT' ? parseRequestKind(body?.requestKind) : null;
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  const messageBody = kind ? [REQUEST_KIND_LABELS[kind], text].filter(Boolean).join('\n') : body?.body;

  const result = await postChatMessage(access, messageBody, body?.files, { notify: !kind });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  if (kind) {
    const user = await prisma.user.findUnique({ where: { id: access.clientUserId }, select: { name: true, email: true } });
    const files = result.message.attachments.map((file) => file.fileName);
    await createLead(access.clientUserId, {
      topic: 'CHAT',
      name: user?.name?.trim() || user?.email || 'לקוח',
      email: user?.email ?? '',
      notes: [text, files.length > 0 ? `מצורף בצ׳אט: ${files.join(', ')}` : ''].filter(Boolean).join('\n') || undefined,
      requestKind: kind,
      sourcePath: cleanSourcePath(body?.sourcePath),
      inChat: false,
    }).catch((error) => console.error('[chat] opening the request failed:', error));
  }
  return NextResponse.json(result.message, { status: 201 });
}
