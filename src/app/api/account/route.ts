import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { accountConfirmationValue, confirmationMatches, deleteClientAccount } from '@/lib/account-deletion';

/** מה שחלון הסרת החשבון צריך לדעת: מה להקליד לאישור, והאם לבקש סיסמה */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true, hashedPassword: true, role: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    confirmValue: accountConfirmationValue(user),
    hasPassword: Boolean(user.hashedPassword),
    canDelete: user.role === 'CLIENT',
  });
}

/** הסרת החשבון וכל המידע שלו. דורש להקליד את המייל, ובחשבון עם סיסמה — גם אותה */
export async function DELETE(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = await rateLimit(`account:delete:${userId}`, { limit: 5, windowSeconds: 900 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות' },
      { status: 429, headers: { 'Retry-After': String(limited.resetInSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true, hashedPassword: true },
  });
  if (!user) return NextResponse.json({ error: 'החשבון לא נמצא' }, { status: 404 });

  if (!confirmationMatches(accountConfirmationValue(user), body?.confirm)) {
    return NextResponse.json({ error: 'הכתובת שהוקלדה אינה תואמת לחשבון' }, { status: 400 });
  }
  if (user.hashedPassword) {
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password || !(await bcrypt.compare(password, user.hashedPassword))) {
      return NextResponse.json({ error: 'הסיסמה שגויה' }, { status: 400 });
    }
  }

  const result = await deleteClientAccount(userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
