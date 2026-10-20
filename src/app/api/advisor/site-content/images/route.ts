import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** העלאת תמונה לבאנר. הגוף הוא התמונה עצמה; התשובה — הכתובת הציבורית שלה */
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contentType = (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!TYPES.has(contentType)) {
    return NextResponse.json({ error: 'אפשר להעלות PNG, JPG, WEBP או GIF' }, { status: 415 });
  }
  const data = Buffer.from(await req.arrayBuffer());
  if (!data.length) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  if (data.length > MAX_BYTES) return NextResponse.json({ error: 'התמונה גדולה מ-2MB' }, { status: 413 });

  const image = await prisma.siteImage.create({
    data: { contentType, data, size: data.length, createdById: id },
    select: { id: true },
  });
  return NextResponse.json({ url: `/api/site-images/${image.id}` });
}
