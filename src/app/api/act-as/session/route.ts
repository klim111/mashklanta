import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';

/**
 * ה-session של החלון שבו היועץ עובד בשם לקוח מתעניין (src/lib/act-as.ts).
 * החלון מפנה לכאן את הבקשה של next-auth ל-`/api/auth/session`, כדי שכל המסכים
 * יראו את הלקוח. בלי הכותרת של החלון — אין כאן session.
 */
export async function GET() {
  const session = await getServerAuth();
  if (!session?.user?.actingAdvisorId) return NextResponse.json({});
  return NextResponse.json(session, { headers: { 'Cache-Control': 'no-store' } });
}
