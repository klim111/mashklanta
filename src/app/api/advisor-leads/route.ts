import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createLead, listOwnOpenLeads, parseLeadTopic } from '@/lib/advisor-leads';
import { parseRequestKind } from '@/lib/advisor-requests';
import { cleanSourcePath } from '@/lib/page-labels';
import { parseLeadFileRefs, resolveLeadFiles } from '@/lib/lead-files';

function clean(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** הפניות הפתוחות של הלקוח המחובר — לדאשבורד */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json([], { status: 200 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return NextResponse.json(await listOwnOpenLeads(userId, user?.email ?? null));
}

/**
 * פתיחת פנייה חדשה לליווי.
 *
 * משתמש רשום: השם והמייל נלקחים מהחשבון, והלקוח יכול להוסיף טלפון והערה.
 * אורח: חייב להזין שם ודרך קשר אחת — טלפון או מייל — ומוגבל בקצב לפי כתובת,
 * כי הנתיב פתוח לכולם.
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id ?? null;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const limited = await rateLimit(`leads:create:${userId ?? ip}`, {
    limit: userId ? 10 : 5,
    windowSeconds: 3600,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'נשלחו יותר מדי פניות. נסו שוב מאוחר יותר.' },
      { status: 429, headers: { 'Retry-After': String(limited.resetInSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  let name = clean(body?.name, 120);
  let email = clean(body?.email, 200);

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (user?.email) {
      name = user.name?.trim() || name || user.email;
      email = user.email;
    }
  }

  // קבצים שצורפו (טופס הצעה מהבנק, דוח יתרות) — נבדקים מול חנות הקבצים
  const files = await resolveLeadFiles(parseLeadFileRefs(body?.files));
  if (!files.ok) return NextResponse.json({ error: files.error }, { status: files.status });

  const lead = await createLead(userId, {
    topic: parseLeadTopic(body?.topic),
    name,
    phone: clean(body?.phone, 30),
    email,
    notes: clean(body?.notes, 2000) || undefined,
    requestKind: parseRequestKind(body?.requestKind),
    sourcePath: cleanSourcePath(body?.sourcePath),
    files: files.files,
  });
  if (!lead) {
    return NextResponse.json(
      { error: 'נדרשים שם ודרך קשר אחת — טלפון או כתובת מייל תקינה' },
      { status: 400 }
    );
  }

  return NextResponse.json(lead, { status: 201 });
}
