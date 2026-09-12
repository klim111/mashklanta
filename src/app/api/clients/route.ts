import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { listAdvisorClients, syncStageDocuments } from '@/lib/clients';

/** הלקוחות שהיועץ מלווה */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(await listAdvisorClients(userId));
}

/**
 * הוספת לקוח ליועץ.
 *
 * ליווי נפתח רק מול לקוח שכבר פתח חשבון בעצמו, ולכן החיפוש הוא לפי האימייל של
 * החשבון. כך אין רשומות לקוח "יתומות" שאין מאחוריהן משתמש אמיתי.
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) {
    return NextResponse.json({ error: 'נדרש אימייל של הלקוח' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: 'אין משתמש עם האימייל הזה. הלקוח צריך להירשם למערכת לפני שאפשר לצרף אותו.' },
      { status: 404 }
    );
  }
  if (user.role !== 'CLIENT') {
    return NextResponse.json({ error: 'החשבון הזה אינו חשבון לקוח' }, { status: 400 });
  }
  if (user.id === advisorId) {
    return NextResponse.json({ error: 'לא ניתן לצרף את עצמך כלקוח' }, { status: 400 });
  }

  const existing = await prisma.client.findUnique({
    where: { advisorId_userId: { advisorId, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: 'הלקוח כבר מופיע ברשימה שלך', id: existing.id }, { status: 409 });
  }

  const client = await prisma.client.create({
    data: {
      advisorId,
      userId: user.id,
      name: typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : user.name || email,
      email,
      phone: typeof body?.phone === 'string' && body.phone.trim() ? body.phone.trim() : null,
    },
  });

  await syncStageDocuments(client.id, 'INTAKE');
  return NextResponse.json({ id: client.id }, { status: 201 });
}
