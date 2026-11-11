import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import {
  buildCleanupBackup,
  buildCleanupPreview,
  parseSelection,
  runCleanup,
  selectionToken,
  validateSelection,
} from '@/lib/test-data-cleanup';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** מילת האישור שהיועץ מקליד לפני המחיקה */
const CONFIRM_WORD = 'מחק';

async function requireAdvisor() {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

/** מה יימחק ומה יישאר */
export async function GET() {
  const denied = await requireAdvisor();
  if (denied) return denied;
  return NextResponse.json(await buildCleanupPreview(), { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * action=backup — קובץ JSON עם כל השורות שיימחקו, וטביעת האצבע של הבחירה.
 * action=delete — המחיקה. דורשת את טביעת האצבע מהגיבוי ואת מילת האישור.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdvisor();
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  const selection = parseSelection(body.selection);

  const validation = await validateSelection(selection);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: validation.status });

  if (body.action === 'backup') {
    const backup = await buildCleanupBackup(selection);
    const stamp = backup.createdAt.slice(0, 19).replace(/[:T]/g, '-');
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="mashkalanta-test-data-backup-${stamp}.json"`,
        'X-Cleanup-Token': backup.token,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (body.action === 'delete') {
    if (body.token !== selectionToken(selection)) {
      return NextResponse.json({ error: 'יש להוריד גיבוי של הבחירה הזו לפני המחיקה.' }, { status: 409 });
    }
    if (typeof body.confirm !== 'string' || body.confirm.trim() !== CONFIRM_WORD) {
      return NextResponse.json({ error: `יש להקליד "${CONFIRM_WORD}" לאישור.` }, { status: 400 });
    }
    const result = await runCleanup(selection, validation.preview);
    console.info('[test-data-cleanup] done', JSON.stringify(result));
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
}
