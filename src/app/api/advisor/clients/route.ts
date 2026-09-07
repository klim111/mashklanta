import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerAuth } from '@/lib/auth';

const LinkSchema = z.object({ clientEmail: z.string().email() });

/** Clients linked to the signed-in advisor, with their case progress. */
export async function GET() {
  const session = await getServerAuth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

  const links = await prisma.advisorClient.findMany({
    where: { advisorId: userId },
    include: { client: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const clientIds = links.map((l) => l.clientId);
  const cases = clientIds.length
    ? await prisma.mortgageCase.findMany({
        where: { clientId: { in: clientIds } },
        select: { id: true, clientId: true, status: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      })
    : [];
  const caseByClient = new Map<string, (typeof cases)[number]>();
  for (const c of cases) if (!caseByClient.has(c.clientId)) caseByClient.set(c.clientId, c);

  return NextResponse.json(
    links.map((link) => ({
      clientId: link.clientId,
      name: link.client.name,
      email: link.client.email,
      caseId: caseByClient.get(link.clientId)?.id ?? null,
      caseStatus: caseByClient.get(link.clientId)?.status ?? null,
      updatedAt: caseByClient.get(link.clientId)?.updatedAt?.toISOString() ?? null,
    })),
  );
}

/** Links a client to the advisor by email, so the advisor can open their file. */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

    const { clientEmail } = LinkSchema.parse(await req.json());
    const client = await prisma.user.findUnique({
      where: { email: clientEmail },
      select: { id: true, name: true, email: true },
    });
    if (!client) return NextResponse.json({ error: 'לא נמצא לקוח עם אימייל זה' }, { status: 404 });
    if (client.id === userId) return NextResponse.json({ error: 'לא ניתן לשייך את עצמך' }, { status: 400 });

    await prisma.advisorClient.upsert({
      where: { advisorId_clientId: { advisorId: userId, clientId: client.id } },
      create: { advisorId: userId, clientId: client.id },
      update: {},
    });
    await prisma.user.update({ where: { id: userId }, data: { role: 'advisor' } });

    return NextResponse.json({ ok: true, client }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 400 });
    return NextResponse.json({ error: err?.message ?? 'הפעולה נכשלה' }, { status: 500 });
  }
}
