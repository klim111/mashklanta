import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import {
  cancelStageHandoff,
  createOrder,
  listOrders,
  requestStageHandoff,
} from '@/lib/advisor-order-store';
import { parseStages } from '@/lib/advisor-orders';
import { isPlanStage } from '@/lib/mortgage-plan';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** הזמנות הליווי של התהליך — גם ללקוח וגם ליועץ שמלווה אותו */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  return NextResponse.json(await listOrders(userId, id));
}

/**
 * פתיחת בקשת ליווי.
 *
 * `free: true` פותח בקשה חינמית לשלב אחד — היועץ מטפל, התשלום בהמשך. אחרת זו
 * הזמנה בתשלום לשלבים שנבחרו, שממתינה למסך התשלום.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (body?.free === true) {
    if (!isPlanStage(body?.stage)) {
      return NextResponse.json({ error: 'No stage' }, { status: 400 });
    }
    const order = await requestStageHandoff(userId, id, body.stage);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(order, { status: 201 });
  }

  const stages = parseStages(body?.stages);
  if (stages.length === 0) {
    return NextResponse.json({ error: 'No stages selected' }, { status: 400 });
  }

  const order = await createOrder(
    userId,
    id,
    stages,
    typeof body?.note === 'string' ? body.note : undefined
  );
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(order, { status: 201 });
}

/** ביטול בקשת ליווי חינמית לשלב — הלקוח חוזר לעבוד עליו בעצמו */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const stage = req.nextUrl.searchParams.get('stage');
  if (!isPlanStage(stage)) {
    return NextResponse.json({ error: 'No stage' }, { status: 400 });
  }
  const ok = await cancelStageHandoff(userId, id, stage);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
