import { describe, expect, it } from 'vitest';
import {
  allowedRecipients,
  bankFor,
  bankerContacts,
  carbonCopies,
  cleanSubject,
  emailHtml,
  mailboxAddress,
  mailboxNameBase,
  mailboxNameCandidates,
  mailboxNameSource,
  isFallbackMailboxName,
  mailboxTargets,
  addressedToDomains,
  domainList,
  senderAllowed,
  parseOutgoingFiles,
  recipientRoleLabel,
  parseAddress,
  senderAddress,
  senderDisplayName,
  trimQuotedReply,
  inboundAttachments,
  storedAttachments,
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
  it('names the address after the client email', () => {
    expect(mailboxNameBase('Igor.L+bank@Gmail.com')).toBe('igor.l');
    expect(mailboxNameBase('דני@walla.co.il')).toBe('client');
    expect(mailboxNameBase('..a__b--c..@x.com')).toBe('a_b-c');
    expect(mailboxNameBase('c-dan@x.com')).toBe('cdan');
    expect(mailboxAddress('igor.l', 'mashkalanta.com')).toBe('igor.l@mashkalanta.com');
  });

  it('numbers taken and reserved names', () => {
    expect(mailboxNameCandidates('igor@gmail.com', null, 3)).toEqual(['igor', 'igor2', 'igor3']);
    expect(mailboxNameCandidates('info@company.co.il', null, 2)).toEqual(['info2', 'info3']);
    expect(mailboxNameCandidates('hi@company.co.il', 'hi@mashkalanta.com', 1)).toEqual(['hi2']);
    expect(mailboxNameCandidates('דני@walla.co.il', null, 2)).toEqual([
      expect.stringMatching(/^client\d{6}$/),
      expect.stringMatching(/^client\d{6}$/),
    ]);
  });

  it('builds the address from the client name when the username is Hebrew', () => {
    expect(mailboxNameSource({ username: 'איגור', name: 'Igor Lebedinsky', email: 'klim111@gmail.com' })).toBe('Igor Lebedinsky');
    expect(mailboxNameBase('Igor Lebedinsky')).toBe('igor.lebedinsky');
    expect(mailboxNameSource({ username: 'איגור', name: 'איגור לבדינסקי', email: 'igor.l@gmail.com' })).toBe('igor.l@gmail.com');
    expect(mailboxNameSource({ username: 'igor_l', name: 'Igor', email: 'x@gmail.com' })).toBe('igor_l');
    expect(isFallbackMailboxName('client2')).toBe(true);
    expect(isFallbackMailboxName('clientele')).toBe(false);
  });

  it('routes personal addresses on our domains only', () => {
    expect(mailboxTargets(['Bank <Igor.L@mashkalanta.com>'], ['mashkalanta.com'])).toEqual([{ name: 'igor.l', legacyKey: null }]);
    expect(mailboxTargets(['igor.l@evil.com'], ['mashkalanta.com'])).toEqual([]);
    expect(mailboxTargets(['info@mashkalanta.com', 'noreply@mashkalanta.com'], ['mashkalanta.com'])).toEqual([]);
    expect(addressedToDomains(['Igor <info@mashkalanta.com>'], ['mashkalanta.com'])).toBe('info@mashkalanta.com');
  });

  it('still routes the first addresses (c-…@inbox)', () => {
    const old = 'a1b2c3d4e5f6a7b8c9d0e1f2';
    expect(mailboxTargets([`c-${old}@inbox.mashkalanta.com`], ['mashkalanta.com', 'inbox.mashkalanta.com'])).toEqual([
      { name: `c-${old}`, legacyKey: old },
    ]);
  });

  it('returns nothing when receiving is not configured', () => {
    expect(mailboxAddress('igor', '')).toBeNull();
    expect(mailboxTargets(['igor@mashkalanta.com'], null)).toEqual([]);
    expect(domainList(' mashkalanta.com, inbox.mashkalanta.com ')).toEqual(['mashkalanta.com', 'inbox.mashkalanta.com']);
  });
});

