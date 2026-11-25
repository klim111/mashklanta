import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createMixCategory, listMixCategories } from '@/lib/advisor';

/** הקטגוריות שהיועץ הגדיר לסידור התמהילים שאינם משויכים ללקוח */
export async function GET() {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(await listMixCategories(advisorId));
}

export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'נדרש שם לקטגוריה' }, { status: 400 });
  if (name.length > 40) {
    return NextResponse.json({ error: 'שם הקטגוריה ארוך מדי' }, { status: 400 });
  }

  const color = typeof body?.color === 'string' && body.color.trim() ? body.color.trim() : null;
  return NextResponse.json(await createMixCategory(advisorId, name, color), { status: 201 });
}
