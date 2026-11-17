import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';

/**
 * העלאת תמונה לבסיס הנתונים (SiteImage), שמוגשת לכל גולש מ-/api/site-images/<id>.
 * משמשת את באנרי האתר ואת הלוגו והתמונה של המשרד. רק תמונות רסטר — בלי SVG,
 * שיכול להכיל קוד.
 */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export async function storeUploadedImage(req: NextRequest, createdById: string): Promise<NextResponse> {
  const contentType = (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!TYPES.has(contentType)) {
    return NextResponse.json({ error: 'אפשר להעלות PNG, JPG, WEBP או GIF' }, { status: 415 });
  }
  const data = Buffer.from(await req.arrayBuffer());
  if (!data.length) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  if (data.length > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'התמונה גדולה מ-2MB' }, { status: 413 });

  const image = await prisma.siteImage.create({
    data: { contentType, data, size: data.length, createdById },
    select: { id: true },
  });
  return NextResponse.json({ url: `/api/site-images/${image.id}` });
}
