import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { RESET_TTL_MINUTES, requestPasswordReset } from '@/lib/password-reset';

export const maxDuration = 30;

const schema = z.object({ email: z.string().trim().email('כתובת מייל לא תקינה').max(254) });

/** "שכחתי סיסמה": שולח קישור לבחירת סיסמה חדשה למייל, אם יש איתו חשבון */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(`password-reset:ip:${getClientIp(request)}`, { limit: 10, windowSeconds: 900 });
  if (!limited.allowed) {
    return NextResponse.json({ error: 'יותר מדי בקשות. נסו שוב בעוד כמה דקות.' }, { status: 429 });
  }

  const validation = schema.safeParse(await request.json().catch(() => null));
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  try {
    const result = await requestPasswordReset(validation.data.email, request.nextUrl.origin);
    if (result === 'cooldown') {
      return NextResponse.json(
        { error: 'כבר שלחנו קישור לכתובת הזו לפני רגע. בדקו את תיבת המייל, או נסו שוב בעוד דקה.' },
        { status: 429 }
      );
    }
    if (result === 'limit') {
      return NextResponse.json({ error: 'נשלחו יותר מדי קישורים לכתובת הזו. נסו שוב בעוד שעה.' }, { status: 429 });
    }
    if (result === 'email-failed') {
      return NextResponse.json({ error: 'לא הצלחנו לשלוח את המייל. נסו שוב בעוד רגע.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, ttlMinutes: RESET_TTL_MINUTES });
  } catch (error) {
    console.error('Password reset request failed:', error);
    return NextResponse.json({ error: 'אירעה שגיאה. נסו שוב בעוד רגע.' }, { status: 500 });
  }
}
