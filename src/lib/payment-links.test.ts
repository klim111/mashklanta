import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ prisma: {} }));
const { readPaymentLinkInput } = await import('./payment-links');

describe('readPaymentLinkInput', () => {
  it('needs a service name and a valid amount', () => {
    expect(readPaymentLinkInput({ title: '', amount: 100 })).toEqual({ error: 'נדרש שם לשירות' });
    expect(readPaymentLinkInput({ title: 'ייעוץ', amount: 0 })).toEqual({ error: 'הסכום אינו תקין' });
    expect(readPaymentLinkInput({ title: 'ייעוץ', amount: 350, clientEmail: 'bad' })).toEqual({
      error: 'כתובת המייל אינה תקינה',
    });
  });

  it('cleans the input', () => {
    const read = readPaymentLinkInput({ title: '  שיחת   ייעוץ ', amount: '350', clientEmail: 'A@B.CO', clientName: '' });
    expect(read).toEqual({
      input: {
        title: 'שיחת ייעוץ',
        description: null,
        amount: 350,
        trackId: null,
        clientName: null,
        clientEmail: 'a@b.co',
        clientPhone: null,
        clientId: null,
      },
    });
  });
});
