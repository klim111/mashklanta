import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  clientUpdateData,
  findAccessibleClient,
  getClientDetail,
  setClientStage,
  syncStageDocuments,
} from '@/lib/clients';
import { decryptFinancials } from '@/lib/client-financials';
import { CLIENT_STAGES } from '@/lib/client-process';
import type { ClientStage } from '@/lib/client-process';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isStage(value: unknown): value is ClientStage {
  return typeof value === 'string' && (CLIENT_STAGES as readonly string[]).includes(value);
}

/** כל פרטי הלקוח: נתונים אישיים, שלב, מסמכים והתמהילים שלו */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const client = await findAccessibleClient(userId, id);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // מסמכי השלב הנוכחי נפתחים בקריאה הראשונה, גם ללקוחות שנוצרו לפני השינוי
  await syncStageDocuments(id, client.stage as ClientStage);

  const detail = await getClientDetail(id);
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(detail);
}

/** עדכון פרטי הלקוח או קידום השלב בתהליך. פתוח ליועץ המלווה בלבד */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const client = await prisma.client.findFirst({ where: { id, advisorId: userId } });
  if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const data = clientUpdateData(body as Record<string, unknown>, decryptFinancials(client));
  if (Object.keys(data).length > 0) {
    await prisma.client.update({ where: { id }, data });
  }

  if (isStage(body.stage)) {
    await setClientStage(id, body.stage);
  }

  const detail = await getClientDetail(id);
  return NextResponse.json(detail);
}

/** הפסקת הליווי. התמהילים נשארים אצל מי שיצר אותם */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const client = await prisma.client.findFirst({ where: { id, advisorId: userId } });
  if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
