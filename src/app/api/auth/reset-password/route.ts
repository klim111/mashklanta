import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { passwordProblem } from '@/lib/password-policy';
import { resetPassword } from '@/lib/password-reset';

/** בחירת סיסמה חדשה עם הקישור שנשלח במייל. הסיסמה הישנה מוחלפת */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(`password-reset:use:${getClientIp(request)}`, { limit: 20, windowSeconds: 900 });
  if (!limited.allowed) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const result = await resetPassword(token, password);
    if (result === 'invalid') {
      return NextResponse.json(
        { error: 'הקישור כבר שומש או שפג תוקפו. בקשו קישור חדש.', expired: true },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Password reset failed:', error);
    return NextResponse.json({ error: 'אירעה שגיאה. נסו שוב בעוד רגע.' }, { status: 500 });
  }
}
