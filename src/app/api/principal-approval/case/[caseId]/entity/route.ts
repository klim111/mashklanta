import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuth } from '@/lib/auth';
import { AccessError, addEntity, removeEntity } from '@/lib/principal-approval/server';
import { REPEATABLE_ENTITIES, type EntityType } from '@/lib/principal-approval/schema';

const AddSchema = z.object({
  type: z.enum(REPEATABLE_ENTITIES as [EntityType, ...EntityType[]]),
  parentId: z.string().nullish(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await getServerAuth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

    const { caseId } = await params;
    const body = AddSchema.parse(await req.json());
    const entity = await addEntity(caseId, userId, body.type, body.parentId ?? null);
    return NextResponse.json({ ok: true, entity }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
    return NextResponse.json({ error: err?.message ?? 'ההוספה נכשלה' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await getServerAuth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

    const { caseId } = await params;
    const entityId = req.nextUrl.searchParams.get('entityId');
    if (!entityId) return NextResponse.json({ error: 'חסר מזהה רשומה' }, { status: 400 });

    await removeEntity(caseId, userId, entityId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err?.message ?? 'ההסרה נכשלה' }, { status: 500 });
  }
}
