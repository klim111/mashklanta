import { NextRequest, NextResponse } from 'next/server';
import { listBranches } from '@/lib/banks/branches';
import { getBank } from '@/lib/banks/banks';

/**
 * Branches of one bank, for the branch drop-down.
 * Returns `synced: false` when the catalogue has not been imported yet, so the
 * UI can fall back to manual entry of the branch number instead of blocking.
 */
export async function GET(req: NextRequest) {
  const bankCode = req.nextUrl.searchParams.get('bankCode');
  const search = req.nextUrl.searchParams.get('q') ?? undefined;
  if (!bankCode) return NextResponse.json({ error: 'חסר קוד בנק' }, { status: 400 });

  const bank = getBank(bankCode);
  if (!bank) return NextResponse.json({ error: 'בנק לא מוכר' }, { status: 404 });

  try {
    const branches = await listBranches(bankCode, search || undefined);
    return NextResponse.json({
      bank,
      branches,
      synced: branches.length > 0 || Boolean(search),
    });
  } catch (err: any) {
    return NextResponse.json({ bank, branches: [], synced: false, error: err?.message }, { status: 200 });
  }
}
