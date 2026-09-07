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
  ensureCaseForClient,
  loadCase,
  saveField,
  addEntity,
  removeEntity,
  resolveConflict,
  setAdvisorPermission,
  caseCompleteness,
  CASE_ENTITY_ID,
  AccessError,
} from '@/lib/principal-approval/server';

let clientId = '';
let advisorId = '';
let caseId = '';

beforeAll(async () => {
  if (!RUN_DB_TESTS) return;
  const client = await prisma.user.create({ data: { email: `c${Date.now()}@t.co`, name: 'לקוח' } });
  const advisor = await prisma.user.create({ data: { email: `a${Date.now()}@t.co`, name: 'יועץ', role: 'advisor' } });
  clientId = client.id;
  advisorId = advisor.id;
  await prisma.clientProfile.create({
    data: { userId: clientId, dataJson: { firstName: 'ישראל', lastName: 'ישראלי', idNumber: '123456782', totalEquity: 500000 } },
  });
  await prisma.advisorClient.create({ data: { advisorId, clientId } });
  caseId = await ensureCaseForClient(clientId, advisorId);
});

describe.skipIf(!RUN_DB_TESTS)('case lifecycle', () => {
  it('pre-fills from the client profile', async () => {
    const dto = await loadCase(caseId, clientId);
    const borrower = dto.entities.borrower[0];
    expect(borrower.values.firstName).toBe('ישראל');
    expect(borrower.meta.firstName.source).toBe('profile');
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
    const dto = await loadCase(caseId, clientId);
    const borrowerId = dto.entities.borrower[0].id;
    const res = await saveField(caseId, clientId, {
      entityType: 'borrower', entityId: borrowerId, fieldKey: 'firstName', value: 'משה',
    });
    expect(res.conflict).toBeTruthy();
    expect(res.conflict!.profileValue).toBe('ישראל');
    expect(res.conflict!.caseValue).toBe('משה');
  });

  it('writes the chosen value back to the profile on resolution', async () => {
    const dto = await loadCase(caseId, clientId);
    const conflict = dto.conflicts.find((c) => c.status === 'open' && c.fieldKey === 'firstName')!;
    await resolveConflict(caseId, clientId, conflict.id, 'case');
    const profile = await prisma.clientProfile.findUnique({ where: { userId: clientId } });
    expect((profile!.dataJson as any).firstName).toBe('משה');
    const after = await loadCase(caseId, clientId);
    expect(after.conflicts.filter((c) => c.status === 'open')).toHaveLength(0);
    expect(after.entities.borrower[0].values.firstName).toBe('משה');
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

  it('does not raise a conflict for a non-primary borrower', async () => {
    const extra = await addEntity(caseId, clientId, 'borrower');
    const res = await saveField(caseId, clientId, {
      entityType: 'borrower', entityId: extra.id, fieldKey: 'firstName', value: 'שרה',
    });
    expect(res.conflict).toBeNull();
    await removeEntity(caseId, clientId, extra.id);
  });

  it('persists values across a reload (survives refresh)', async () => {
    const dto = await loadCase(caseId, clientId);
    await saveField(caseId, clientId, { entityType: 'case', entityId: CASE_ENTITY_ID, fieldKey: 'loanTimeframe', value: '2m' });
    const reloaded = await loadCase(caseId, clientId);
    expect(reloaded.caseValues.loanTimeframe).toBe('2m');
    expect(caseCompleteness(reloaded).total).toBeGreaterThan(0);
  });
});
