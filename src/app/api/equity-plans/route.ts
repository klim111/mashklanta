import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { deleteEquityPlan, getEquityPlan, saveEquityPlan } from '@/lib/equity-plan-store';
import { isFinancingProfile, sanitizeExpenses } from '@/lib/equity-planning';

/** תכנון ההון העצמי של המשתמש המחובר. `null` — עדיין לא נשמר תכנון */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(await getEquityPlan(userId));
}

/** שמירת התכנון. הכלי שולח את הטבלה המלאה, והשרת גוזר ממנה את הסיכום */
export async function PUT(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'נתונים חסרים' }, { status: 400 });
  }

  const price = Number((body as Record<string, unknown>).propertyPrice);
  const targetDate = (body as Record<string, unknown>).targetDate;
  const profile = (body as Record<string, unknown>).financingProfile;

  const plan = await saveEquityPlan(userId, {
    propertyPrice: Number.isFinite(price) && price > 0 ? price : 0,
    targetDate: typeof targetDate === 'string' ? targetDate.slice(0, 10) : '',
    financingProfile: isFinancingProfile(profile) ? profile : 'first-home',
    usesBroker: (body as Record<string, unknown>).usesBroker === true,
    expenses: sanitizeExpenses((body as Record<string, unknown>).expenses),
  });

  return NextResponse.json(plan);
}

/** מחיקת התכנון — התחלה מחדש */
export async function DELETE() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await deleteEquityPlan(userId);
  return NextResponse.json({ ok: true });
}
