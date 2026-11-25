'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarRange,
  Check,
  Copy,
  CreditCard,
  Link2,
  Loader2,
  Mail,
  ShieldCheck,
  ShieldOff,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePricing } from '@/components/pricing/PricingProvider';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { GRANT_PRESETS, addMonths, israelDateInput } from '@/lib/granted-access';
import type { ClientPaymentSettings as Settings } from '@/lib/granted-access-store';
import type { ClientBillingSummary } from '@/lib/client-billing';
import type { PaymentLinkView } from '@/lib/payment-links';
import { SectionCard, formatShekel } from './ui';

const DATE = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
const fmt = (iso: string | null | undefined) => (iso ? DATE.format(new Date(iso)) : '—');

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

const LINK_STATUS: Record<PaymentLinkView['status'], { label: string; tone: string }> = {
  OPEN: { label: 'ממתין לתשלום', tone: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'שולם', tone: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'בוטל', tone: 'bg-slate-100 text-slate-500' },
};

const DEFAULT_TITLE = 'גישה לאזור האישי במשכלנתא';

function useClientPaymentSettings(clientId: string) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    if (!clientId) return;
    try {
      const response = await fetch(`/api/clients/${clientId}/paid-access`, { cache: 'no-store' });
      if (response.ok) setSettings(await response.json());
    } finally {
      setReady(true);
    }
  }, [clientId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  // תשלום שעבר בקישור, או שינוי מחלון אחר — מופיע בלי ריפרש
  useLiveRefresh(() => void refresh());
  return { settings, ready, refresh };
}

/**
 * טאב "תשלום והרשאה" בדף הלקוח אצל היועץ.
 *
 * 1. גבייה ב-HYP — קישור תשלום ללקוח, במייל או להעתקה, והסטטוס של כל קישור.
 * 2. אחרי שהתשלום עבר — סימון הלקוח כמשלם לתקופה שהיועץ בוחר. מאותו רגע
 *    האזור האישי של הלקוח פתוח כמו של לקוח ששילם, עד סוף התקופה.
 * 3. עדכון התקופה או ביטול הסימון בכל עת. כל שינוי מגיע ללקוח בלי ריפרש.
 */
export function ClientPaymentSettings({
  clientId,
  billing,
  onChanged,
}: {
  clientId: string;
  /** מה הלקוח שילם בעצמו דרך האתר — כדי להציג את כל הגישה שלו */
  billing: ClientBillingSummary | null | undefined;
  onChanged?: () => void;
}) {
  const { settings, ready, refresh } = useClientPaymentSettings(clientId);
  const grant = settings?.grant ?? null;

  if (!ready) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!settings) {
    return <p className="py-16 text-center text-info text-rose-700">לא הצלחנו לטעון את הגדרות התשלום של הלקוח</p>;
  }

  const changed = async () => {
    await refresh();
    onChanged?.();
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <AccessStatus grant={grant} billing={billing} />
      <div className="grid gap-4 lg:grid-cols-2">
        <GrantForm clientId={clientId} grant={grant} links={settings.links} onChanged={changed} />
        <ChargeCard settings={settings} onChanged={changed} />
      </div>
    </div>
  );
}

