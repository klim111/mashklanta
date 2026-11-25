import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { ADVISOR_DEVICE_COOKIE, AdvisorLinkError, advisorLinkStep } from '@/lib/advisor-access';

const schema = z.object({ token: z.string().trim().min(1).max(200) });

/**
 * אחרי פתיחת הקישור מהמייל: האם היועץ מקליד את הסיסמה, או — בכניסה הראשונה —
 * בוחר אותה. הקישור נבדק (כולל הדפדפן שביקש אותו) אבל לא מנוצל.
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(`advisor-step:ip:${getClientIp(request)}`, { limit: 20, windowSeconds: 900 });
  if (!limited.allowed) {
    return NextResponse.json({ error: 'יותר מדי בקשות. נסו שוב בעוד כמה דקות.' }, { status: 429 });
  }

  const validation = schema.safeParse(await request.json().catch(() => null));
  if (!validation.success) return NextResponse.json({ code: 'AdvisorLinkInvalid' }, { status: 400 });

  try {
    const step = await advisorLinkStep(
      validation.data.token,
      request.cookies.get(ADVISOR_DEVICE_COOKIE)?.value ?? null
    );
    return NextResponse.json({ step });
  } catch (error) {
    if (error instanceof AdvisorLinkError) return NextResponse.json({ code: error.message }, { status: 400 });
    console.error('Advisor link step failed:', error);
    return NextResponse.json({ error: 'אירעה שגיאה. נסו שוב בעוד רגע.' }, { status: 500 });
  }
}
