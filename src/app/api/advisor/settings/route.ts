import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { listMixCategories, listRateDefaults, saveRateDefaults } from '@/lib/advisor';
import { AMORTIZATION_TYPES, MORTGAGE_BANKS, TRACK_TYPES } from '@/components/mortgage-advisor/types';

const BANKS = MORTGAGE_BANKS as readonly string[];
const AMORTIZATIONS = Object.keys(AMORTIZATION_TYPES);
const TRACKS = Object.keys(TRACK_TYPES);

/** רשומת ריבית תקינה: בנק, לוח סילוקין וסוג מסלול שהמערכת מכירה */
function readEntry(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const bank = typeof item.bank === 'string' ? item.bank : '';
  const amortizationType = typeof item.amortizationType === 'string' ? item.amortizationType : '';
  const trackType = typeof item.trackType === 'string' ? item.trackType : '';

  if (!BANKS.includes(bank)) return null;
  if (!AMORTIZATIONS.includes(amortizationType)) return null;
  if (!TRACKS.includes(trackType)) return null;

  // ריבית ריקה מוחקת את הערך השמור, כדי לחזור לריבית הכללית של המערכת
  const rate =
    item.rate === null || item.rate === '' ? null : Number(item.rate);
  if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 25)) return null;

  return { bank, amortizationType, trackType, rate };
}

/** ריביות ברירת המחדל והקטגוריות של היועץ */
export async function GET() {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [rates, categories] = await Promise.all([
    listRateDefaults(advisorId),
    listMixCategories(advisorId),
  ]);
  return NextResponse.json({ rates, categories });
}

/**
 * שמירת ריביות ברירת המחדל. נשמרות רק הרשומות שנשלחו — כך שעריכה של בנק אחד
 * אינה נוגעת במה שהיועץ הגדיר לבנקים האחרים.
 */
export async function PUT(req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.rates)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const entries = body.rates.flatMap((raw: unknown) => {
    const entry = readEntry(raw);
    return entry ? [entry] : [];
  });

  const rates = await saveRateDefaults(advisorId, entries);
  return NextResponse.json({ rates, categories: await listMixCategories(advisorId) });
}
