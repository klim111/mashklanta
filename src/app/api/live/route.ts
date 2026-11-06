import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { liveStampFor } from '@/lib/live-stamp';

export const dynamic = 'force-dynamic';

/**
 * "האם משהו השתנה" — חותמת קצרה שהמסכים הפתוחים בודקים כל כמה שניות. כשהיא
 * משתנה, הם טוענים מחדש את מה שהם מציגים (src/hooks/useLiveRefresh.ts).
 */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stamp = await liveStampFor(userId, session.user?.role);
  return NextResponse.json({ stamp }, { headers: { 'Cache-Control': 'no-store' } });
}
