'use client';

import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Copy, Info, Loader2, Mail, Paperclip, PenLine, Reply, Send, X } from 'lucide-react';
import type { AttachmentFolder, ConversationContact, ConversationEmailView, ConversationRole } from '@/lib/conversation';
import { MAX_EMAIL_LENGTH, MAX_SUBJECT_LENGTH } from '@/lib/conversation';
import { useConversationEmails } from './useConversation';
import type { EmailDraft } from './useConversation';
import { accentFor } from './ConversationWindow';
import { EmailAttachments } from './EmailAttachments';

const PENDING_TEXT = 'תוכן המייל עוד נטען…';

const WHEN = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const KIND_LABEL: Record<ConversationContact['kind'], string> = {
  BANKER: 'בנקאי',
  ADVISOR: 'יועץ',
  CLIENT: 'לקוח',
};

/**
 * טאב המיילים: כל מה שנשלח מהפלטפורמה לבנקאי, ליועץ וללקוח, ומה שחזר.
 *
 * הנמענים הם רק מי שכבר קשור לתהליך — הבנקאי שהלקוח הזין בשלב האישור העקרוני,
 * היועץ והלקוח. מי שאינו בין הנמענים מהשניים האחרונים מקבל העתק, כדי שכולם
 * יישארו באותו שרשור.
 */
