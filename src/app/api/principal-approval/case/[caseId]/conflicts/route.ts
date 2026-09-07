import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuth } from '@/lib/auth';
import { AccessError, loadCase, resolveConflict } from '@/lib/principal-approval/server';

const ResolveSchema = z.object({
  conflictId: z.string().min(1),
  choice: z.enum(['profile', 'case']),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await getServerAuth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

    const { caseId } = await params;
    const dto = await loadCase(caseId, userId);
    return NextResponse.json(dto.conflicts.filter((c) => c.status === 'open'));
  } catch (err: any) {
    if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err?.message ?? 'שגיאה' }, { status: 500 });
  }
}

/** Applies the user's choice and propagates it to the client profile. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await getServerAuth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

    const { caseId } = await params;
    const body = ResolveSchema.parse(await req.json());
    const applied = await resolveConflict(caseId, userId, body.conflictId, body.choice);
    return NextResponse.json({ ok: true, applied });
  } catch (err: any) {
    if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
    return NextResponse.json({ error: err?.message ?? 'הפעולה נכשלה' }, { status: 500 });
  }
}
