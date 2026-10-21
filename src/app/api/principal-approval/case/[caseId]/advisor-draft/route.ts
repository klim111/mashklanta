import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: Promise<{ caseId: string }>;
}

/**
 * שדות בתיק האישור העקרוני שהיועץ מילא ועוד לא שידר ללקוח. השידור עצמו עובר
 * דרך שמירת השדות הרגילה, עם הבדיקות והתנגשויות הפרופיל שלה; כאן רק נשמרת
 * הטיוטה עד אז. פתוח ליועץ של הלקוח בלבד.
 */
async function advisorOf(caseId: string) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId || session?.user?.role !== 'ADVISOR') return null;
  const mortgageCase = await prisma.mortgageCase.findUnique({
    where: { id: caseId },
    select: { clientId: true, advisorId: true },
  });
  if (!mortgageCase) return null;
  if (mortgageCase.advisorId === userId) return userId;
  const link = await prisma.client.findFirst({
    where: { advisorId: userId, userId: mortgageCase.clientId },
    select: { id: true },
  });
  return link ? userId : null;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { caseId } = await params;
  if (!(await advisorOf(caseId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const row = await prisma.mortgageCase.findUnique({ where: { id: caseId }, select: { advisorDraftJson: true } });
  const values = row?.advisorDraftJson;
  return NextResponse.json(
    { values: values && typeof values === 'object' && !Array.isArray(values) ? values : {} },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { caseId } = await params;
  if (!(await advisorOf(caseId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const values = body?.values && typeof body.values === 'object' && !Array.isArray(body.values) ? body.values : {};
  await prisma.mortgageCase.update({
    where: { id: caseId },
    data: {
      advisorDraftJson: Object.keys(values).length > 0 ? (values as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });
  return NextResponse.json({ ok: true });
}
