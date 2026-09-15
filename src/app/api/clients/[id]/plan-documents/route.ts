import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { listClientDocuments } from '@/lib/plan-documents';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** המסמכים שהלקוח העלה בתהליכי המשכנתא שלו — לעיני היועץ שמלווה אותו */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  return NextResponse.json(await listClientDocuments(advisorId, id));
}
