import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseAdvisorDetails } from '@/lib/authorization-forms';

async function advisorId(): Promise<string | NextResponse> {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return userId;
}

/** פרטי היועץ לטפסי כתבי ההסמכה */
export async function GET() {
  const id = await advisorId();
  if (id instanceof NextResponse) return id;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true, advisorDetailsJson: true } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(parseAdvisorDetails(user.advisorDetailsJson, user.name));
}

export async function PUT(req: NextRequest) {
  const id = await advisorId();
  if (id instanceof NextResponse) return id;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const details = parseAdvisorDetails(await req.json().catch(() => null), user.name);
  await prisma.user.update({
    where: { id },
    data: { advisorDetailsJson: details as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json(details);
}
