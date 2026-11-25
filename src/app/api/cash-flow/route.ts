import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseCashFlow } from '@/lib/cash-flow';

/**
 * כלי מצב הון ותזרים — ההלוואות, ההכנסות והמשכנתא של הלקוח.
 *
 * נשמר כרשומת Calculation אחת לכל משתמש, מסומנת ב-`kind`, כדי לא להוסיף
 * טבלה או עמודה (ובלי מיגרציה).
 */
const KIND = 'CASH_FLOW';

async function findRecord(userId: string) {
  return prisma.calculation.findFirst({
    where: { userId, inputsJson: { path: ['kind'], equals: KIND } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const record = await findRecord(userId);
  const data = record ? parseCashFlow((record.inputsJson as Record<string, unknown>).data) : null;
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = parseCashFlow(await req.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const data = { ...parsed, updatedAt: new Date().toISOString() };
  const inputsJson = { kind: KIND, data } as unknown as Prisma.InputJsonValue;
  const record = await findRecord(userId);
  if (record) {
    await prisma.calculation.update({ where: { id: record.id }, data: { inputsJson, resultsJson: {} } });
  } else {
    await prisma.calculation.create({ data: { userId, inputsJson, resultsJson: {} } });
  }
  return NextResponse.json(data);
}
