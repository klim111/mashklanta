import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { normalizeEmail } from '@/lib/find-user-by-login';
import { DRAFT_FIELDS, cleanDraftField, isTrackingId, normalizePath } from '@/lib/site-analytics';

const SOURCES = new Set(['register', 'guest-dialog']);
const LIMITS = { name: 100, username: 50, email: 254 } as const;

/**
 * שמירת פרטי הרשמה תוך כדי הקלדה, כדי שהיועץ יראה מי התחיל להירשם ולא סיים.
 * רק שם, שם משתמש ומייל — הסיסמה לא נשלחת לכאן אף פעם. פתוח גם למי שלא
 * מחובר (זה כל העניין), ומוגבל בקצב לכל כתובת IP.
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(`signup-draft:${getClientIp(request)}`, { limit: 120, windowSeconds: 600 });
  if (!limited.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const body = await request.json().catch(() => null);
  if (!body || !isTrackingId(body.draftKey) || !SOURCES.has(body.source)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = cleanDraftField(body.name, LIMITS.name);
  const username = cleanDraftField(body.username, LIMITS.username);
  const rawEmail = cleanDraftField(body.email, LIMITS.email);
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  const lastField = DRAFT_FIELDS.includes(body.lastField) ? (body.lastField as string) : null;
  const submitted = body.submitted === true;

  // טופס ריק לגמרי אינו התחלת הרשמה
  if (!name && !username && !email) return NextResponse.json({ ok: true });

  const fields = {
    visitorId: isTrackingId(body.visitorId) ? body.visitorId : null,
    source: body.source as string,
    path: normalizePath(body.path),
    name,
    username,
    email,
    ...(lastField ? { lastField } : {}),
  };

  await prisma.signupDraft.upsert({
    where: { draftKey: body.draftKey },
    create: { draftKey: body.draftKey, ...fields, submitted },
    // "נשלח" לא חוזר אחורה גם אם הלקוח המשיך להקליד אחר כך
    update: { ...fields, ...(submitted ? { submitted: true } : {}) },
  });
  return NextResponse.json({ ok: true });
}
