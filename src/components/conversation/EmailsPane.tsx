'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Info,
  Loader2,
  Mail,
  Paperclip,
  PenLine,
  Reply,
  Send,
  ShieldQuestion,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  AttachmentFolder,
  ConversationContact,
  ConversationDocument,
  ConversationEmailView,
  ConversationRole,
  OutgoingFileRef,
  RecipientRole,
} from '@/lib/conversation';
import { MAX_EMAIL_LENGTH, MAX_SUBJECT_LENGTH, RECIPIENT_ROLES, recipientRoleLabel } from '@/lib/conversation';
import { attachmentUrl, useConversationEmails } from './useConversation';
import { AttachButton, PendingFiles, useOutgoingFiles } from './OutgoingFiles';
import type { ComposeRequest, EmailDraft } from './useConversation';
import { accentFor } from './ConversationWindow';
import { EmailAttachments } from './EmailAttachments';

const PENDING_TEXT = 'תוכן המייל עוד נטען…';

const WHEN = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

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
  composeRequest = null,
  onComposeTaken,
}: {
  role: ConversationRole;
  clientUserId?: string | null;
  mailboxAddress: string | null;
  receivesEmail: boolean;
  /** מייל מוכן שמסך אחר ביקש לפתוח */
  composeRequest?: ComposeRequest | null;
  onComposeTaken?: () => void;
}) {
  const {
    emails: all,
    contacts,
    folders,
    ready,
    sending,
    error,
    setError,
    send,
    saveAttachment,
    reviewSender,
    setArchived,
    deleteForever,
    addRecipient,
    removeRecipient,
  } = useConversationEmails(clientUserId, true);
  const [view, setView] = useState<'feed' | 'archive'>('feed');
  // מייל שהועבר עכשיו לארכיון — עם "ביטול" לכמה שניות
  const [archivedNow, setArchivedNow] = useState<string | null>(null);
  useEffect(() => {
    if (!archivedNow) return;
    const timer = window.setTimeout(() => setArchivedNow(null), 6000);
    return () => window.clearTimeout(timer);
  }, [archivedNow]);

  const feed = all.filter((email) => !email.archived);
  const archive = all.filter((email) => email.archived);
  // מיילים משולחים לא מוכרים — מוצגים ללקוח בנפרד, עד שיאשר או ימחק
  const held = feed.filter((email) => email.held);
  const emails = feed.filter((email) => !email.held);
  const personalEmail = contacts.find((contact) => contact.kind === 'CLIENT')?.email ?? null;

  const moveToArchive = async (emailId: string) => {
    const failure = await setArchived(emailId, true);
    if (failure) setError(failure);
    else setArchivedNow(emailId);
  };
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  /** מה שמגיע עם מייל מוכן: מסמכים לצרף, ותפקיד לטופס "נמען חדש" */
  const [prefill, setPrefill] = useState<{
    documents: ConversationDocument[];
    addRole: RecipientRole | null;
    onSent?: (to: string[]) => void;
  } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!composeRequest) return;
    setView('feed');
    setError(null);
    setDraft({ to: composeRequest.to ?? [], subject: composeRequest.subject, text: composeRequest.text });
    setPrefill({
      documents: composeRequest.documents ?? [],
      addRole: composeRequest.addRecipientRole ?? null,
      onSent: composeRequest.onSent,
    });
    onComposeTaken?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeRequest]);
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

  if (view === 'archive') {
    return (
      <ArchiveView
        role={role}
        emails={archive}
        contacts={contacts}
        personalEmail={personalEmail}
        onBack={() => setView('feed')}
        onRestore={(emailId) => setArchived(emailId, false)}
        onDelete={deleteForever}
      />
    );
  }

  if (draft) {
    return (
      <Composer
        role={role}
        draft={draft}
        onChange={setDraft}
        recipients={recipients}
        contacts={contacts}
        receivesEmail={receivesEmail}
        mailboxAddress={role === 'CLIENT' ? mailboxAddress : null}
        clientUserId={clientUserId}
        sending={sending}
        error={error}
        onCancel={() => {
          setDraft(null);
          setPrefill(null);
        }}
        onAddRecipient={addRecipient}
        onRemoveRecipient={removeRecipient}
        onSend={async (files) => {
          if (await send({ ...draft, files })) {
            prefill?.onSent?.(draft.to);
            setDraft(null);
            setPrefill(null);
          }
        }}
        initialDocuments={prefill?.documents}
        addRecipientRole={prefill?.addRole ?? null}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2">
        <p className="text-sm font-bold text-slate-500">{emails.length > 0 ? `${emails.length} מיילים` : 'מיילים'}</p>
        <button
          type="button"
          onClick={() => setView('archive')}
          className="mr-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
        >
          <Archive className="h-4 w-4" />
          ארכיון{archive.length > 0 ? ` (${archive.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => startDraft(recipients.filter((item) => item.kind === 'BANKER').slice(0, 1).map((item) => item.email))}
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
              ? 'הזינו את המייל של הבנקאי בשלב האישור העקרוני, או הוסיפו נמען ב"מייל חדש", והוא יופיע כאן.'
              : 'הלקוח עדיין לא הזין מייל של בנקאי. אפשר להוסיף נמען ב"מייל חדש", או לכתוב ללקוח.'}
          </Hint>
        )}
        {archivedNow && (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-white shadow">
            <span>המייל הועבר לארכיון</span>
            <button
              type="button"
              onClick={() => {
                const emailId = archivedNow;
                setArchivedNow(null);
                void setArchived(emailId, false);
              }}
              className="rounded-md px-2 py-0.5 text-blue-200 hover:bg-white/10"
            >
              ביטול
            </button>
          </div>
        )}
        {error && !draft && <p className="text-sm font-bold text-rose-600">{error}</p>}
        {role === 'CLIENT' && mailboxAddress && <MailboxHint address={mailboxAddress} />}
        {held.map((email) => (
          <HeldEmailCard key={email.id} email={email} onReview={(decision) => reviewSender(email.id, decision)} />
        ))}

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
              onArchive={() => void moveToArchive(email.id)}
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

/**
 * הכתובת האישית של הלקוח במשכלנתא: אפשר לרשום אותה בבקשה באתר הבנק, או
 * להעביר אליה מייל שהבנק שלח ישר לתיבה הפרטית
 */
function MailboxHint({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-600">
      הכתובת האישית שלכם במשכלנתא. רשמו אותה בבקשות באתרי הבנקים, או העבירו אליה מייל מהבנק, והוא יופיע כאן וגם
      בתיבה שלכם:
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

/**
 * מייל משולח שהשיחה עוד לא מכירה. אישור מכניס אותו לשיחה (והיועץ רואה אותו),
 * ומיילים הבאים מאותו שולח נכנסים ישר. מחיקה מסירה אותו.
 */
function HeldEmailCard({
  email,
  onReview,
}: {
  email: ConversationEmailView;
  onReview: (decision: 'approve' | 'reject') => Promise<string | null>;
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const review = async (decision: 'approve' | 'reject') => {
    setBusy(decision);
    setFailure(null);
    const result = await onReview(decision);
    setBusy(null);
    if (result) setFailure(result);
  };

  return (
    <article className="rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2">
      <p className="flex items-center gap-1.5 text-2xs font-black text-amber-900">
        <ShieldQuestion className="h-4 w-4" />
        ממתין לאישור: שולח שעוד לא מוכר לשיחה
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-900">
        {email.fromName ? `${email.fromName} · ` : ''}
        <span dir="ltr">{email.fromAddress}</span>
      </p>
      <p className="truncate text-sm font-bold text-slate-700">{email.subject}</p>
      {email.text && <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{email.text}</p>}
      {email.attachments.length > 0 && (
        <p className="mt-1 flex items-center gap-1 text-2xs font-semibold text-slate-500">
          <Paperclip className="h-3.5 w-3.5" />
          {email.attachments.length === 1 ? 'קובץ מצורף' : `${email.attachments.length} קבצים מצורפים`}, ייפתחו אחרי האישור
        </p>
      )}
      <p className="mt-1.5 text-2xs leading-relaxed text-slate-600">
        מכירים את השולח, למשל הבנק? אשרו, והמייל ייכנס לשיחה ויגיע גם ליועץ. מיילים הבאים ממנו ייכנסו ישר.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void review('approve')}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          אישור השולח
        </button>
        <button
          type="button"
          onClick={() => void review('reject')}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-1 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          מחיקה
        </button>
      </div>
      {failure && <p className="mt-1 text-2xs font-bold text-rose-600">{failure}</p>}
    </article>
  );
}

/**
 * ארכיון המיילים: מה שנמחק מהפיד. אפשר להחזיר לפיד, והלקוח יכול גם למחוק
 * לגמרי — עם עותק לתיבה הפרטית שלו, אם ירצה.
 */
function ArchiveView({
  role,
  emails,
  contacts,
  personalEmail,
  onBack,
  onRestore,
  onDelete,
}: {
  role: ConversationRole;
  emails: readonly ConversationEmailView[];
  contacts: readonly ConversationContact[];
  personalEmail: string | null;
  onBack: () => void;
  onRestore: (emailId: string) => Promise<string | null>;
  onDelete: (emailId: string, backup: boolean) => Promise<string | null>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-black text-slate-700 hover:bg-slate-100"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה למיילים
        </button>
        <p className="mr-auto text-sm font-bold text-slate-500">ארכיון · {emails.length}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
        <p className="text-2xs leading-relaxed text-slate-500">
          {role === 'CLIENT'
            ? 'מיילים שנמחקו מהפיד. אפשר להחזיר אותם, או למחוק לגמרי מהפלטפורמה.'
            : 'מיילים שנמחקו מהפיד. אפשר להחזיר אותם לפיד. מחיקה לגמרי — רק על ידי הלקוח.'}
        </p>
        {emails.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Archive className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-info font-black text-slate-900">הארכיון ריק</p>
          </div>
        ) : (
          emails.map((email) => (
            <ArchivedCard
              key={email.id}
              email={email}
              contacts={contacts}
              canDelete={role === 'CLIENT'}
              personalEmail={personalEmail}
              onRestore={() => onRestore(email.id)}
              onDelete={(backup) => onDelete(email.id, backup)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ArchivedCard({
  email,
  contacts,
  canDelete,
  personalEmail,
  onRestore,
  onDelete,
}: {
  email: ConversationEmailView;
  contacts: readonly ConversationContact[];
  canDelete: boolean;
  personalEmail: string | null;
  onRestore: () => Promise<string | null>;
  onDelete: (backup: boolean) => Promise<string | null>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [backup, setBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const inbound = email.direction === 'INBOUND';
  const who = inbound
    ? email.fromName || nameOf(email.fromAddress, contacts)
    : `אל ${email.toAddresses.map((address) => nameOf(address, contacts)).join(', ')}`;

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setFailure(null);
    const result = await action();
    setBusy(false);
    if (result) setFailure(result);
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">{who}</p>
        {email.held && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-900">שולח לא מאושר</span>
        )}
        <span className="shrink-0 text-2xs font-semibold text-slate-400">{WHEN.format(new Date(email.createdAt))}</span>
      </div>
      <p className="mt-0.5 truncate text-sm font-bold text-slate-600">{email.subject}</p>
      {email.text && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{email.text}</p>}

      {confirming ? (
        <div className="mt-2 rounded-lg border-2 border-rose-200 bg-rose-50 p-2">
          <p className="text-sm font-bold text-rose-900">
            המייל יימחק לגמרי מהפלטפורמה, וגם היועץ לא יראה אותו. אי אפשר לשחזר אותו.
          </p>
          {personalEmail && (
            <label className="mt-2 flex items-start gap-2 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={backup}
                onChange={(event) => setBackup(event.target.checked)}
                className="mt-1 h-4 w-4 accent-blue-600"
              />
              <span>
                לשלוח לפני כן עותק, עם הקבצים, למייל שלי{' '}
                <span dir="ltr" className="font-bold">
                  {personalEmail}
                </span>
              </span>
            </label>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => onDelete(backup))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {backup ? 'שליחת עותק ומחיקה' : 'מחיקה לצמיתות'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-lg border-2 border-slate-200 bg-white px-3 py-1 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(onRestore)}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 px-3 py-1 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
            החזרה לפיד
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-rose-200 px-3 py-1 text-sm font-black text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              מחיקה לצמיתות
            </button>
          )}
        </div>
      )}
      {failure && <p className="mt-1 text-2xs font-bold text-rose-600">{failure}</p>}
    </article>
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
  onArchive,
  folders,
  clientUserId,
  onSaveAttachment,
}: {
  email: ConversationEmailView;
  contacts: readonly ConversationContact[];
  open: boolean;
  onToggle: () => void;
  onReply: () => void;
  onArchive: () => void;
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
            attachments={email.attachments}
            urlFor={(attachmentId, download) => attachmentUrl(email.id, attachmentId, clientUserId, download)}
            folders={folders}
            onSave={onSaveAttachment}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReply}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 px-3 py-1 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Reply className="h-4 w-4" />
              תשובה
            </button>
            <button
              type="button"
              onClick={onArchive}
              title="המייל יעבור לארכיון המיילים"
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 px-3 py-1 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4" />
              מחיקה
            </button>
          </div>
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
  mailboxAddress,
  clientUserId,
  sending,
  error,
  onCancel,
  onAddRecipient,
  onRemoveRecipient,
  onSend,
  initialDocuments,
  addRecipientRole = null,
}: {
  role: ConversationRole;
  draft: EmailDraft;
  onChange: (draft: EmailDraft) => void;
  recipients: readonly ConversationContact[];
  contacts: readonly ConversationContact[];
  receivesEmail: boolean;
  mailboxAddress: string | null;
  clientUserId?: string | null;
  sending: boolean;
  error: string | null;
  onCancel: () => void;
  onAddRecipient: (input: { email: string; name: string; role: RecipientRole; bank?: string }) => Promise<string | null>;
  onRemoveRecipient: (recipientId: string) => Promise<string | null>;
  onSend: (files: OutgoingFileRef[]) => void;
  /** מסמכים מהתיק שמצורפים מראש למייל מוכן */
  initialDocuments?: ConversationDocument[];
  /** טופס "נמען חדש" נפתח מראש עם התפקיד הזה */
  addRecipientRole?: RecipientRole | null;
}) {
  const accent = accentFor(role);
  const outgoing = useOutgoingFiles(clientUserId);
  const [adding, setAdding] = useState(Boolean(addRecipientRole));
  const addDocument = outgoing.addDocument;
  useEffect(() => {
    initialDocuments?.forEach((doc) => addDocument(doc));
  }, [initialDocuments, addDocument]);
  const toggle = (email: string) =>
    onChange({
      ...draft,
      to: draft.to.includes(email) ? draft.to.filter((item) => item !== email) : [...draft.to, email],
    });
  // אותו כלל כמו בשרת: הלקוח והיועץ שאינם בין הנמענים מקבלים העתק
  const copies = contacts.filter(
    (contact) => (contact.kind === 'CLIENT' || contact.kind === 'ADVISOR') && !draft.to.includes(contact.email)
  );
  const ready = draft.to.length > 0 && draft.subject.trim() && draft.text.trim() && !outgoing.uploading && !outgoing.failed;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onSend(outgoing.refs);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div>
          <p className="text-sm font-black text-slate-700">אל</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {recipients.map((contact) => {
              const active = draft.to.includes(contact.email);
              const label = recipientRoleLabel(contact);
              return (
                <span
                  key={contact.email}
                  className={`inline-flex items-center rounded-full border-2 text-sm font-bold transition-colors ${
                    active ? `border-transparent text-white ${accent.solid}` : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(contact.email)}
                    title={contact.email}
                    className="px-3 py-1 text-right"
                  >
                    {contact.name}
                    <span className={`mr-1 text-2xs ${active ? 'text-white/80' : 'text-slate-400'}`}>
                      {contact.bank ? `${label} · ${contact.bank}` : label}
                    </span>
                  </button>
                  {contact.recipientId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (active) toggle(contact.email);
                        void onRemoveRecipient(contact.recipientId!);
                      }}
                      aria-label={`הסרת ${contact.name} מהנמענים`}
                      title="הסרה מרשימת הנמענים"
                      className={`-mr-1 ml-1 rounded-full p-0.5 ${active ? 'hover:bg-white/20' : 'hover:bg-slate-100'}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-slate-300 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <UserPlus className="h-3.5 w-3.5" />
                נמען חדש
              </button>
            )}
          </div>
          {adding && (
            <AddRecipientForm
              role={role}
              defaultRole={addRecipientRole ?? undefined}
              onCancel={() => setAdding(false)}
              onAdd={async (input) => {
                const failure = await onAddRecipient(input);
                if (!failure) {
                  setAdding(false);
                  onChange({
                    ...draft,
                    to: [...draft.to, input.email.trim().toLowerCase()],
                  });
                }
                return failure;
              }}
            />
          )}
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
          {mailboxAddress ? (
            <>
              המייל יוצא מהכתובת האישית שלכם, <span dir="ltr">{mailboxAddress}</span>.{' '}
            </>
          ) : (
            'המייל יוצא מכתובת הפלטפורמה בשמכם. '
          )}
          {receivesEmail ? 'תשובה אליו תגיע גם לתיבה שלכם וגם לכאן.' : 'תשובה אליו תגיע לתיבת המייל שלכם.'}
        </p>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      </div>

      <div className="border-t border-slate-200 bg-white p-2">
        {outgoing.files.length > 0 && (
          <div className="mb-2">
            <PendingFiles outgoing={outgoing} />
            {outgoing.failed && <p className="mt-1 text-2xs font-bold text-rose-600">הסירו את הקובץ שלא עלה כדי לשלוח.</p>}
          </div>
        )}
        <div className="flex items-center gap-2">
          <AttachButton outgoing={outgoing} clientUserId={clientUserId} />
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
      </div>
    </form>
  );
}

/** טופס קצר להוספת נמען לשיחה: שם, מייל ותפקיד (ולבנקאי — הבנק) */
function AddRecipientForm({
  role,
  defaultRole = 'BANKER',
  onAdd,
  onCancel,
}: {
  role: ConversationRole;
  defaultRole?: RecipientRole;
  onAdd: (input: { email: string; name: string; role: RecipientRole; bank?: string }) => Promise<string | null>;
  onCancel: () => void;
}) {
  const accent = accentFor(role);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [recipientRole, setRecipientRole] = useState<RecipientRole>(defaultRole);
  const [bank, setBank] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const field = `w-full rounded-lg border-2 border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none ${accent.ring}`;

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      setFailure('נדרשים שם ומייל');
      return;
    }
    setBusy(true);
    setFailure(null);
    const result = await onAdd({
      name: name.trim(),
      email: email.trim(),
      role: recipientRole,
      bank: bank.trim() || undefined,
    });
    setBusy(false);
    if (result) setFailure(result);
  };

  return (
    <div className="mt-2 space-y-2 rounded-xl border-2 border-slate-200 bg-slate-50 p-2.5">
      <p className="text-sm font-black text-slate-800">נמען חדש</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-2xs font-bold text-slate-600">שם</span>
          <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="text-2xs font-bold text-slate-600">תפקיד</span>
          <select
            value={recipientRole}
            onChange={(event) => setRecipientRole(event.target.value as RecipientRole)}
            className={field}
          >
            {(Object.keys(RECIPIENT_ROLES) as RecipientRole[]).map((key) => (
              <option key={key} value={key}>
                {RECIPIENT_ROLES[key]}
              </option>
            ))}
          </select>
        </label>
        <label className={recipientRole === 'BANKER' ? 'block' : 'col-span-2 block'}>
          <span className="text-2xs font-bold text-slate-600">מייל</span>
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`${field} text-left`}
          />
        </label>
        {recipientRole === 'BANKER' && (
          <label className="block">
            <span className="text-2xs font-bold text-slate-600">בנק (לא חובה)</span>
            <input value={bank} maxLength={60} onChange={(event) => setBank(event.target.value)} className={field} />
          </label>
        )}
      </div>
      {failure && <p className="text-2xs font-bold text-rose-600">{failure}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-black text-white disabled:opacity-60 ${accent.solid}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          הוספה
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border-2 border-slate-200 bg-white px-3 py-1 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
