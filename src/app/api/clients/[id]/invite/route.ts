import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { sendClientInvite } from '@/lib/client-invite';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * "שליחת פרטי כניסה" מדף הלקוח אצל היועץ: מייל ללקוח עם קישור לקביעת סיסמה
 * לחשבון שבו נמצא כל מה שהיועץ הזין בתיק (src/lib/client-invite.ts).
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  const limited = await rateLimit(`client-invite:${id}`, { limit: 5, windowSeconds: 3600 });
  if (!limited.allowed) {
    return NextResponse.json({ error: 'נשלחו כבר כמה מיילים בשעה האחרונה. נסו שוב מאוחר יותר.' }, { status: 429 });
  }

  const result = await sendClientInvite(advisorId, id, req.nextUrl.origin);
  switch (result.status) {
    case 'sent':
      return NextResponse.json(result);
    case 'not-found':
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    case 'no-email':
      return NextResponse.json({ error: 'אין לתיק מייל תקין. הוסיפו מייל בפרטי הלקוח ונסו שוב.' }, { status: 400 });
    case 'registered':
      return NextResponse.json(
        {
          error: `כבר יש חשבון רשום עם ${result.email}. התיק יעבור אליו בכניסה הבאה של הלקוח, ואם שכח את הסיסמה — "שכחתי סיסמה" בעמוד הכניסה.`,
        },
        { status: 409 }
      );
    case 'email-failed':
      return NextResponse.json(
        { error: 'המייל לא נשלח. אפשר להעתיק את הקישור ולשלוח ללקוח בעצמך.', url: result.url },
        { status: 502 }
      );
  }
}
