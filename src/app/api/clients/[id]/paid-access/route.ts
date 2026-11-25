import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { readGrantInput } from '@/lib/granted-access';
import {
  clearClientGrantedAccess,
  getClientPaymentSettings,
  setClientGrantedAccess,
} from '@/lib/granted-access-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * טאב "תשלום והרשאה" בדף הלקוח אצל היועץ: הגישה בתשלום שהיועץ הגדיר ללקוח
 * וקישורי התשלום שלו (GET), הגדרה או עדכון של התקופה (PUT), וביטול (DELETE).
 */
async function advisorOf() {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session?.user?.role !== 'ADVISOR') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { advisorId };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const auth = await advisorOf();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const settings = await getClientPaymentSettings(auth.advisorId, id);
  if (!settings) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = await advisorOf();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const read = readGrantInput(await req.json().catch(() => null));
  if ('error' in read) return NextResponse.json({ error: read.error }, { status: 400 });
  const grant = await setClientGrantedAccess(auth.advisorId, id, read.input);
  if (!grant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ grant });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const auth = await advisorOf();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  if (!(await clearClientGrantedAccess(auth.advisorId, id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ grant: null });
}
