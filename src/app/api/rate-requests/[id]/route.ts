import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canEditRateRequest } from '@/lib/rate-requests';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!(await canEditRateRequest(userId, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.bankRateRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