export function EmailsPane({
  role,
  clientUserId,
  mailboxAddress,
  receivesEmail,
}: {
  role: ConversationRole;
  clientUserId?: string | null;
  mailboxAddress: string | null;
  receivesEmail: boolean;
}) {
  const { emails, contacts, folders, ready, sending, error, setError, send, saveAttachment } = useConversationEmails(
    clientUserId,
    true
  );
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const accent = accentFor(role);

  const selfKind = role === 'CLIENT' ? 'CLIENT' : 'ADVISOR';
  const recipients = useMemo(() => contacts.filter((contact) => contact.kind !== selfKind), [contacts, selfKind]);
  const hasBanker = contacts.some((contact) => contact.kind === 'BANKER');

  const startDraft = (to: string[] = [], subject = '') => {
    setError(null);
    setDraft({ to, subject, text: '' });
  };

  const reply = (email: ConversationEmailView) => {
    const target =
      email.direction === 'INBOUND'
        ? email.fromAddress
        : email.toAddresses.find((address) => recipients.some((item) => item.email === address));
    const allowed = target && recipients.some((item) => item.email === target) ? [target] : [];
    startDraft(allowed, /^(re|תשובה):/i.test(email.subject) ? email.subject : `Re: ${email.subject}`);
  };

  if (draft) {
    return (
      <Composer
        role={role}
        draft={draft}
        onChange={setDraft}
        recipients={recipients}
        contacts={contacts}
        receivesEmail={receivesEmail}
        sending={sending}
        error={error}
        onCancel={() => setDraft(null)}
        onSend={async () => {
          if (await send(draft)) setDraft(null);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2">
        <p className="text-sm font-bold text-slate-500">{emails.length > 0 ? `${emails.length} מיילים` : 'מיילים'}</p>
        <button
          type="button"
          onClick={() => startDraft(recipients.filter((item) => item.kind === 'BANKER').slice(0, 1).map((item) => item.email))}
          disabled={recipients.length === 0}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-button font-black text-white disabled:opacity-50 ${accent.solid}`}
        >
          <PenLine className="h-4 w-4" />
          מייל חדש
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
        {!hasBanker && (
          <Hint>
            {role === 'CLIENT'
              ? 'הזינו את המייל של הבנקאי שמטפל בבקשה בשלב האישור העקרוני, והוא יופיע כאן כנמען.'
              : 'הלקוח עדיין לא הזין מייל של בנקאי בשלב האישור העקרוני. בינתיים אפשר לכתוב ללקוח.'}
          </Hint>
        )}
        {role === 'CLIENT' && mailboxAddress && <MailboxHint address={mailboxAddress} />}

        {!ready ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : emails.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Mail className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-info font-black text-slate-900">עדיין אין מיילים</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              מייל שנשלח מכאן לבנקאי, והתשובה שלו, יופיעו ברשימה הזו.
            </p>
          </div>
        ) : (
          emails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              contacts={contacts}
              open={expanded === email.id}
              onToggle={() => setExpanded((current) => (current === email.id ? null : email.id))}
              onReply={() => reply(email)}
              folders={folders}
              clientUserId={clientUserId}
              onSaveAttachment={(attachmentId, planId) => saveAttachment(email.id, attachmentId, planId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold leading-relaxed text-amber-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** הכתובת האישית, למייל שהבנק שלח ישר לתיבה של הלקוח */
function MailboxHint({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-600">
      קיבלתם מייל מהבנק ישירות לתיבה שלכם? העבירו אותו לכתובת הזו, והוא יופיע כאן:
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(address).then(() => setCopied(true));
        }}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1 font-bold text-slate-900 hover:bg-slate-100"
      >
        <span dir="ltr" className="truncate">
          {address}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-2xs text-slate-500">
          <Copy className="h-3 w-3" />
          {copied ? 'הועתק' : 'העתקה'}
        </span>
      </button>
    </div>
  );
}

function nameOf(address: string, contacts: readonly ConversationContact[]): string {
  return contacts.find((contact) => contact.email === address)?.name ?? address;
}

function EmailCard({
  email,
  contacts,
  open,
  onToggle,
  onReply,
  folders,
  clientUserId,
  onSaveAttachment,
}: {
  email: ConversationEmailView;
  contacts: readonly ConversationContact[];
  open: boolean;
  onToggle: () => void;
  onReply: () => void;
  folders: readonly AttachmentFolder[];
  clientUserId?: string | null;
  onSaveAttachment: (attachmentId: string, planId: string | null) => Promise<string | null>;
}) {
  const inbound = email.direction === 'INBOUND';
  const from = email.fromName || nameOf(email.fromAddress, contacts);
  const to = email.toAddresses.map((address) => nameOf(address, contacts)).join(', ');

  return (
    <article className={`rounded-xl border bg-white ${email.unread ? 'border-blue-300 shadow-sm' : 'border-slate-200'}`}>
      <button type="button" onClick={onToggle} className="block w-full px-3 py-2 text-right">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              inbound ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {inbound ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
            {inbound ? from : `אל ${to}`}
          </p>
          {email.attachments.length > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-2xs font-bold text-slate-500" title="קבצים מצורפים">
              <Paperclip className="h-3.5 w-3.5" />
              {email.attachments.length}
            </span>
          )}
          {email.bank && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-600">
              {email.bank}
            </span>
          )}
          <span className="shrink-0 text-2xs font-semibold text-slate-400">{WHEN.format(new Date(email.createdAt))}</span>
        </div>
        <p className={`mt-1 truncate text-sm ${email.unread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
          {email.subject}
        </p>
        {!open && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{email.text || PENDING_TEXT}</p>}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 py-2">
          <p className="text-2xs font-semibold text-slate-500">
            מאת {from} · אל {to}
            {email.ccAddresses.length > 0 && ` · העתק: ${email.ccAddresses.map((address) => nameOf(address, contacts)).join(', ')}`}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-info leading-relaxed text-slate-800">{email.text || PENDING_TEXT}</p>
          <EmailAttachments
            emailId={email.id}
            attachments={email.attachments}
            folders={folders}
            clientUserId={clientUserId}
            onSave={onSaveAttachment}
          />
          <button
            type="button"
            onClick={onReply}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 px-3 py-1 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <Reply className="h-4 w-4" />
            תשובה
          </button>
        </div>
      )}
    </article>
  );
}

function Composer({
  role,
  draft,
  onChange,
  recipients,
  contacts,
  receivesEmail,
  sending,
  error,
  onCancel,
  onSend,
}: {
  role: ConversationRole;
  draft: EmailDraft;
  onChange: (draft: EmailDraft) => void;
  recipients: readonly ConversationContact[];
  contacts: readonly ConversationContact[];
  receivesEmail: boolean;
  sending: boolean;
  error: string | null;
  onCancel: () => void;
  onSend: () => void;
}) {
  const accent = accentFor(role);
  const toggle = (email: string) =>
    onChange({
      ...draft,
      to: draft.to.includes(email) ? draft.to.filter((item) => item !== email) : [...draft.to, email],
    });
  // אותו כלל כמו בשרת: הלקוח והיועץ שאינם בין הנמענים מקבלים העתק
  const copies = contacts.filter((contact) => contact.kind !== 'BANKER' && !draft.to.includes(contact.email));
  const ready = draft.to.length > 0 && draft.subject.trim() && draft.text.trim();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onSend();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div>
          <p className="text-sm font-black text-slate-700">אל</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {recipients.map((contact) => {
              const active = draft.to.includes(contact.email);
              return (
                <button
                  key={contact.email}
                  type="button"
                  onClick={() => toggle(contact.email)}
                  className={`rounded-full border-2 px-3 py-1 text-right text-sm font-bold transition-colors ${
                    active ? `border-transparent text-white ${accent.solid}` : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {contact.name}
                  <span className={`mr-1 text-2xs ${active ? 'text-white/80' : 'text-slate-400'}`}>
                    {contact.bank ? `${KIND_LABEL[contact.kind]} · ${contact.bank}` : KIND_LABEL[contact.kind]}
                  </span>
                </button>
              );
            })}
          </div>
          {copies.length > 0 && (
            <p className="mt-1 text-2xs font-semibold text-slate-500">
              העתק יישלח אל: {copies.map((contact) => contact.name).join(', ')}
            </p>
          )}
        </div>

        <label className="block">
          <span className="text-sm font-black text-slate-700">נושא</span>
          <input
            value={draft.subject}
            maxLength={MAX_SUBJECT_LENGTH}
            onChange={(event) => onChange({ ...draft, subject: event.target.value })}
            className={`mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-info text-slate-900 focus:outline-none ${accent.ring}`}
          />
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-700">תוכן</span>
          <textarea
            value={draft.text}
            maxLength={MAX_EMAIL_LENGTH}
            onChange={(event) => onChange({ ...draft, text: event.target.value })}
            rows={8}
            className={`mt-1 w-full resize-y rounded-xl border-2 border-slate-200 px-3 py-2 text-info leading-relaxed text-slate-900 focus:outline-none ${accent.ring}`}
          />
        </label>

        <p className="text-2xs leading-relaxed text-slate-500">
          המייל יוצא מכתובת הפלטפורמה בשמכם.{' '}
          {receivesEmail ? 'תשובה אליו תגיע גם לתיבה שלכם וגם לכאן.' : 'תשובה אליו תגיע לתיבת המייל שלכם.'}
        </p>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 bg-white p-2">
        <button
          type="submit"
          disabled={!ready || sending}
          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-button font-black text-white disabled:opacity-50 ${accent.solid}`}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -scale-x-100" />}
          שליחת המייל
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-xl border-2 border-slate-200 px-3 py-2 text-button font-black text-slate-700 hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
          ביטול
        </button>
      </div>
    </form>
  );
}
