import { describe, expect, it } from 'vitest';
import { advisoryEndedEmail, paymentConfirmationEmail, renewalReminderEmail } from './billing-emails';

describe('billing emails', () => {
  it('confirms the payment with the invoice number and the access end date', () => {
    const email = paymentConfirmationEmail({
      name: 'דנה',
      amount: 49,
      paidAt: new Date('2026-10-08T10:00:00Z'),
      accessUntil: new Date('2026-11-08T10:00:00Z'),
      invoiceNumber: '1001',
      last4: '4580',
      renewal: false,
      dashboardUrl: 'https://mashkalanta.com/dashboard',
    });
    expect(email.subject).toContain('אישור ההרשמה והתשלום');
    expect(email.html).toContain('1001');
    expect(email.html).toContain('8 בנובמבר 2026');
    expect(email.text).toContain('אין חיוב חוזר אוטומטי');
  });

  it('reminds before the month ends with the renewal link', () => {
    const email = renewalReminderEmail({
      name: '<b>x</b>',
      accessUntil: new Date('2026-11-08T10:00:00Z'),
      daysLeft: 3,
      price: 49,
      renewUrl: 'https://mashkalanta.com/billing/renew?token=abc',
    });
    expect(email.subject).toContain('בעוד 3 ימים');
    expect(email.html).toContain('https://mashkalanta.com/billing/renew?token=abc');
    expect(email.html).not.toContain('<b>x</b>');
  });

  it('offers to continue alone at the monthly price after advisory ends', () => {
    const email = advisoryEndedEmail({
      name: 'דנה <b>',
      planName: 'דירה ברמת גן',
      price: 49,
      continueUrl: 'https://mashkalanta.com/billing/renew?token=abc',
      dashboardUrl: 'https://mashkalanta.com/dashboard',
    });
    expect(email.subject).toContain('₪49');
    expect(email.html).toContain('https://mashkalanta.com/billing/renew?token=abc');
    expect(email.html).toContain('דירה ברמת גן');
    expect(email.html).not.toContain('<b>');
    expect(email.text).toContain('אין צורך לעשות דבר');
  });
});
