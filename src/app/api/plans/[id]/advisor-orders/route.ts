import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createOrder, listOrders } from '@/lib/advisor-order-store';
import { parseStages } from '@/lib/advisor-orders';

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

/** פתיחת בקשה חדשה לליווי בשלבים שנבחרו */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
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
