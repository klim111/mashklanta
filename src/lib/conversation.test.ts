import { describe, expect, it } from 'vitest';
import {
  allowedRecipients,
  bankFor,
  bankerContacts,
  carbonCopies,
  cleanSubject,
  emailHtml,
  mailboxAddress,
  mailboxKeyFromAddresses,
  parseAddress,
  senderAddress,
  senderDisplayName,
  trimQuotedReply,
} from './conversation';
import type { ConversationContact } from './conversation';

const contacts: ConversationContact[] = [
  { kind: 'BANKER', email: 'dana@leumi.co.il', name: 'דנה', bank: 'לאומי' },
  { kind: 'ADVISOR', email: 'advisor@mashkalanta.co.il', name: 'היועץ', bank: null },
  { kind: 'CLIENT', email: 'client@gmail.com', name: 'הלקוח', bank: null },
];

describe('addresses', () => {
  it('parses a display name and lowercases the address', () => {
    expect(parseAddress('Dana Levi <Dana@Leumi.co.il>')).toEqual({ name: 'Dana Levi', email: 'dana@leumi.co.il' });
    expect(parseAddress('dana@leumi.co.il')).toEqual({ name: null, email: 'dana@leumi.co.il' });
  });

  it('reads the sending address out of EMAIL_FROM', () => {
    expect(senderAddress('משכלנתא <noreply@mashkalanta.co.il>')).toBe('noreply@mashkalanta.co.il');
    expect(senderAddress(undefined)).toBe('noreply@mashkalanta.co.il');
  });

  it('strips header-breaking characters from the display name', () => {
    expect(senderDisplayName('דני "כהן"\r\n<x>', 'CLIENT', 'משכלנתא')).toBe('דני כהןx באמצעות משכלנתא');
  });
});

describe('mailbox routing', () => {
  const key = 'a1b2c3d4e5f6a7b8c9d0e1f2';

  it('builds and reads back the personal address', () => {
    const address = mailboxAddress(key, 'inbox.mashkalanta.co.il');
    expect(address).toBe(`c-${key}@inbox.mashkalanta.co.il`);
    expect(mailboxKeyFromAddresses([`Bank <${address}>`], 'inbox.mashkalanta.co.il')).toBe(key);
  });

  it('ignores the same local part on another domain', () => {
    expect(mailboxKeyFromAddresses([`c-${key}@evil.com`], 'inbox.mashkalanta.co.il')).toBeNull();
  });

  it('returns nothing when receiving is not configured', () => {
    expect(mailboxAddress(key, '')).toBeNull();
    expect(mailboxKeyFromAddresses([`c-${key}@inbox.mashkalanta.co.il`], null)).toBeNull();
  });
});

describe('recipients', () => {
  it('only allows people already tied to the process', () => {
    const { recipients, rejected } = allowedRecipients(['DANA@leumi.co.il', 'stranger@x.com'], contacts);
    expect(recipients.map((item) => item.email)).toEqual(['dana@leumi.co.il']);
    expect(rejected).toEqual(['stranger@x.com']);
  });

  it('copies the client and advisor when they are not addressed', () => {
    expect(carbonCopies([contacts[0]], contacts)).toEqual(['advisor@mashkalanta.co.il', 'client@gmail.com']);
    expect(carbonCopies([contacts[0], contacts[2]], contacts)).toEqual(['advisor@mashkalanta.co.il']);
  });

  it('tags the bank from the banker address', () => {
    expect(bankFor(['Dana <dana@leumi.co.il>'], contacts)).toBe('לאומי');
    expect(bankFor(['client@gmail.com'], contacts)).toBeNull();
  });

  it('drops invalid and duplicate bankers', () => {
    const result = bankerContacts([
      { bank: 'לאומי', bankerEmail: 'dana@leumi.co.il' },
      { bank: 'לאומי', bankerEmail: 'DANA@leumi.co.il' },
      { bank: 'מזרחי', bankerEmail: 'not-an-email' },
    ]);
    expect(result).toEqual([{ kind: 'BANKER', email: 'dana@leumi.co.il', name: 'הבנקאי בלאומי', bank: 'לאומי' }]);
  });
});

describe('content', () => {
  it('escapes typed text in the outgoing HTML', () => {
    expect(emailHtml('<script>x</script>\nשורה', 'footer')).toContain('&lt;script&gt;x&lt;/script&gt;<br>שורה');
  });

  it('keeps subjects on one line', () => {
    expect(cleanSubject('שלום\r\nBcc: x@y.com')).toBe('שלום Bcc: x@y.com');
  });

  it('trims quoted history from a reply', () => {
    const text = 'תודה, קיבלתי.\n\nOn Mon, 1 Sep 2026 at 10:00 Client <client@gmail.com> wrote:\n> שאלה';
    expect(trimQuotedReply(text)).toBe('תודה, קיבלתי.');
  });

  it('cuts a Hebrew Gmail quote header wrapped in direction marks', () => {
    const text = 'מעולה, תודה\n\n\u202bבתאריך יום ה׳, 24 בספט׳ 2026 ב-7:40 מאת \u202aIgor\u202c\u200f <\u202ax@gmail.com\u202c\u200f>:\u202c\n> שלום';
    expect(trimQuotedReply(text)).toBe('מעולה, תודה');
  });

  it('keeps a forwarded bank email whole', () => {
    const text = 'מצורף\n---------- Forwarded message ---------\nFrom: Bank <x@bank.co.il>\nהאישור שלכם';
    expect(trimQuotedReply(text)).toBe(text);
  });
});
