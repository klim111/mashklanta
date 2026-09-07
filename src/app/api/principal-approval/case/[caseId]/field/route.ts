import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuth } from '@/lib/auth';
import { AccessError, saveField } from '@/lib/principal-approval/server';
import { ENTITY_TYPES, type EntityType } from '@/lib/principal-approval/schema';

const BodySchema = z.object({
  entityType: z.enum(ENTITY_TYPES as [EntityType, ...EntityType[]]),
  entityId: z.string().min(1),
  fieldKey: z.string().min(1),
  value: z.any(),
});

/**
 * Autosave endpoint — one call per field, invoked as the user types (debounced).
 * Re-validates server-side and reports any conflict with the client profile.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await getServerAuth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });

    const { caseId } = await params;
    const body = BodySchema.parse(await req.json());
    const result = await saveField(caseId, userId, { ...body, value: body.value ?? null });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof AccessError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: 'נתונים לא תקינים' }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: err?.message ?? 'שמירה נכשלה' }, { status: 500 });
  }
}
