import { NextRequest, NextResponse } from 'next/server';
import { sendRenewalReminders } from '@/lib/billing';

/**
 * תזכורות על סוף חודש הגישה — Vercel מריץ את זה פעם ביום (vercel.json) ושולח
 * `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await sendRenewalReminders();
  return NextResponse.json(result);
}
