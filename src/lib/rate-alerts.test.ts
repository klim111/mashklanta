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
  it('stays quiet while more than 20 days are left', () => {
    const keys = planRecommendations(planWithFinalBank(2)).map((row) => row.key);
    expect(keys.some((key) => key.includes('rate-'))).toBe(false);
  });

  it('pops the alert of the threshold just crossed, for the final bank', () => {
    const [first] = planRecommendations(planWithFinalBank(12));
    expect(first.key).toBe('p1:rate-alert-15');
    expect(first.title).toBe('נשארו 12 ימים לתוקף הריביות בבנק לאומי');
  });

  it('puts every approval expiry and the final bank alerts in the calendar', () => {
    const events = buildCalendarEvents({ ...EMPTY_AGENDA_INPUT, plans: [planWithFinalBank(0)] });
    const ids = events.map((event) => event.id);
    expect(ids).toContain('rate-valid:p1:לאומי');
    expect(ids).toContain('rate-valid:p1:דיסקונט');
    expect(ids.filter((id) => id.startsWith('rate-alert:p1:'))).toHaveLength(4);
  });
});
