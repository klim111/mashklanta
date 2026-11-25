import { NextRequest, NextResponse } from 'next/server';
import { parseAdvisorApplication, submitAdvisorApplication } from '@/lib/advisor-applications';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

/**
 * בקשת הצטרפות של יועץ (הטופס בדף /join). שום חשבון לא נפתח כאן — הבקשה
 * מחכה לאישור של מנהל הפלטפורמה (src/lib/advisor-applications.ts).
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = await rateLimit(`advisor-application:${ip}`, { limit: 5, windowSeconds: 3600 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'נשלחו כבר כמה בקשות מהמכשיר הזה. נסו שוב בעוד שעה' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  // שדה מלכודת שמוסתר מבני אדם: רובוט שממלא אותו מקבל "התקבל" ולא נשמר דבר
  if (body && typeof body.company === 'string' && body.company.trim()) {
    return NextResponse.json({ status: 'received' });
  }

  const parsed = parseAdvisorApplication(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const result = await submitAdvisorApplication(parsed.input);
  if (result.status === 'error') return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ status: 'received' });
}
