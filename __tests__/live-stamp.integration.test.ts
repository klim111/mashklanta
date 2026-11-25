/**
 * חותמת השינויים (src/lib/live-stamp.ts) מול בסיס נתונים אמיתי: כל הזנה של
 * הלקוח משנה את החותמת של היועץ, וכל הזנה של היועץ משנה את החותמת של הלקוח.
 *
 * הבדיקות כותבות לבסיס הנתונים שב-DATABASE_URL, ולכן הן לפי בקשה:
 *
 *   npx prisma migrate deploy
 *   LIVE_STAMP_DB_TESTS=1 npx vitest run __tests__/live-stamp.integration.test.ts
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { liveStampFor } from '@/lib/live-stamp';

const RUN_DB_TESTS = Boolean(process.env.LIVE_STAMP_DB_TESTS);

let advisorId = '';
let clientUserId = '';
let otherUserId = '';
let clientId = '';
let planId = '';

const both = async () => ({
  advisor: await liveStampFor(advisorId, 'ADVISOR'),
  client: await liveStampFor(clientUserId, 'CLIENT'),
});

beforeAll(async () => {
  if (!RUN_DB_TESTS) return;
  const tag = Date.now();
  const advisor = await prisma.user.create({ data: { email: `a${tag}@t.co`, role: 'ADVISOR' } });
  const client = await prisma.user.create({ data: { email: `c${tag}@t.co`, role: 'CLIENT' } });
  const other = await prisma.user.create({ data: { email: `o${tag}@t.co`, role: 'CLIENT' } });
  advisorId = advisor.id;
  clientUserId = client.id;
  otherUserId = other.id;
  clientId = (
    await prisma.client.create({ data: { advisorId, userId: clientUserId, name: 'לקוח', email: client.email! } })
  ).id;
  planId = (
    await prisma.mortgagePlan.create({
      data: { ownerId: clientUserId, clientId, name: 'תהליך', stages: { create: [{ stage: 'MIX' }] } },
    })
  ).id;
});

describe.skipIf(!RUN_DB_TESTS)('live stamp', () => {
  it('stays the same when nothing changed', async () => {
    expect(await both()).toEqual(await both());
  });

  it('changes on both sides when the client fills a stage', async () => {
    const before = await both();
    await prisma.mortgagePlanStage.updateMany({ where: { planId }, data: { dataJson: { amount: 1 } } });
    const after = await both();
    expect(after.advisor).not.toBe(before.advisor);
    expect(after.client).not.toBe(before.client);
  });

  it('changes on both sides when the advisor sets a meeting, and again when it is removed', async () => {
    const before = await both();
    const meeting = await prisma.advisorMeeting.create({
      data: { advisorId, clientId, title: 'פגישה', startsAt: new Date() },
    });
    const added = await both();
    expect(added.advisor).not.toBe(before.advisor);
    expect(added.client).not.toBe(before.client);

    await prisma.advisorMeeting.delete({ where: { id: meeting.id } });
    const removed = await both();
    expect(removed.client).not.toBe(added.client);
  });

  it('shows the advisor a new advisory request', async () => {
    const before = await both();
    await prisma.advisorServiceOrder.create({
      data: { planId, ownerId: clientUserId, clientId, stagesJson: ['MIX'], amount: 100 },
    });
    expect((await both()).advisor).not.toBe(before.advisor);
  });

  it('shows the advisor a new sign-up, without touching the client', async () => {
    const before = await both();
    await prisma.user.create({ data: { email: `n${Date.now()}@t.co`, role: 'CLIENT' } });
    const after = await both();
    expect(after.advisor).not.toBe(before.advisor);
    expect(after.client).toBe(before.client);
  });

  it('ignores what another client does', async () => {
    const before = await liveStampFor(clientUserId, 'CLIENT');
    await prisma.mortgagePlan.create({ data: { ownerId: otherUserId, name: 'אחר' } });
    expect(await liveStampFor(clientUserId, 'CLIENT')).toBe(before);
  });
});
