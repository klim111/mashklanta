import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { passwordProblem } from '@/lib/password-policy';
import { rateLimit } from '@/lib/rate-limit';

/**
 * סיסמת היועץ — השלב השני של הכניסה, אחרי הקישור במייל (src/lib/advisor-access.ts).
 * שינוי של סיסמה קיימת דורש את הסיסמה הנוכחית.
 */

async function advisorId(): Promise<string | NextResponse> {
  const session = await getServerAuth();
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return id;
}

export async function GET() {
  const id = await advisorId();
  if (typeof id !== 'string') return id;
  const user = await prisma.user.findUnique({ where: { id }, select: { hashedPassword: true } });
  return NextResponse.json({ hasPassword: Boolean(user?.hashedPassword) });
}

export async function POST(request: NextRequest) {
  const id = await advisorId();
  if (typeof id !== 'string') return id;

  const body = await request.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  const problem = passwordProblem(newPassword);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id }, select: { hashedPassword: true } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.hashedPassword) {
    const limited = await rateLimit(`advisor-password-change:${id}`, { limit: 5, windowSeconds: 900 });
    if (!limited.allowed) {
      return NextResponse.json({ error: 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות.' }, { status: 429 });
    }
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.hashedPassword))) {
      return NextResponse.json({ error: 'הסיסמה הנוכחית שגויה.' }, { status: 400 });
    }
  }

  await prisma.user.update({ where: { id }, data: { hashedPassword: await bcrypt.hash(newPassword, 12) } });
  return NextResponse.json({ ok: true });
}
