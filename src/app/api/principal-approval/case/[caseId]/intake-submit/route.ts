import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { submitIntake } from '@/lib/principal-approval/intake';

/** הלקוח לוחץ "שדר ליועץ" בסוף טופס פרטי הלקוח */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

  const { caseId } = await params;
  const result = await submitIntake(caseId, userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ submittedAt: result.submittedAt });
}
