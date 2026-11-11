import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { openProspectClientFile } from '@/lib/prospect-client';

/**
 * פתיחת תיק לקוח מתעניין — לקוח שעדיין לא נרשם (src/lib/prospect-client.ts).
 * נפתח מתוך פגישה, או מכל מקום אחר באזור היועץ. אם כבר יש ליועץ תיק של אותו
 * לקוח (לפי מייל או טלפון), מוחזר התיק הקיים.
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const text = (key: string) => (typeof body?.[key] === 'string' ? (body[key] as string).trim().slice(0, 200) : '');
  const name = text('name');
  if (!name) return NextResponse.json({ error: 'נדרש שם ללקוח' }, { status: 400 });
  const email = text('email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'כתובת המייל אינה תקינה' }, { status: 400 });
  }

  const result = await openProspectClientFile({
    advisorId,
    name,
    phone: text('phone') || null,
    email: email || null,
    note: typeof body?.note === 'string' ? body.note.trim().slice(0, 2000) : null,
  });
  return NextResponse.json({ id: result.clientId, created: result.created }, { status: result.created ? 201 : 200 });
}
