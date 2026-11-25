import { NextRequest, NextResponse } from 'next/server';
import { guestSnapshotToToolData } from '@/lib/tool-data';
import { rateLimit } from '@/lib/rate-limit';
import {
  GUEST_CARRY_COOKIE,
  GUEST_CARRY_TTL_SECONDS,
  guestCarryExists,
  saveGuestCarry,
} from '@/lib/guest-carry';

/**
 * לפני היציאה לגוגל (src/lib/guest-carry.ts): הדפדפן שולח את מה שהזין בכלים,
 * ומקבל עוגייה ומזהה. אחרי מעבר לכתובת הרשמית של האתר, הדפדפן שולח את
 * המזהה שקיבל בכתובת האחרת, כדי שהעוגייה תהיה גם בכתובת הזו.
 */
export async function POST(request: NextRequest) {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
  const limit = await rateLimit(`guest-carry:${ip}`, { limit: 20, windowSeconds: 600 });
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { toolData?: unknown; token?: unknown } | null;
  let token: string | null = null;
  if (typeof body?.token === 'string' && body.token.length <= 100) {
    if (await guestCarryExists(body.token)) token = body.token;
  } else {
    const toolData = guestSnapshotToToolData(body?.toolData);
    if (toolData) token = await saveGuestCarry(toolData);
  }
  if (!token) return NextResponse.json({ token: null });

  const response = NextResponse.json({ token });
  response.cookies.set(GUEST_CARRY_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: GUEST_CARRY_TTL_SECONDS,
  });
  return response;
}
