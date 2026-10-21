import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { AccessError, loadCase } from '@/lib/principal-approval/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await getServerAuth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

    const { caseId } = await params;
    return NextResponse.json(await loadCase(caseId, userId));
  } catch (err: any) {
    if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err?.message ?? 'שגיאה בטעינת התיק' }, { status: 500 });
  }
}
