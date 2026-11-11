'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { CONTACT_ROLES } from '@/lib/contact-roles';
import type { ContactRoleInfo, ContactView } from '@/lib/contact-roles';
import { RECIPIENT_ROLES } from '@/lib/conversation';
import type { RecipientRole } from '@/lib/conversation';
import { useContacts } from '@/components/contacts/useContacts';
import type { ContactInput } from '@/components/contacts/useContacts';
import { DashCard } from './ui';

const field =
  'w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500';

const WHEN = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/**
 * אנשי הקשר — כל אנשי המקצוע בעסקה, עם הסבר קצר על כל אחד ובאיזה שלב צריך
 * אותו. מה שנשמר כאן מופיע גם כנמען בתיבת המיילים (כשיש מייל), ובשלבים
 * שצריכים אותו. ליד יועץ המשכנתאות — צירוף מומחה משכלנתא לתהליך.
 */
export function ContactsSection() {
  const contacts = useContacts();
  const [adding, setAdding] = useState(false);

  if (!contacts.ready) {
    return (
      <div className="flex justify-center py-20">
        {contacts.error ? (
          <p className="text-sm font-bold text-rose-600">{contacts.error}</p>
        ) : (
          <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
        )}
      </div>
    );
  }

  const listed = new Set(CONTACT_ROLES.map((item) => item.role));
  const others = contacts.contacts.filter((item) => !listed.has(item.role));

  return (
    <div className="space-y-4" data-demo-id="dash-contacts">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {CONTACT_ROLES.map((info) =>
          info.role === 'ADVISOR' ? (
            <AdvisorCard key={info.role} info={info} contacts={contacts} />
          ) : (
            <RoleCard
              key={info.role}
              info={info}
              items={contacts.contacts.filter((item) => item.role === info.role)}
              onSave={contacts.save}
              onRemove={contacts.remove}
            />
          )
        )}
      </div>

      <DashCard title="אנשי קשר נוספים" icon={<UserPlus className="h-5 w-5 text-blue-600" />}>
        <div className="space-y-2">
          {others.map((item) => (
            <ContactRow key={item.id} contact={item} showRole onSave={contacts.save} onRemove={contacts.remove} />
          ))}
          {adding ? (
            <ContactForm
              chooseRole
              initial={{ role: 'OTHER' }}
              onCancel={() => setAdding(false)}
              onSave={async (input) => {
                const failure = await contacts.save(input);
                if (!failure) setAdding(false);
                return failure;
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 px-4 py-2 text-button font-bold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              איש קשר חדש
            </button>
          )}
        </div>
      </DashCard>
    </div>
  );
}

function RoleHeader({ info }: { info: ContactRoleInfo }) {
  return (
    <div className="text-right">
      <h3 className="text-info font-black text-slate-900">{info.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{info.description}</p>
      <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
        <Clock3 className="h-3 w-3" />
        {info.when}
      </p>
    </div>
  );
}

function AdvisorCard({ info, contacts }: { info: ContactRoleInfo; contacts: ReturnType<typeof useContacts> }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const requested = contacts.expertRequestedAt;

  return (
    <section className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-4 shadow-sm">
      <RoleHeader info={info} />
      <div className="mt-3">
        {requested ? (
          <p className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            הבקשה נשלחה ב-{WHEN.format(new Date(requested))}. יועץ משכלנתא יחזור אליכם.
          </p>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setFailure(await contacts.requestExpert());
              setBusy(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-button font-black text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            צרפו מומחה משכלנתא לתהליך
          </button>
        )}
        {failure && <p className="mt-2 text-sm font-bold text-rose-600">{failure}</p>}
      </div>
    </section>
  );
}

function RoleCard({
  info,
  items,
  onSave,
  onRemove,
}: {
  info: ContactRoleInfo;
  items: ContactView[];
  onSave: (input: ContactInput, id?: string) => Promise<string | null>;
  onRemove: (id: string) => Promise<string | null>;
}) {
  const [adding, setAdding] = useState(false);
  const empty = items.length === 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <RoleHeader info={info} />
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <ContactRow key={item.id} contact={item} onSave={onSave} onRemove={onRemove} />
        ))}
        {empty || adding ? (
          <ContactForm
            initial={{ role: info.role }}
            onCancel={empty ? undefined : () => setAdding(false)}
            onSave={async (input) => {
              const failure = await onSave(input);
              if (!failure) setAdding(false);
              return failure;
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            עוד {info.title}
          </button>
        )}
      </div>
    </section>
  );
}

function ContactRow({
  contact,
  showRole = false,
  onSave,
  onRemove,
}: {
  contact: ContactView;
  showRole?: boolean;
  onSave: (input: ContactInput, id?: string) => Promise<string | null>;
  onRemove: (id: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (editing) {
    return (
      <ContactForm
        chooseRole={showRole}
        initial={{
          role: contact.role,
          name: contact.name,
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          bank: contact.bank ?? '',
        }}
        onCancel={() => setEditing(false)}
        onSave={async (input) => {
          const failure = await onSave(input, contact.id);
          if (!failure) setEditing(false);
          return failure;
        }}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="min-w-0 text-sm font-black text-slate-900">
        {contact.name}
        {showRole && <span className="mr-1.5 text-xs font-bold text-slate-500">{RECIPIENT_ROLES[contact.role]}</span>}
        {contact.bank && <span className="mr-1.5 text-xs font-bold text-slate-500">{contact.bank}</span>}
      </span>
      {contact.email && (
        <a href={`mailto:${contact.email}`} dir="ltr" className="inline-flex items-center gap-1 text-sm text-slate-700 hover:text-blue-700">
          <Mail className="h-3.5 w-3.5" />
          {contact.email}
        </a>
      )}
      {contact.phone && (
        <a href={`tel:${contact.phone}`} dir="ltr" className="inline-flex items-center gap-1 text-sm text-slate-700 hover:text-blue-700">
          <Phone className="h-3.5 w-3.5" />
          {contact.phone}
        </a>
      )}
      {contact.fromStage ? (
        <span className="mr-auto text-xs font-semibold text-slate-500">הוזן בשלב האישור העקרוני</span>
      ) : (
        <span className="mr-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`עריכת ${contact.name}`}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-800"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onRemove(contact.id);
              setBusy(false);
            }}
            aria-label={`מחיקת ${contact.name}`}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-rose-600"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </span>
      )}
    </div>
  );
}

function ContactForm({
  initial,
  chooseRole = false,
  onSave,
  onCancel,
}: {
  initial: ContactInput;
  chooseRole?: boolean;
  onSave: (input: ContactInput) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [role, setRole] = useState<RecipientRole>(initial.role);
  const [name, setName] = useState(initial.name ?? '');
  const [email, setEmail] = useState(initial.email ?? '');
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [bank, setBank] = useState(initial.bank ?? '');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const ready = Boolean(email.trim() || phone.trim());

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ready) {
          setFailure('הזינו מייל או טלפון');
          return;
        }
        setBusy(true);
        setFailure(null);
        const result = await onSave({ role, name: name.trim(), email: email.trim(), phone: phone.trim(), bank: bank.trim() });
        setBusy(false);
        if (result) setFailure(result);
      }}
      className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {chooseRole && (
          <label className="text-xs font-bold text-slate-600">
            תפקיד
            <select value={role} onChange={(event) => setRole(event.target.value as RecipientRole)} className={`mt-1 ${field}`}>
              {(Object.keys(RECIPIENT_ROLES) as RecipientRole[]).map((key) => (
                <option key={key} value={key}>
                  {RECIPIENT_ROLES[key]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs font-bold text-slate-600">
          שם <span className="font-normal text-slate-400">(רשות)</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className={`mt-1 ${field}`} />
        </label>
        {role === 'BANKER' && (
          <label className="text-xs font-bold text-slate-600">
            בנק
            <input value={bank} onChange={(event) => setBank(event.target.value)} maxLength={60} className={`mt-1 ${field}`} />
          </label>
        )}
        <label className="text-xs font-bold text-slate-600">
          מייל
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className={`mt-1 ${field}`}
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          טלפון
          <input
            dir="ltr"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="050-0000000"
            className={`mt-1 ${field}`}
          />
        </label>
      </div>
      {failure && <p className="text-sm font-bold text-rose-600">{failure}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !ready}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-button font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          שמירה
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-button font-bold text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
            ביטול
          </button>
        )}
      </div>
    </form>
  );
}