function AccessStatus({
  grant,
  billing,
}: {
  grant: Settings['grant'];
  billing: ClientBillingSummary | null | undefined;
}) {
  // הגישה שהלקוח שילם עליה בעצמו — בלי הגישה שהיועץ הגדיר, שמוצגת בנפרד
  const selfPaidEnds = useMemo(() => {
    const ends = (billing?.payments ?? [])
      .filter((payment) => payment.kind !== 'GRANT' && payment.accessUntil)
      .map((payment) => payment.accessUntil as string)
      .sort();
    return ends.length ? ends[ends.length - 1] : null;
  }, [billing]);
  const selfPaidActive = selfPaidEnds ? new Date(selfPaidEnds).getTime() > Date.now() : false;
  const paying = Boolean(grant?.active) || selfPaidActive;

  return (
    <section
      className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 shadow-sm ${
        paying ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          paying ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {paying ? <BadgeCheck className="h-6 w-6" /> : <ShieldOff className="h-6 w-6" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-subtitle text-slate-900">{paying ? 'לקוח משלם' : 'הלקוח לא מוגדר כמשלם'}</p>
        <p className="text-info text-slate-600">
          {grant?.active
            ? `גישה שהגדרת: מ-${fmt(grant.from)} עד ${fmt(grant.until)} · נשארו ${grant.daysLeft} ימים`
            : grant
              ? `הגישה שהגדרת הסתיימה ב-${fmt(grant.until)}`
              : 'האזור האישי שלו נעול כמו של לקוח שלא שילם. אפשר לגבות ממנו כאן ולסמן אותו כמשלם.'}
        </p>
        {selfPaidEnds && (
          <p className="text-2xs text-slate-500">
            שילם בעצמו דרך האתר · {selfPaidActive ? 'בתוקף עד' : 'פג ב-'} {fmt(selfPaidEnds)}
          </p>
        )}
        {grant?.note && <p className="text-2xs text-slate-500">הערה: {grant.note}</p>}
      </div>
    </section>
  );
}

function GrantForm({
  clientId,
  grant,
  links,
  onChanged,
}: {
  clientId: string;
  grant: Settings['grant'];
  links: PaymentLinkView[];
  onChanged: () => Promise<void>;
}) {
  const today = israelDateInput(new Date());
  const [from, setFrom] = useState(grant?.active ? israelDateInput(grant.from) : today);
  const [until, setUntil] = useState(grant?.active ? israelDateInput(grant.until) : israelDateInput(addMonths(new Date(), 1)));
  const [note, setNote] = useState(grant?.note ?? '');
  const [busy, setBusy] = useState<'save' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // כשהגישה משתנה מחלון אחר — הטופס מציג את המצב החדש
  const grantKey = grant ? `${grant.from}|${grant.until}|${grant.note ?? ''}` : '';
  useEffect(() => {
    if (!grant?.active) return;
    setFrom(israelDateInput(grant.from));
    setUntil(israelDateInput(grant.until));
    setNote(grant.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantKey]);

  const preset = (months: number) => {
    const start = from ? new Date(`${from}T12:00:00Z`) : new Date();
    setUntil(israelDateInput(addMonths(start, months)));
  };

  const lastPaidLink = links.find((link) => link.status === 'PAID');

  const save = async () => {
    setBusy('save');
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/clients/${clientId}/paid-access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, until, note }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'השמירה נכשלה. נסו שוב.');
        return;
      }
      setNotice(grant?.active ? 'התקופה עודכנה. האזור האישי של הלקוח מתעדכן מיד.' : 'הלקוח סומן כמשלם. האזור האישי שלו נפתח מיד.');
      await onChanged();
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!window.confirm('לבטל את הסימון של הלקוח כמשלם? האזור האישי שלו יינעל כמו של לקוח שלא שילם.')) return;
    setBusy('cancel');
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/clients/${clientId}/paid-access`, { method: 'DELETE' });
      if (!response.ok) {
        setError('הביטול נכשל. נסו שוב.');
        return;
      }
      setNotice('הסימון כמשלם בוטל.');
      setFrom(today);
      setUntil(israelDateInput(addMonths(new Date(), 1)));
      setNote('');
      await onChanged();
    } finally {
      setBusy(null);
    }
  };

  return (
    <SectionCard title="הגדרת לקוח משלם" icon={<ShieldCheck className="h-4 w-4" />}>
      <p className="mb-3 text-info text-slate-600">
        אחרי שווידאת שהתשלום עבר, בחר לאיזו תקופה הלקוח נחשב משלם. עד סוף התקופה האזור האישי שלו פתוח כמו של לקוח ששילם,
        והוא מופיע ברשימת המשלמים.
      </p>
      {lastPaidLink && !grant?.active && (
        <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-info text-emerald-800">
          התקבל תשלום בקישור &quot;{lastPaidLink.title}&quot; ({formatShekel(lastPaidLink.amount)}) ב-{fmt(lastPaidLink.paidAt)}.
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="תקופה מוכנה">
        {GRANT_PRESETS.map((item) => (
          <Button key={item.months} type="button" size="sm" variant="outline" onClick={() => preset(item.months)}>
            {item.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-slate-600">
          מתאריך
          <Input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          עד תאריך (כולל)
          <Input type="date" dir="ltr" min={today} value={until} onChange={(e) => setUntil(e.target.value)} className="mt-1" />
        </label>
        <label className="block text-xs font-bold text-slate-600 sm:col-span-2">
          הערה <span className="font-normal text-slate-400">(רשות, רק לך)</span>
          <Input
            value={note}
            maxLength={200}
            placeholder="למשל: שילם בהעברה בנקאית"
            onChange={(e) => setNote(e.target.value)}
            className="mt-1"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={save} disabled={busy !== null || !until}>
          {busy === 'save' ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <CalendarRange className="ml-1 h-4 w-4" />}
          {grant?.active ? 'עדכון התקופה' : 'סימון כמשלם'}
        </Button>
        {grant && (
          <Button type="button" variant="outline" onClick={cancel} disabled={busy !== null}>
            {busy === 'cancel' ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <ShieldOff className="ml-1 h-4 w-4" />}
            ביטול הסימון כמשלם
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-info font-bold text-rose-700">{error}</p>}
      {notice && <p className="mt-2 text-info font-bold text-emerald-700">{notice}</p>}
    </SectionCard>
  );
}

function ChargeCard({ settings, onChanged }: { settings: Settings; onChanged: () => Promise<void> }) {
  const { config, platformPrice } = usePricing();
  const services = config.tracks;
  const [trackId, setTrackId] = useState('');
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [amount, setAmount] = useState(String(platformPrice || ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { client, links } = settings;

  const chooseService = (id: string) => {
    setTrackId(id);
    const track = services.find((item) => item.id === id);
    if (track) {
      setTitle(track.name);
      if (track.price) setAmount(String(track.price));
    }
  };

  const copy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied((current) => (current === id ? null : current)), 2000);
    } catch {
      window.prompt('העתיקו את הקישור:', url);
    }
  };

  const create = async (send: boolean) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/advisor/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          amount,
          trackId: trackId || null,
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone,
          send,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'הקישור לא נוצר. נסו שוב.');
        return;
      }
      if (body?.sendError) setNotice(`הקישור נוצר, אבל ${body.sendError}`);
      else if (send) setNotice('הקישור נשלח ללקוח במייל.');
      else {
        await copy(body.link.url, body.link.id);
        setNotice('הקישור נוצר והועתק.');
      }
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: 'send' | 'cancel') => {
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/advisor/payment-links/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) setError(body?.error ?? 'הפעולה נכשלה');
    else setNotice(action === 'send' ? 'הקישור נשלח שוב במייל.' : 'הקישור בוטל.');
    await onChanged();
  };

  const canCreate = title.trim().length > 1 && Number(amount) > 0;

  return (
    <SectionCard title="גבייה דרך HYP" icon={<CreditCard className="h-4 w-4" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-slate-600 sm:col-span-2">
          שירות
          <select value={trackId} onChange={(e) => chooseService(e.target.value)} className={`mt-1 ${selectClass}`}>
            <option value="">גישה לאזור האישי / שירות אחר</option>
            {services.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
                {track.price ? ` · ${formatShekel(track.price)}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-600">
          על מה משלמים (יופיע בחשבונית)
          <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          סכום (₪)
          <Input
            value={amount}
            inputMode="numeric"
            dir="ltr"
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
            className="mt-1"
          />
        </label>
      </div>
      <p className="mt-2 text-2xs text-slate-500">
        הקישור נשלח אל <span dir="ltr">{client.email}</span>. הלקוח משלם בעמוד המאובטח של HYP ומקבל חשבונית, ואתה מקבל מייל
        כשהתשלום עובר.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => create(true)} disabled={!canCreate || busy || !client.email}>
          {busy ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Mail className="ml-1 h-4 w-4" />}
          שליחת קישור תשלום במייל
        </Button>
        <Button type="button" variant="outline" onClick={() => create(false)} disabled={!canCreate || busy}>
          <Link2 className="ml-1 h-4 w-4" />
          יצירה והעתקה
        </Button>
      </div>
      {error && <p className="mt-2 text-info font-bold text-rose-700">{error}</p>}
      {notice && <p className="mt-2 text-info font-bold text-emerald-700">{notice}</p>}

      <h4 className="mt-5 mb-2 text-xs font-black text-slate-700">קישורי התשלום של הלקוח</h4>
      {links.length === 0 ? (
        <p className="text-info text-slate-500">עוד לא נשלח ללקוח קישור תשלום.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {links.map((link) => (
            <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-info font-bold text-slate-900">{link.title}</span>
                  <span className="text-info text-slate-700">{formatShekel(link.amount)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${LINK_STATUS[link.status].tone}`}>
                    {LINK_STATUS[link.status].label}
                  </span>
                </div>
                <div className="text-2xs text-slate-500">
                  נוצר {fmt(link.createdAt)}
                  {link.sentAt && ` · נשלח ${fmt(link.sentAt)}`}
                  {link.paidAt && ` · שולם ${fmt(link.paidAt)}`}
                  {link.invoiceNumber && ` · חשבונית ${link.invoiceNumber}`}
                </div>
              </div>
              {link.status === 'OPEN' && (
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => copy(link.url, link.id)} aria-label="העתקת הקישור">
                    {copied === link.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => act(link.id, 'send')} aria-label="שליחה שוב במייל">
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => act(link.id, 'cancel')} aria-label="ביטול הקישור">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
