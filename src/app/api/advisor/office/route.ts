import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisor } from '@/lib/platform-admin';
import { getOrCreateAdvisorOffice, updateAdvisorOffice } from '@/lib/office-store';
import { publicSiteOrigin } from '@/lib/auth-url';

export const dynamic = 'force-dynamic';

/**
 * "המשרד שלי": השם, הקישור, המיתוג, הכלים שהלקוחות רואים, והאם המשרד פעיל.
 * כל יועץ קורא ועורך רק את המשרד שלו. `platformAdmin` אומר למסך אם להציג גם
 * את ניהול הפלטפורמה.
 */
function withLinks(req: NextRequest, office: Awaited<ReturnType<typeof getOrCreateAdvisorOffice>>, platformAdmin: boolean) {
  const origin = publicSiteOrigin(req.nextUrl.origin);
  return { office, platformAdmin, publicUrl: `${origin}${office.path}` };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdvisor();
  if (auth instanceof NextResponse) return auth;
  const office = await getOrCreateAdvisorOffice(auth.advisorId);
  return NextResponse.json(withLinks(req, office, auth.platformAdmin), { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdvisor();
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const result = await updateAdvisorOffice(auth.advisorId, body);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(withLinks(req, result.office, auth.platformAdmin));
}
