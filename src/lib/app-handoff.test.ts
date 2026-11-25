import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';

type Row = { identifier: string; token: string; expires: Date };

const { rows, db } = vi.hoisted(() => {
  const rows: Row[] = [];
  const db = {
    verificationToken: {
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) => rows.find((r) => r.token === where.token) ?? null),
      create: vi.fn(async ({ data }: { data: Row }) => {
        rows.push(data);
        return data;
      }),
      deleteMany: vi.fn(async ({ where }: { where: { token?: string; identifier?: { startsWith: string }; expires?: { lt: Date } } }) => {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) {
          const r = rows[i];
          const byToken = where.token !== undefined && r.token === where.token;
          const byExpiry =
            where.identifier !== undefined &&
            r.identifier.startsWith(where.identifier.startsWith) &&
            where.expires !== undefined &&
            r.expires < where.expires.lt;
          if (byToken || byExpiry) rows.splice(i, 1);
        }
        return { count: before - rows.length };
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { rows, db };
});

vi.mock('@/lib/db', () => ({ prisma: db }));

import { APP_HANDOFF_TTL_MS, challengeFor, consumeAppHandoff, isValidChallenge, issueAppHandoff } from './app-handoff';

const verifier = crypto.randomBytes(32).toString('base64url');
const challenge = challengeFor(verifier);

describe('העברת הכניסה עם Google לאפליקציה', () => {
  beforeEach(() => {
    rows.length = 0;
    vi.useRealTimers();
  });

  it('challenge תקין הוא SHA-256 ב-base64url', () => {
    expect(isValidChallenge(challenge)).toBe(true);
    expect(isValidChallenge('short')).toBe(false);
    expect(isValidChallenge(`${challenge.slice(0, 42)}=`)).toBe(false);
    expect(isValidChallenge(undefined)).toBe(false);
  });

  it('הקוד מחזיר את המשתמש עם הסוד הנכון, ופעם אחת בלבד', async () => {
    const code = await issueAppHandoff('user-1', challenge);
    expect(rows[0].token).not.toBe(code);
    expect(await consumeAppHandoff(code, verifier)).toBe('user-1');
    expect(await consumeAppHandoff(code, verifier)).toBeNull();
  });

  it('בלי הסוד הנכון הקוד לא עובד, ונשרף', async () => {
    const code = await issueAppHandoff('user-1', challenge);
    expect(await consumeAppHandoff(code, 'not-the-verifier')).toBeNull();
    expect(await consumeAppHandoff(code, verifier)).toBeNull();
  });

  it('קוד שפג תוקפו לא עובד', async () => {
    vi.useFakeTimers();
    const code = await issueAppHandoff('user-1', challenge);
    vi.advanceTimersByTime(APP_HANDOFF_TTL_MS + 1000);
    expect(await consumeAppHandoff(code, verifier)).toBeNull();
  });

  it('קוד של מנגנון אחר באותה טבלה לא מתקבל', async () => {
    rows.push({ identifier: 'password-reset:user-1', token: crypto.createHash('sha256').update('x').digest('hex'), expires: new Date(Date.now() + 60_000) });
    expect(await consumeAppHandoff('x', verifier)).toBeNull();
    expect(rows).toHaveLength(1);
  });
});
