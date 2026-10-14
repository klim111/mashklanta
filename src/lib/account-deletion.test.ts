import { beforeEach, describe, expect, it, vi } from 'vitest';

const { calls, db, del } = vi.hoisted(() => {
  const calls: string[] = [];
  const model = (name: string, findMany: unknown[] = []) => ({
    findMany: vi.fn(async () => findMany),
    deleteMany: vi.fn(async () => {
      calls.push(`${name}.deleteMany`);
      return { count: 0 };
    }),
    delete: vi.fn(async () => {
      calls.push(`${name}.delete`);
      return {};
    }),
});

const db = {
  user: { ...model('user'), findUnique: vi.fn() },
  client: model('client', [{ id: 'c1' }]),
  mortgagePlan: model('mortgagePlan', [{ id: 'p1' }]),
  planDocument: model('planDocument', [{ blobPath: 'plans/p1/a.pdf' }]),
  advisorLead: model('advisorLead', [{ files: [{ id: 'f', fileName: 'x.pdf', contentType: 'application/pdf', size: 1, blob: 'leads/b/x.pdf' }] }]),
  document: model('document', [{ s3Key: null }]),
  paymentLink: model('paymentLink'),
  mortgageMix: model('mortgageMix'),
  bankRateRequest: model('bankRateRequest'),
  advisorServiceOrder: model('advisorServiceOrder'),
  calculation: model('calculation'),
  siteVisit: model('siteVisit'),
  verificationToken: model('verificationToken'),
  pendingRegistration: model('pendingRegistration'),
  signupDraft: model('signupDraft'),
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn(db)),
};

const del = vi.fn(async () => undefined);
return { calls, db, del };
});

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('./db', () => ({ prisma: db }));
vi.mock('@vercel/blob', () => ({
  del: (...args: unknown[]) => del(...(args as [])),
  list: vi.fn(async ({ prefix }: { prefix: string }) => ({
    blobs: prefix.startsWith('conversation/') ? [{ pathname: `${prefix}chat.pdf` }] : [],
    hasMore: false,
  })),
  get: vi.fn(),
  put: vi.fn(),
  copy: vi.fn(),
  head: vi.fn(),
}));

import { confirmationMatches, deleteClientAccount } from './account-deletion';

describe('אישור הסרת החשבון', () => {
  it('דורש להקליד את המייל, בלי תלות ברישיות וברווחים', () => {
    expect(confirmationMatches('Dana@Example.com', ' dana@example.com ')).toBe(true);
    expect(confirmationMatches('dana@example.com', 'dana@example.co')).toBe(false);
    expect(confirmationMatches('', '')).toBe(false);
    expect(confirmationMatches('dana@example.com', undefined)).toBe(false);
  });
});

describe('deleteClientAccount', () => {
  beforeEach(() => {
    calls.length = 0;
    del.mockClear();
    process.env.BLOB_READ_WRITE_TOKEN = 'test';
  });

  it('לא מוחק חשבון יועץ', async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'a@b.c', role: 'ADVISOR' });
    const result = await deleteClientAccount('u1');
    expect(result.ok).toBe(false);
    expect(calls).toEqual([]);
  });

  it('מוחק את המשתמש, את מה שלא נמחק איתו ואת הקבצים', async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'dana@example.com', role: 'CLIENT' });
    const result = await deleteClientAccount('u1');
    expect(result.ok).toBe(true);
    expect(calls).toContain('advisorLead.deleteMany');
    expect(calls).toContain('mortgagePlan.deleteMany');
    expect(calls).toContain('pendingRegistration.deleteMany');
    expect(calls).toContain('signupDraft.deleteMany');
    expect(calls.at(-1)).toBe('user.delete');
    const deleted = del.mock.calls.flat().flat();
    expect(deleted).toEqual(
      expect.arrayContaining(['plans/p1/a.pdf', 'leads/b/x.pdf', 'conversation/u1/chat.pdf'])
    );
  });
});
