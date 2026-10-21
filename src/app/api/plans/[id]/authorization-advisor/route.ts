import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { missingAdvisorDetails, parseAdvisorDetails } from '@/lib/authorization-forms';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * פרטי היועץ שמלווה את התהליך, למילוי טפסי כתבי ההסמכה אצל הלקוח.
 * רק לבעל התהליך, ורק הפרטים שהיועץ שמר לשם כך.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.mortgagePlan.findFirst({
    where: { id, ownerId: userId },
    select: { client: { select: { advisor: { select: { name: true, advisorDetailsJson: true } } } } },
  });
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const advisor = plan.client?.advisor;
  if (!advisor) return NextResponse.json({ advisor: null, missing: [] });
  const details = parseAdvisorDetails(advisor.advisorDetailsJson, advisor.name);
  return NextResponse.json({ advisor: details, missing: missingAdvisorDetails(details) });
}
