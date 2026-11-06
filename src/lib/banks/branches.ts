import { prisma } from '@/lib/db';
import { BANKS, getBank } from './banks';

export interface BranchOption {
  bankCode: string;
  bankName: string;
  branchCode: string;
  branchName: string;
  address?: string | null;
  city?: string | null;
  /** "123 — רמת גן מרכז" */
  label: string;
}

function toOption(row: {
  bankCode: string;
  bankName: string;
  branchCode: string;
  branchName: string;
  address?: string | null;
  city?: string | null;
}): BranchOption {
  return {
    bankCode: row.bankCode,
    bankName: row.bankName,
    branchCode: row.branchCode,
    branchName: row.branchName,
    address: row.address ?? null,
    city: row.city ?? null,
    label: `${row.branchCode} — ${row.branchName}${row.city ? ` (${row.city})` : ''}`,
  };
}

/** All branches of one bank, ordered by branch code. */
export async function listBranches(bankCode: string, search?: string): Promise<BranchOption[]> {
  const rows = await prisma.bankBranch.findMany({
    where: {
      bankCode: String(bankCode),
      ...(search
        ? {
            OR: [
              { branchName: { contains: search } },
              { branchCode: { contains: search } },
              { city: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { branchCode: 'asc' },
    take: 800,
  });
  return rows.map(toOption);
}

export async function findBranch(bankCode: string, branchCode: string): Promise<BranchOption | null> {
  const row = await prisma.bankBranch.findUnique({
    where: { bankCode_branchCode: { bankCode: String(bankCode), branchCode: String(branchCode) } },
  });
  return row ? toOption(row) : null;
}

/** How many branches are catalogued per bank — drives the "catalogue not synced" hint. */
export async function branchCatalogueStatus(): Promise<Record<string, number>> {
  const grouped = await prisma.bankBranch.groupBy({
    by: ['bankCode'],
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const bank of BANKS) counts[bank.code] = 0;
  for (const row of grouped) counts[row.bankCode] = row._count._all;
  return counts;
}

/** Upsert helper used by the sync script and by manual imports. */
export async function upsertBranches(
  rows: {
    bankCode: string;
    bankName?: string;
    branchCode: string;
    branchName: string;
    address?: string | null;
    city?: string | null;
    zipCode?: string | null;
  }[],
): Promise<number> {
  let written = 0;
  for (const row of rows) {
    const bankCode = String(row.bankCode).trim();
    const branchCode = String(row.branchCode).trim();
    if (!bankCode || !branchCode) continue;
    const bankName = row.bankName?.trim() || getBank(bankCode)?.name || `בנק ${bankCode}`;
    const data = {
      bankCode,
      bankName,
      branchCode,
      branchName: row.branchName?.trim() || `סניף ${branchCode}`,
      address: row.address ?? null,
      city: row.city ?? null,
      zipCode: row.zipCode ?? null,
    };
    await prisma.bankBranch.upsert({
      where: { bankCode_branchCode: { bankCode, branchCode } },
      create: data,
      update: data,
    });
    written += 1;
  }
  return written;
}
