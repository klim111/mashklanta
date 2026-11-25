import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { getClientProcess } from '@/lib/advisor';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * חמשת השלבים של הלקוח בעיני היועץ: ההתקדמות מתוך תהליך התכנון של הלקוח,
 * ועליה המשימות, ההערות והפגישות שהיועץ הוסיף בכל שלב.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const planId = req.nextUrl.searchParams.get('planId') ?? undefined;
  const process = await getClientProcess(advisorId, id, planId);
  if (!process) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(process);
}
