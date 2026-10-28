import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseToolData, parseToolDataWrite } from '@/lib/tool-data';

/**
 * מה שהלקוח הזין בכלים הפתוחים (src/lib/tool-data.ts).
 *
 * GET מחזיר את כל הכלים; PUT שומר כלי אחד, ו-data: null מוחק אותו. כל כלי
 * נכתב בנפרד בתוך העמודה, כדי ששני כלים ששומרים באותו רגע לא ידרסו זה את זה.
 */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { toolDataJson: true } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(parseToolData(user.toolDataJson));
}

export async function PUT(request: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const write = parseToolDataWrite(await request.json().catch(() => null));
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: 400 });

  const entry = write.data === null ? null : { ...write.data, savedAt: new Date().toISOString() };
  const updated =
    entry === null
      ? await prisma.$executeRaw`
          UPDATE "User"
          SET "toolDataJson" = COALESCE("toolDataJson", '{}'::jsonb) - ${write.key}::text
          WHERE "id" = ${userId}`
      : await prisma.$executeRaw`
          UPDATE "User"
          SET "toolDataJson" = jsonb_set(
            COALESCE("toolDataJson", '{}'::jsonb),
            ARRAY[${write.key}]::text[],
            ${JSON.stringify(entry)}::jsonb
          )
          WHERE "id" = ${userId}`;
  if (updated !== 1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true, savedAt: entry?.savedAt ?? null });
}
