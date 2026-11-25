import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** תמונת באנר שהיועץ העלה — ציבורית, ולא משתנה אחרי ההעלאה */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{1,40}$/.test(id)) return new NextResponse(null, { status: 404 });
  const image = await prisma.siteImage.findUnique({ where: { id }, select: { contentType: true, data: true } });
  if (!image) return new NextResponse(null, { status: 404 });
  // עותק עם ArrayBuffer משלו — זה מה ש-Response מקבל
  return new NextResponse(new Uint8Array(image.data).buffer as ArrayBuffer, {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
