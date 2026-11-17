import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { ALL_TOOLS_OPEN } from '@/lib/office';
import { getOrCreateAdvisorOffice, officeForClient } from '@/lib/office-store';

export const dynamic = 'force-dynamic';

/**
 * האזור האישי של הלקוח: המשרד שהוא משויך אליו (כשהמשרד פעיל) — לוגו, צבע
 * ופרטי קשר — ואילו כלים פתוחים לו. יועץ בתצוגה כלקוח רואה את המשרד שלו
 * וכל הכלים פתוחים.
 */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session?.user?.role === 'ADVISOR') {
    const office = await getOrCreateAdvisorOffice(userId);
    return NextResponse.json(
      {
        office: office.published
          ? { slug: office.slug, name: office.name, profile: office.profile, publicTools: office.tools.publicTools }
          : null,
        tools: ALL_TOOLS_OPEN,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(await officeForClient(userId), { headers: { 'Cache-Control': 'no-store' } });
}
