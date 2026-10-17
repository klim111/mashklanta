import { NextResponse } from 'next/server';
import { BANKS } from '@/lib/banks/banks';
import { branchCatalogueStatus } from '@/lib/banks/branches';

/** Bank list plus how many branches are catalogued for each. */
export async function GET() {
  try {
    const counts = await branchCatalogueStatus();
    return NextResponse.json(
      BANKS.map((bank) => ({ ...bank, branchCount: counts[bank.code] ?? 0 })),
    );
  } catch {
    return NextResponse.json(BANKS.map((bank) => ({ ...bank, branchCount: 0 })));
  }
}
