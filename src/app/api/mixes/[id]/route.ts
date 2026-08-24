import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canEditMix } from '@/lib/mixes';
import { findAccessibleClient } from '@/lib/clients';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** שינוי שם התמהיל או שיוכו ללקוח */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!(await canEditMix(userId, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const data: { name?: string; clientId?: string | null; mixJson?: object } = {};

  if (typeof body?.name === 'string' && body.name.trim()) {
    const name = body.name.trim();
    const current = await prisma.mortgageMix.findUnique({
      where: { id },
      select: { mixJson: true },
    });
    data.name = name;
    // השם חי גם בתוך התמהיל עצמו, ולכן שתי העותקים חייבים להתעדכן יחד
    if (current?.mixJson && typeof current.mixJson === 'object') {
      data.mixJson = { ...(current.mixJson as object), name };
    }
  }

  if (body?.clientId === null) {
    data.clientId = null;
  } else if (typeof body?.clientId === 'string') {
    const client = await findAccessibleClient(userId, body.clientId);
    if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    data.clientId = body.clientId;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  await prisma.mortgageMix.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!(await canEditMix(userId, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.mortgageMix.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
