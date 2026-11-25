import { NextRequest, NextResponse } from 'next/server';
import { setOfficeSuspended } from '@/lib/advisor-applications';
import { requirePlatformAdmin } from '@/lib/platform-admin';

type RouteContext = { params: Promise<{ id: string }> };

/** השעיה או החזרה של משרד: { suspended: boolean } */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requirePlatformAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.suspended !== 'boolean') return NextResponse.json({ error: 'חסר suspended' }, { status: 400 });
  const result = await setOfficeSuspended(id, body.suspended);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
