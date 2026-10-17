/**
 * End-to-end coverage of the principal-approval service layer against a real
 * database: profile pre-fill, conflict detection and write-back, advisor
 * permissions, repeatable rows and persistence.
 *
 * These tests write to the database in DATABASE_URL, so they are opt-in:
 *
 *   DATABASE_URL="file:./test.db" npx prisma migrate deploy
 *   PRINCIPAL_APPROVAL_DB_TESTS=1 DATABASE_URL="file:./test.db" npx vitest run \
 *     __tests__/principal-approval.integration.test.ts
 */

import { describe, expect, it, beforeAll } from 'vitest';

const RUN_DB_TESTS = Boolean(process.env.PRINCIPAL_APPROVAL_DB_TESTS);
import { prisma } from '@/lib/db';
import {
  CASE_ENTITY_ID,
  ensureCaseForClient,
  loadCase,
  saveField,
  addEntity,
  removeEntity,
  resolveConflict,
  setAdvisorPermission,
  caseCompleteness,
  AccessError,
} from '@/lib/principal-approval/server';

let clientId = '';
let advisorId = '';
let clientRecordId = '';
let caseId = '';

beforeAll(async () => {
  if (!RUN_DB_TESTS) return;
  const stamp = Date.now();
  const client = await prisma.user.create({
    data: {
      email: `c${stamp}@t.co`,
      name: 'ישראל ישראלי',
      // The profile lives on the user, as everywhere else in this codebase.
      profileJson: { equity: 500000, employmentType: 'SALARIED', household: 'SINGLE' },
    },
  });
  const advisor = await prisma.user.create({
    data: { email: `a${stamp}@t.co`, name: 'יועץ', role: 'ADVISOR' },
  });
  clientId = client.id;
  advisorId = advisor.id;
  // The advisor↔client link is the platform's own Client record.
  clientRecordId = (
    await prisma.client.create({
      data: { advisorId, userId: clientId, name: 'ישראל ישראלי', email: `c${stamp}@t.co` },
    })
  ).id;
  caseId = await ensureCaseForClient(clientId, advisorId);
});

