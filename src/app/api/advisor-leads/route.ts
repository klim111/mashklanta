import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createLead, parseLeadTopic } from '@/lib/advisor-leads';

/** פתיחת פנייה חדשה לליווי מהאזור האישי */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const lead = await createLead(userId, {
    topic: parseLeadTopic(body?.topic),
    name: typeof body?.name === 'string' ? body.name : '',
    phone: typeof body?.phone === 'string' ? body.phone : '',
    email: typeof body?.email === 'string' ? body.email : '',
    notes: typeof body?.notes === 'string' ? body.notes : undefined,
  });
  if (!lead) return NextResponse.json({ error: 'Missing details' }, { status: 400 });

  return NextResponse.json(lead, { status: 201 });
}
