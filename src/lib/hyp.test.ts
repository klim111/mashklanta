import { describe, expect, it } from 'vitest';
import {
  hypConfig,
  hypText,
  invoiceLine,
  parseReturn,
  paymentPageUrl,
  signParams,
  splitName,
  verifyParams,
  verifyResponseOk,
} from './hyp';

const config = { masof: '0010131918', apiKey: 'key123', passP: 'pass', sendInvoice: true };

describe('hypConfig', () => {
  it('needs the terminal number, API key and PassP', () => {
    expect(hypConfig({ HYP_MASOF: '1', HYP_API_KEY: 'k' })).toBeNull();
    expect(hypConfig({ HYP_MASOF: ' 1 ', HYP_API_KEY: 'k', HYP_PASSP: 'p' })).toEqual({
      masof: '1',
      apiKey: 'k',
      passP: 'p',
      sendInvoice: true,
    });
    expect(
      hypConfig({ HYP_MASOF: '1', HYP_API_KEY: 'k', HYP_PASSP: 'p', HYP_SEND_INVOICE: 'false' })
        ?.sendInvoice
    ).toBe(false);
  });
});

describe('signParams', () => {
  it('asks HYP to sign a one-payment shekel page with an invoice', () => {
    const params = signParams(config, {
      order: 'MK1',
      amount: 49,
      description: 'משכלנתא - גישה לחודש',
      clientName: 'ישראל ישראלי כהן',
      email: 'a@b.co',
    });
    expect(params.get('action')).toBe('APISign');
    expect(params.get('What')).toBe('SIGN');
    expect(params.get('Masof')).toBe('0010131918');
    expect(params.get('Amount')).toBe('49.00');
    expect(params.get('Order')).toBe('MK1');
    expect(params.get('Coin')).toBe('1');
    expect(params.get('Tash')).toBe('1');
    expect(params.get('Sign')).toBe('True');
    expect(params.get('ClientName')).toBe('ישראל');
    expect(params.get('ClientLName')).toBe('ישראלי כהן');
    expect(params.get('SendHesh')).toBe('True');
    expect(params.get('heshDesc')).toBe('[0~משכלנתא - גישה לחודש~1~49.00]');
  });

  it('skips the invoice when the terminal has no invoicing', () => {
    const params = signParams({ ...config, sendInvoice: false }, {
      order: 'MK1',
      amount: 49,
      description: 'x',
      clientName: 'a',
      email: 'a@b.co',
    });
    expect(params.has('SendHesh')).toBe(false);
    expect(params.has('heshDesc')).toBe(false);
  });
});

describe('text helpers', () => {
  it('removes characters that break the return URL or invoice lines', () => {
    expect(hypText('a&b=c?d#e [x]~y')).toBe('a b c d e x y');
    expect(invoiceLine('a~b', 49)).toBe('[0~a b~1~49.00]');
    expect(splitName('  ')).toEqual({ first: 'לקוח', last: '' });
  });
});

describe('paymentPageUrl', () => {
  it('builds the payment page from a signed response and rejects errors', () => {
    expect(paymentPageUrl('action=pay&Masof=1&Amount=49&signature=abc')).toBe(
      'https://pay.hyp.co.il/p/?action=pay&Masof=1&Amount=49&signature=abc'
    );
    expect(paymentPageUrl('CCode=901')).toBeNull();
  });
});

describe('return and verification', () => {
  const returned = new URLSearchParams(
    'Id=12345&CCode=0&Amount=49&ACode=0012345&Order=MK1&Fild1=&Sign=deadbeef&Bank=6&Payments=1&UserId=000000000&Brand=2&Issuer=2&L4digit=4580&Hesh=1001'
  );

  it('reads the transaction from the return URL', () => {
    expect(parseReturn(returned)).toEqual({
      order: 'MK1',
      transactionId: '12345',
      code: '0',
      amount: 49,
      invoiceNumber: '1001',
      last4: '4580',
      brand: 'visa',
    });
  });

  it('sends everything back for verification without letting the URL override the terminal details', () => {
    const forged = new URLSearchParams(returned);
    forged.append('Masof', '999');
    forged.append('KEY', 'evil');
    const params = verifyParams(config, forged);
    expect(params.get('What')).toBe('VERIFY');
    expect(params.getAll('Masof')).toEqual(['0010131918']);
    expect(params.getAll('KEY')).toEqual(['key123']);
    expect(params.get('Sign')).toBe('deadbeef');
    expect(params.get('Id')).toBe('12345');
  });

  it('accepts only CCode=0 from the verification', () => {
    expect(verifyResponseOk('CCode=0')).toBe(true);
    expect(verifyResponseOk('CCode=902')).toBe(false);
    expect(verifyResponseOk('')).toBe(false);
  });
});
