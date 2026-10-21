import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { ADVISOR_DEVICE_COOKIE, ADVISOR_LINK_TTL_MINUTES, requestAdvisorLink } from '@/lib/advisor-access';

export const maxDuration = 30;

const schema = z.object({ email: z.string().trim().max(254) });

/** הכניסה הנסתרת של היועץ: שולח קישור חד-פעמי למייל היועץ, ורק אליו */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(`advisor-login:ip:${getClientIp(request)}`, { limit: 5, windowSeconds: 900 });
  if (!limited.allowed) {
    return NextResponse.json({ error: 'יותר מדי בקשות. נסו שוב בעוד כמה דקות.' }, { status: 429 });
  }

  const validation = schema.safeParse(await request.json().catch(() => null));
  if (!validation.success) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });

  try {
    const { result, deviceToken } = await requestAdvisorLink(
      validation.data.email,
      request.cookies.get(ADVISOR_DEVICE_COOKIE)?.value ?? null,
      request.nextUrl.origin
    );
    const response =
      result === 'limit'
        ? NextResponse.json({ error: 'יותר מדי בקשות. נסו שוב בעוד שעה.' }, { status: 429 })
        : NextResponse.json({ ok: true, ttlMinutes: ADVISOR_LINK_TTL_MINUTES });
    response.cookies.set(ADVISOR_DEVICE_COOKIE, deviceToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error('Advisor login link failed:', error);
    return NextResponse.json({ error: 'אירעה שגיאה. נסו שוב בעוד רגע.' }, { status: 500 });
  }
}
