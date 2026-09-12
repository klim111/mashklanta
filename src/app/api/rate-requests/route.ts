import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { findAccessibleClient } from '@/lib/clients';
import {
  listRateRequestsForClient,
  listRateRequestsForUser,
  parseRateRequestBody,
  saveRateRequest,
} from '@/lib/rate-requests';

/**
 * בקשות הריביות שהופקו לתמהילים. בלי פרמטר מוחזרות הבקשות של המשתמש, ועם
 * clientId — הבקשות של אותו לקוח, אחרי בדיקה שהמשתמש רשאי לגשת אליו.
 */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get('clientId');
  if (clientId) {
    const client = await findAccessibleClient(userId, clientId);
    if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(await listRateRequestsForClient(clientId));
  }

  return NextResponse.json(await listRateRequestsForUser(userId));
}

/** שמירת בקשה. שמירה חוזרת של אותה בקשה מעדכנת את הרשומה הקיימת */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = parseRateRequestBody(await req.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: 'Invalid rate request' }, { status: 400 });

  // לקוח ששומר בקשה משלו מקבל שיוך אוטומטי, כדי שהיועץ שלו יראה אותה מיד
  let clientId: string | null | undefined;
  if (session?.user?.role !== 'ADVISOR') {
    const own = await prisma.client.findFirst({ where: { userId }, select: { id: true } });
    if (own) clientId = own.id;
  }

  const saved = await saveRateRequest({ ownerId: userId, clientId, ...parsed });
  if (!saved) return NextResponse.json({ error: 'Invalid rate request' }, { status: 400 });

  return NextResponse.json(saved, { status: 201 });
}
