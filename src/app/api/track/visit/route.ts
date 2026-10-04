import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuth } from '@/lib/auth';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import {
  MAX_VIEW_MS,
  isBotAgent,
  isTrackingId,
  normalizeDevice,
  normalizePath,
  referrerHost,
} from '@/lib/site-analytics';

/**
 * רישום צפייה בעמוד, לדאשבורד הביקורים של היועץ. פתוח גם למי שלא מחובר.
 *
 * `start` נשלח כשעמוד נפתח ויוצר שורה; `duration` נשלח כשהעמוד מוסתר או
 * נעזב ומעדכן את זמן השהייה. הדפדפן מגריל את מזהה השורה בעצמו, כדי שעדכון
 * הזמן לא יחכה לתשובה מהשרת (ביציאה מהעמוד אין זמן לחכות).
 */
export async function POST(request: NextRequest) {
  // תמיד 204: כשל ברישום לא אמור להפריע לגלישה, ואין מה להחזיר לדפדפן
  const done = new NextResponse(null, { status: 204 });

  if (isBotAgent(request.headers.get('user-agent'))) return done;
  const limited = await rateLimit(`track:${getClientIp(request)}`, { limit: 600, windowSeconds: 600 });
  if (!limited.allowed) return done;

  // sendBeacon שולח את הגוף כטקסט, ולכן קוראים טקסט ולא json()
  const body = await request
    .text()
    .then((text) => JSON.parse(text))
    .catch(() => null);
  if (!body || !isTrackingId(body.id) || !isTrackingId(body.visitorId)) return done;

  try {
    if (body.type === 'duration') {
      const durationMs = Math.min(Math.max(Math.round(Number(body.durationMs) || 0), 0), MAX_VIEW_MS);
      // הזמן רק עולה — עדכון מאוחר שהגיע לפני מוקדם לא יקטין אותו
      await prisma.siteVisit.updateMany({
        where: { id: body.id, visitorId: body.visitorId, durationMs: { lt: durationMs } },
        data: { durationMs },
      });
      return done;
    }

    if (body.type !== 'start' || !isTrackingId(body.sessionId)) return done;
    const path = normalizePath(body.path);
    if (!path) return done;

    // הגלישה של היועץ עצמו לא נספרת
    const session = await getServerAuth().catch(() => null);
    if (session?.user?.role === 'ADVISOR') return done;

    await prisma.siteVisit.create({
      data: {
        id: body.id,
        visitorId: body.visitorId,
        sessionId: body.sessionId,
        path,
        referrer: referrerHost(body.referrer, request.nextUrl.hostname),
        device: normalizeDevice(body.device),
        userId: session?.user?.id ?? null,
      },
    });
  } catch {
    // שורה כפולה (שליחה חוזרת של אותה צפייה) או תקלה זמנית — מתעלמים
  }
  return done;
}
