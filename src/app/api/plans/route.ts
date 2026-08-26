import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createPlan, listPlansForUser } from '@/lib/mortgage-plans';
import { rateLimit } from '@/lib/rate-limit';

/** תהליכי תכנון המשכנתא של המשתמש — הפעילים והמושלמים */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(await listPlansForUser(userId));
}

/** פתיחת תהליך חדש */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name : undefined;

  const limited = await rateLimit(`plans:create:${userId}`, { limit: 8, windowSeconds: 3600 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'Too many plans' },
      { status: 429, headers: { 'Retry-After': String(limited.resetInSeconds) } }
    );
  }

  return NextResponse.json(await createPlan(userId, name), { status: 201 });
}
