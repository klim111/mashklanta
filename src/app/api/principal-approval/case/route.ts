import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerAuth } from '@/lib/auth';
import { AccessError, ensureCaseForClient, loadCase } from '@/lib/principal-approval/server';

const QuerySchema = z.object({
  clientId: z.string().optional(),
  clientEmail: z.string().email().optional(),
});

/**
 * Returns the principal-approval case for the signed-in client, or — when an
 * advisor passes `clientId` / `clientEmail` — the case of that client.
 * Creates and pre-fills the case on first access.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

    const params = QuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    let clientId = userId;
    let advisorId: string | undefined;

    if (params.clientId || params.clientEmail) {
      const target = await prisma.user.findFirst({
        where: params.clientId ? { id: params.clientId } : { email: params.clientEmail! },
        select: { id: true },
      });
      if (!target) return NextResponse.json({ error: 'הלקוח לא נמצא' }, { status: 404 });

      if (target.id !== userId) {
        const link = await prisma.advisorClient.findUnique({
          where: { advisorId_clientId: { advisorId: userId, clientId: target.id } },
        });
        if (!link) return NextResponse.json({ error: 'הלקוח אינו משויך אליך' }, { status: 403 });
        advisorId = userId;
      }
      clientId = target.id;
    }

    const caseId = await ensureCaseForClient(clientId, advisorId);
    const dto = await loadCase(caseId, userId);
    return NextResponse.json(dto);
  } catch (err: any) {
    if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: err?.message ?? 'שגיאה בטעינת התיק' }, { status: 500 });
  }
}