describe('who may write to the personal address', () => {
  const known = new Set(['someone@partner.co.il']);

  it('lets in the client, advisor, bankers and past correspondents', () => {
    expect(senderAllowed('Client <CLIENT@gmail.com>', contacts, known)).toBe(true);
    expect(senderAllowed('dana@leumi.co.il', contacts, known)).toBe(true);
    expect(senderAllowed('someone@partner.co.il', contacts, known)).toBe(true);
  });

  it('lets in another address at a banker’s bank, but not at a personal mail provider', () => {
    expect(senderAllowed('noreply@leumi.co.il', contacts, known)).toBe(true);
    const gmailBanker = [...contacts, { kind: 'BANKER' as const, email: 'yossi@gmail.com', name: 'יוסי', bank: 'מזרחי' }];
    expect(senderAllowed('stranger@gmail.com', gmailBanker, known)).toBe(false);
  });

  it('holds everyone else', () => {
    expect(senderAllowed('spam@random.com', contacts, known)).toBe(false);
    expect(senderAllowed('not-an-email', contacts, known)).toBe(false);
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

describe('attachments', () => {
  it('keeps documents and drops images embedded in the email body', () => {
    const list = inboundAttachments([
      { id: 'a1', filename: 'אישור.pdf', size: 1000, content_type: 'application/pdf', content_id: null, content_disposition: 'attachment' },
      { id: 'a2', filename: 'logo.png', size: 200, content_type: 'image/png', content_id: 'logo@x', content_disposition: 'inline' },
      { id: 'a3', filename: null, size: 50, content_type: 'IMAGE/JPEG; name=x', content_id: null, content_disposition: 'attachment' },
    ]);
    expect(list).toEqual([
      { id: 'a1', fileName: 'אישור.pdf', contentType: 'application/pdf', size: 1000 },
      { id: 'a3', fileName: 'קובץ מצורף', contentType: 'image/jpeg', size: 50 },
    ]);
  });

  it('reads only well-formed stored attachments', () => {
    expect(storedAttachments(null)).toEqual([]);
    expect(storedAttachments([{ id: 'a1', fileName: 'x.pdf', contentType: 'application/pdf', size: 3 }, { id: 5 }])).toEqual([
      { id: 'a1', fileName: 'x.pdf', contentType: 'application/pdf', size: 3 },
    ]);
  });
});

describe('recipients added by hand', () => {
  const lawyer = { kind: 'CONTACT' as const, email: 'adv@law.co.il', name: 'עו"ד כהן', bank: null, role: 'LAWYER' as const, recipientId: 'r1' };

  it('are not copied on every email like the client and advisor', () => {
    expect(carbonCopies([contacts[0]], [...contacts, lawyer])).toEqual(['advisor@mashkalanta.co.il', 'client@gmail.com']);
  });

  it('show the role that was picked', () => {
    expect(recipientRoleLabel(lawyer)).toBe('עורך דין');
    expect(recipientRoleLabel(contacts[0])).toBe('בנקאי');
  });

  it('may write in without waiting for approval', () => {
    expect(senderAllowed('adv@law.co.il', [...contacts, lawyer], new Set())).toBe(true);
  });
});

describe('files attached when sending', () => {
  it('accepts uploads and folder documents, up to five', () => {
    expect(parseOutgoingFiles(undefined)).toEqual([]);
    expect(
      parseOutgoingFiles([
        { kind: 'upload', pathname: 'conversation/u1/a.pdf', fileName: 'אישור\r\n.pdf' },
        { kind: 'document', documentId: 'd1' },
      ])
    ).toEqual([
      { kind: 'upload', pathname: 'conversation/u1/a.pdf', fileName: 'אישור.pdf' },
      { kind: 'document', documentId: 'd1' },
    ]);
    expect(parseOutgoingFiles(Array.from({ length: 6 }, () => ({ kind: 'document', documentId: 'd' })))).toBeNull();
    expect(parseOutgoingFiles([{ kind: 'url', href: 'x' }])).toBeNull();
  });
});
