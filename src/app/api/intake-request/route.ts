import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { parseLeadFileRefs } from '@/lib/lead-files';
import { parseRequestKind, submitIntakeRequest } from '@/lib/principal-approval/intake-request';

export const dynamic = 'force-dynamic';

/**
 * "שדר ליועץ" בבקשת מכרז ריביות או בבקשת בדיקת מיחזור מהעמוד הראשי.
 * פתוח גם למבקר שלא מחובר: אז כל הטופס מגיע בגוף הבקשה (`payload`).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { kind?: unknown; payload?: unknown; files?: unknown }
    | null;
  const kind = parseRequestKind(body?.kind);
  if (!body || !kind) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });

  const session = await getServerAuth();
  if (session?.user?.role === 'ADVISOR') {
    return NextResponse.json({ error: 'הטופס הזה מיועד ללקוחות' }, { status: 403 });
  }

  if (!session?.user?.id) {
    // מבקר בלי חשבון — מגבלת קצב לפי כתובת, כדי שאי אפשר יהיה להציף את רשימת הלקוחות
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    const limit = await rateLimit(`intake-request:${ip}`, { limit: 6, windowSeconds: 3600 });
    if (!limit.allowed) {
      return NextResponse.json({ error: 'נשלחו יותר מדי בקשות. נסו שוב מאוחר יותר' }, { status: 429 });
    }
  }

  const result = await submitIntakeRequest({
    kind,
    userId: session?.user?.id ?? null,
    payload: session?.user?.id ? undefined : body.payload,
    files: parseLeadFileRefs(body.files),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ submittedAt: result.submittedAt });
}
