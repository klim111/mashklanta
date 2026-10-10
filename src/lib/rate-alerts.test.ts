import { describe, expect, it } from 'vitest';
import { emptyPlanData } from './mortgage-plan';
import { EMPTY_AGENDA_INPUT, buildCalendarEvents, planRecommendations } from './client-agenda';
import type { AgendaPlan } from './client-agenda';

function planWithFinalBank(receivedDaysAgo: number): AgendaPlan {
  const data = emptyPlanData();
  const received = new Date();
  received.setDate(received.getDate() - receivedDaysAgo);
  const day = `${received.getFullYear()}-${String(received.getMonth() + 1).padStart(2, '0')}-${String(received.getDate()).padStart(2, '0')}`;
  data.APPLICATIONS = {
    ...data.APPLICATIONS,
    approved: true,
    bank: 'לאומי',
    bankApprovals: [
      { bank: 'לאומי', submittedAt: null, approved: true, approvedAt: day, approvedAmount: null, documentName: null, note: '' },
      { bank: 'דיסקונט', submittedAt: null, approved: true, approvedAt: day, approvedAmount: null, documentName: null, note: '' },
    ],
  };
  data.AUCTION = {
    ...data.AUCTION,
    signedMix: {
      mixKey: 'm',
      mixRecordId: null,
      bank: 'לאומי',
      name: 'תמהיל',
      monthlyPayment: null,
      averageRate: null,
      totalInterest: null,
      totalPaid: null,
      months: null,
      chosenAt: day,
    },
  };
  return {
    id: 'p1',
    name: 'תכנון',
    createdAt: day,
    status: 'IN_PROGRESS',
    currentStage: 'SIGNING',
    propertyAddress: null,
    propertyValue: null,
    mortgageAmount: null,
    stages: [],
    data,
  };
}

describe('rate validity alerts', () => {
  it('keeps one alert that counts the days left', () => {
    const rate = planRecommendations(planWithFinalBank(2)).filter((row) => row.key.includes('rate-'));
    expect(rate).toHaveLength(1);
    expect(rate[0].key).toBe('p1:rate-validity');
    expect(rate[0].title).toBe('תוקף הריביות בבנק לאומי פג בעוד 22 ימים');
    expect(rate[0].tone).toBe('info');
  });

  it('turns into a daily alert from ten days before expiry', () => {
    const [first] = planRecommendations(planWithFinalBank(17));
    expect(first.key).toBe('p1:rate-days-7');
    expect(first.title).toBe('תוקף הריביות בבנק לאומי פג בעוד 7 ימים');
    expect(first.tone).toBe('warning');
  });

  it('shows no calendar dot until ten days are left', () => {
    const events = buildCalendarEvents({ ...EMPTY_AGENDA_INPUT, plans: [planWithFinalBank(0)] });
    expect(events.filter((event) => event.id.startsWith('rate-'))).toHaveLength(0);
  });

  it('puts one red dot on today from ten days before expiry', () => {
    const events = buildCalendarEvents({ ...EMPTY_AGENDA_INPUT, plans: [planWithFinalBank(14)] });
    const rate = events.filter((event) => event.id.startsWith('rate-'));
    expect(rate).toHaveLength(1);
    expect(rate[0].kind).toBe('deadline');
    expect(rate[0].title).toBe('תוקף הריביות בבנק לאומי פג בעוד 10 ימים');
    expect(new Date(rate[0].at).toDateString()).toBe(new Date().toDateString());
  });
});
