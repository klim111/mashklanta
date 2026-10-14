import { NextRequest, NextResponse } from 'next/server';
import { sendDailySummary } from '@/lib/daily-summary';

/**
 * מייל הסיכום היומי — Vercel מריץ את זה פעם ביום אחרי חצות שעון ישראל
 * (vercel.json) ושולח `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await sendDailySummary());
}
