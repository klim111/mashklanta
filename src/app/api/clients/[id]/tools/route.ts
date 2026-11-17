import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisor } from '@/lib/platform-admin';
import { getClientToolSettings, setClientToolOverrides } from '@/lib/office-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * הכלים שהלקוח רואה: הגדרת המשרד, ומה שהיועץ פתח או סגר ללקוח הזה (PUT —
 * `{ overrides: { "<כלי>": "on" | "off" } }`). רק על לקוח שהיועץ מלווה.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireAdvisor();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const settings = await getClientToolSettings(auth.advisorId, id);
  if (!settings) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(settings, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = await requireAdvisor();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { overrides?: unknown } | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const settings = await setClientToolOverrides(auth.advisorId, id, body.overrides);
  if (!settings) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(settings);
}
