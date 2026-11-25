import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerAuth } from '@/lib/auth';
import { AccessError, setAdvisorPermission } from '@/lib/principal-approval/server';

const BodySchema = z.object({
  advisorId: z.string().min(1),
  canEdit: z.boolean(),
});

/** Advisors the client can choose to grant editing permission to. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await getServerAuth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

    const { caseId } = await params;
    const mortgageCase = await prisma.mortgageCase.findUnique({
      where: { id: caseId },
      select: { clientId: true, advisorId: true },
    });
    if (!mortgageCase) return NextResponse.json({ error: 'התיק לא נמצא' }, { status: 404 });
    if (mortgageCase.clientId !== userId) {
      return NextResponse.json({ error: 'רק הלקוח יכול לנהל הרשאות' }, { status: 403 });
    }

    // The advisors following this client, per the platform's Client records.
    const links = await prisma.client.findMany({
      where: { userId },
      include: { advisor: { select: { id: true, name: true, email: true } } },
    });
    const accesses = await prisma.approvalAccess.findMany({ where: { caseId } });
    const accessByAdvisor = new Map(accesses.map((a) => [a.advisorId, a]));

    const advisors = links.map((link) => {
      const access = accessByAdvisor.get(link.advisorId);
      return {
        advisorId: link.advisorId,
        advisorName: link.advisor.name,
        advisorEmail: link.advisor.email,
        canEdit: Boolean(access && !access.revokedAt && access.canEdit),
        grantedAt: access?.grantedAt.toISOString() ?? null,
        isAssigned: mortgageCase.advisorId === link.advisorId,
      };
    });

    return NextResponse.json(advisors);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'שגיאה' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await getServerAuth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

    const { caseId } = await params;
    const body = BodySchema.parse(await req.json());
    const access = await setAdvisorPermission(caseId, userId, body.advisorId, body.canEdit);
    return NextResponse.json({ ok: true, access });
  } catch (err: any) {
    if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
    return NextResponse.json({ error: err?.message ?? 'הפעולה נכשלה' }, { status: 500 });
  }
}