describe.skipIf(!RUN_DB_TESTS)('case lifecycle', () => {
  it('pre-fills from the client profile', async () => {
    const dto = await loadCase(caseId, clientId);
    const borrower = dto.entities.borrower[0];
    // Name comes from the user record and is split for pre-fill.
    expect(borrower.values.firstName).toBe('ישראל');
    expect(borrower.values.lastName).toBe('ישראלי');
    expect(borrower.meta.firstName.source).toBe('profile');
    // Two-way mapped values come from profileJson.
    expect(borrower.values.employmentStatus).toBe('employee');
    expect(dto.caseValues.totalEquity).toBe(500000);
    expect(dto.entities.income).toHaveLength(1);
    expect(dto.entities.bankAccount).toHaveLength(1);
    expect(dto.entities.fundingSource).toHaveLength(1);
  });

  it('is idempotent — a second call returns the same case', async () => {
    expect(await ensureCaseForClient(clientId)).toBe(caseId);
  });

  it('saves a field and records provenance', async () => {
    const dto = await loadCase(caseId, clientId);
    const borrowerId = dto.entities.borrower[0].id;
    const res = await saveField(caseId, clientId, {
      entityType: 'borrower', entityId: borrowerId, fieldKey: 'phone', value: '050-1234567',
    });
    expect(res.meta.source).toBe('client');
    const after = await loadCase(caseId, clientId);
    expect(after.entities.borrower[0].values.phone).toBe('050-1234567');
  });

  it('rejects an invalid value server-side', async () => {
    const dto = await loadCase(caseId, clientId);
    const borrowerId = dto.entities.borrower[0].id;
    await expect(
      saveField(caseId, clientId, { entityType: 'borrower', entityId: borrowerId, fieldKey: 'idNumber', value: '111111111' }),
    ).rejects.toThrow(AccessError);
  });

  it('raises a conflict when a pre-filled value is changed', async () => {
    const res = await saveField(caseId, clientId, {
      entityType: 'case', entityId: CASE_ENTITY_ID, fieldKey: 'totalEquity', value: 620000,
    });
    expect(res.conflict).toBeTruthy();
    expect(res.conflict!.profileValue).toBe(500000);
    expect(res.conflict!.caseValue).toBe(620000);
  });

  it('writes the chosen value back to the profile on resolution', async () => {
    const dto = await loadCase(caseId, clientId);
    const conflict = dto.conflicts.find((c) => c.status === 'open' && c.fieldKey === 'totalEquity')!;
    await resolveConflict(caseId, clientId, conflict.id, 'case');
    const user = await prisma.user.findUnique({ where: { id: clientId }, select: { profileJson: true } });
    expect((user!.profileJson as any).equity).toBe(620000);
    const after = await loadCase(caseId, clientId);
    expect(after.conflicts.filter((c) => c.status === 'open')).toHaveLength(0);
    expect(after.caseValues.totalEquity).toBe(620000);
  });

  it('stores sensitive values encrypted at rest', async () => {
    const row = await prisma.caseField.findFirst({
      where: { caseId, entityType: 'case', fieldKey: 'totalEquity' },
    });
    // The equity figure must not be readable straight off the column.
    expect(row!.value).toBeNull();
    expect(row!.valueEnc).toBeTruthy();
    expect(row!.valueEnc).not.toContain('620000');
    // …but it round-trips through the service layer.
    const dto = await loadCase(caseId, clientId);
    expect(dto.caseValues.totalEquity).toBe(620000);
  });

  it('does not raise a conflict for a value the profile cannot express', async () => {
    const dto = await loadCase(caseId, clientId);
    const borrowerId = dto.entities.borrower[0].id;
    const res = await saveField(caseId, clientId, {
      entityType: 'borrower', entityId: borrowerId, fieldKey: 'employmentStatus', value: 'pensioner',
    });
    expect(res.conflict).toBeNull();
  });

  it('locks client-entered fields for the advisor until permission is granted', async () => {
    const dto = await loadCase(caseId, advisorId);
    expect(dto.viewer.role).toBe('advisor');
    expect(dto.viewer.canEditClientFields).toBe(false);
    const borrowerId = dto.entities.borrower[0].id;

    await expect(
      saveField(caseId, advisorId, { entityType: 'borrower', entityId: borrowerId, fieldKey: 'phone', value: '050-7654321' }),
    ).rejects.toThrow(/הרשאה/);

    // An empty field is still fillable by the advisor, and marked as such.
    const res = await saveField(caseId, advisorId, {
      entityType: 'borrower', entityId: borrowerId, fieldKey: 'city', value: 'תל אביב',
    });
    expect(res.meta.source).toBe('advisor');

    await setAdvisorPermission(caseId, clientId, advisorId, true);
    const granted = await loadCase(caseId, advisorId);
    expect(granted.viewer.canEditClientFields).toBe(true);
    await saveField(caseId, advisorId, { entityType: 'borrower', entityId: borrowerId, fieldKey: 'phone', value: '050-7654321' });
    const after = await loadCase(caseId, advisorId);
    expect(after.entities.borrower[0].values.phone).toBe('050-7654321');
    expect(after.entities.borrower[0].meta.phone.source).toBe('advisor');
  });

  it('blocks an unrelated user entirely', async () => {
    const stranger = await prisma.user.create({ data: { email: `s${Date.now()}@t.co` } });
    await expect(loadCase(caseId, stranger.id)).rejects.toThrow(AccessError);
  });

  it('only lets the client change permissions', async () => {
    await expect(setAdvisorPermission(caseId, advisorId, advisorId, true)).rejects.toThrow(/הלקוח/);
  });

  it('refuses to grant permission to an advisor who does not follow the client', async () => {
    const stranger = await prisma.user.create({
      data: { email: `x${Date.now()}@t.co`, role: 'ADVISOR' },
    });
    await expect(setAdvisorPermission(caseId, clientId, stranger.id, true)).rejects.toThrow(/מלווה/);
  });

  it('adds and removes rows, keeping positions sequential', async () => {
    const second = await addEntity(caseId, clientId, 'borrower');
    expect(second.position).toBe(1);
    const dto = await loadCase(caseId, clientId);
    expect(dto.entities.borrower).toHaveLength(2);
    // A new borrower gets an income row of their own.
    expect(dto.entities.income.filter((i) => i.parentId === second.id)).toHaveLength(1);

    const third = await addEntity(caseId, clientId, 'borrower');
    await removeEntity(caseId, clientId, second.id);
    const after = await loadCase(caseId, clientId);
    expect(after.entities.borrower.map((b) => b.position)).toEqual([0, 1]);
    expect(after.entities.borrower.some((b) => b.id === third.id)).toBe(true);
    // Removing a borrower removes their income rows too.
    expect(after.entities.income.some((i) => i.parentId === second.id)).toBe(false);
    await removeEntity(caseId, clientId, third.id);
  });

  it('refuses to remove the primary borrower', async () => {
    const dto = await loadCase(caseId, clientId);
    await expect(removeEntity(caseId, clientId, dto.entities.borrower[0].id)).rejects.toThrow(/הלווה הראשי/);
  });

  it('pushes derived totals to the profile without asking', async () => {
    const dto = await loadCase(caseId, clientId);
    const income = dto.entities.income.find((i) => i.parentId === dto.entities.borrower[0].id)!;
    await saveField(caseId, clientId, {
      entityType: 'income', entityId: income.id, fieldKey: 'monthlyAmount', value: 18000,
    });
    const user = await prisma.user.findUnique({ where: { id: clientId }, select: { profileJson: true } });
    expect((user!.profileJson as any).income).toBe(18000);
  });

  it('persists values across a reload (survives refresh)', async () => {
    const dto = await loadCase(caseId, clientId);
    await saveField(caseId, clientId, { entityType: 'case', entityId: CASE_ENTITY_ID, fieldKey: 'loanTimeframe', value: '2m' });
    const reloaded = await loadCase(caseId, clientId);
    expect(reloaded.caseValues.loanTimeframe).toBe('2m');
    expect(caseCompleteness(reloaded).total).toBeGreaterThan(0);
  });
});
