import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/find-user-by-login';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

/**
 * האם כבר קיים משתמש עם המייל — טופס ההרשמה שואל מיד כשהמייל מוקלד, כדי
 * להציע כניסה או איפוס סיסמה במקום הרשמה כפולה. מוגבל בקצב לכל כתובת IP.
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(`email-status:${getClientIp(request)}`, { limit: 30, windowSeconds: 600 });
  if (!limited.allowed) return NextResponse.json({ exists: false, limited: true }, { status: 429 });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ exists: false });
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  });
  return NextResponse.json({ exists: Boolean(user) });
}
