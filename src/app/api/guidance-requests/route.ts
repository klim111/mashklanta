import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createGuidanceRequest, listGuidanceRequests } from '@/lib/guidance-requests';
import { isMortgageGoal, isServiceType, serviceNeedsAdvisor } from '@/lib/service-flow';

function clean(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** הבקשות הפתוחות, ליועצים בלבד. `all=1` מחזיר גם את אלה שטופלו */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(
    await listGuidanceRequests(advisorId, { includeClosed: req.nextUrl.searchParams.get('all') === '1' })
  );
}

/**
 * שליחת בקשת ליווי.
 *
 * משתמש רשום: השם והמייל נלקחים מהחשבון, והלקוח יכול להוסיף טלפון והערה.
 * אורח: חייב להזין שם ומייל, ומוגבל בקצב לפי כתובת — כי הנתיב פתוח לכולם.
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id ?? null;

  const body = await req.json().catch(() => null);
  const goal = body?.goal;
  const serviceType = body?.serviceType;
  if (!isMortgageGoal(goal) || !isServiceType(serviceType)) {
    return NextResponse.json({ error: 'נדרשים מטרה וסוג שירות תקינים' }, { status: 400 });
  }
  if (!serviceNeedsAdvisor(serviceType)) {
    return NextResponse.json({ error: 'המסלול העצמאי אינו פותח בקשת ליווי' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const limited = await rateLimit(`guidance:create:${userId ?? ip}`, {
    limit: userId ? 10 : 5,
    windowSeconds: 3600,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'נשלחו יותר מדי בקשות. נסו שוב מאוחר יותר.' },
      { status: 429, headers: { 'Retry-After': String(limited.resetInSeconds) } }
    );
  }

  let name = clean(body?.name, 120);
  let email = clean(body?.email, 200).toLowerCase();

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (!user?.email) return NextResponse.json({ error: 'לחשבון אין כתובת מייל' }, { status: 400 });
    name = user.name?.trim() || name || user.email;
    email = user.email.toLowerCase();
  }

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'נדרשים שם וכתובת מייל תקינה' }, { status: 400 });
  }

  const phone = clean(body?.phone, 30);
  const note = clean(body?.note, 2000);

  const created = await createGuidanceRequest({
    userId,
    name,
    email,
    phone: phone || null,
    goal,
    serviceType,
    note: note || null,
  });

  return NextResponse.json(created, { status: 201 });
}
