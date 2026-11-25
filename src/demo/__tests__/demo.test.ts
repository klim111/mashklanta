import { describe, expect, it } from 'vitest';
import { DEMO_CATALOG, demoById, featuredDemos } from '../catalog';
import { DemoApiRouter, isPassthrough } from '../sandbox/api-router';
import { readingTime, renderTemplate, resolveText } from '../engine/text';
import type { DemoState } from '../types';

const state: DemoState = { values: { income: 25000, years: 30, ltv: 70.5, name: 'דנה' }, userSet: [] };

describe('demo catalog', () => {
  it('has unique ids and loadable flows whose ids match', async () => {
    const ids = DEMO_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of DEMO_CATALOG) {
      const flow = (await entry.load()).default;
      expect(flow.id).toBe(entry.id);
      expect(flow.steps.length).toBeGreaterThan(3);
      // כל צעד: מזהה ייחודי וכתובית
      const stepIds = flow.steps.map((step) => step.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
      flow.steps.forEach((step) => expect(step.caption).toBeTruthy());
      // הדגמות ההמשך קיימות בקטלוג
      (flow.nextDemos ?? []).forEach((next) => expect(demoById(next)).not.toBeNull());
    }
  });

  it('features the tool demos in catalog order and keeps the overview out of the cards', () => {
    const featured = featuredDemos();
    expect(featured.map((entry) => entry.id)).not.toContain('overview');
    expect(featured.map((entry) => entry.order)).toEqual([...featured.map((entry) => entry.order)].sort((a, b) => a - b));
  });
});

describe('caption templates', () => {
  it('formats money, years and percentages in Hebrew', () => {
    expect(renderTemplate('הכנסה {{income|money}}', state)).toBe('הכנסה ₪25,000');
    expect(renderTemplate('{{years|years}}', state)).toBe('30 שנים');
    expect(renderTemplate('{{ltv|pct}}', state)).toBe('70.5%');
    expect(renderTemplate('{{name}} / {{missing}}', state)).toBe('דנה / ');
    expect(resolveText((s) => `x${s.values.years}`, state)).toBe('x30');
  });

  it('bounds the reading time', () => {
    expect(readingTime('')).toBe(3000);
    expect(readingTime('א'.repeat(1000))).toBe(9500);
  });
});

describe('demo api router', () => {
  const url = (path: string) => new URL(path, 'http://localhost');

  it('passes through public market reads only', () => {
    expect(isPassthrough('/api/boi/rates', 'GET')).toBe(true);
    expect(isPassthrough('/api/boi/rates', 'POST')).toBe(false);
    expect(isPassthrough('/api/plans', 'GET')).toBe(false);
  });

  it('serves the demo session and persona data without touching a server', async () => {
    const router = new DemoApiRouter();
    const session = await (await router.handle(url('/api/auth/session'))).json();
    expect(session.user.id).toBe('demo-user');
    const plans = await (await router.handle(url('/api/plans'))).json();
    expect(plans[0].id).toBe('demo');
    const mixes = await (await router.handle(url('/api/mixes'))).json();
    expect(mixes.length).toBe(2);
  });

  it('keeps writes in memory', async () => {
    const router = new DemoApiRouter();
    const created = await (
      await router.handle(url('/api/client-tasks'), {
        method: 'POST',
        body: JSON.stringify({ title: 'משימה חדשה', kind: 'TASK', planId: 'demo', stage: null, dueAt: null }),
      })
    ).json();
    expect(created.id).toMatch(/^demo-task/);
    const list = await (await router.handle(url('/api/client-tasks'))).json();
    expect(list.some((task: { id: string }) => task.id === created.id)).toBe(true);
    await router.handle(url(`/api/client-tasks/${created.id}`), { method: 'PATCH', body: JSON.stringify({ status: 'DONE' }) });
    const after = await (await router.handle(url('/api/client-tasks'))).json();
    expect(after.find((task: { id: string }) => task.id === created.id).status).toBe('DONE');
    expect(router.log.every((entry) => entry.path.startsWith('/api/'))).toBe(true);
  });

  it('signals sign-out instead of logging a real user out', async () => {
    let signedOut = false;
    const router = new DemoApiRouter({ onSignOut: () => (signedOut = true) });
    const body = await (await router.handle(url('/api/auth/signout'), { method: 'POST' })).json();
    expect(body.url).toBe('/');
    expect(signedOut).toBe(true);
  });
});
