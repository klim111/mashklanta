'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link2, Loader2, Mail, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePricing } from '@/components/pricing/PricingProvider';
import type { PaymentLinkView } from '@/lib/payment-links';
import type { AdvisorClient } from './useAdvisorClients';
import { SectionCard, formatShekel } from './ui';

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

const STATUS: Record<PaymentLinkView['status'], { label: string; tone: string }> = {
  OPEN: { label: 'ממתין לתשלום', tone: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'שולם', tone: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'בוטל', tone: 'bg-slate-100 text-slate-500' },
};

const EMPTY = {
  trackId: '',
  title: '',
  description: '',
  amount: '',
  clientId: '',
  clientName: '',
  clientEmail: '',
  clientPhone: '',
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }).format(new Date(iso));
}

/**
 * "קישורי תשלום" בלוח היועץ: גבייה חד־פעמית על שירות ייעוץ. בוחרים שירות
 * (מסלול מעמוד התמחור או שירות חופשי), סכום ולקוח, ומקבלים קישור לעמוד תשלום
 * מאובטח — להעתקה או לשליחה במייל. כשהלקוח משלם, הקישור מסומן כשולם ומגיע מייל.
 */
export function PaymentLinksPanel({ clients }: { clients: AdvisorClient[] }) {
  const { config } = usePricing();
  const services = useMemo(() => config.tracks.filter((track) => track.kind !== 'PLATFORM'), [config]);

  const [links, setLinks] = useState<PaymentLinkView[]>([]);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/advisor/payment-links', { cache: 'no-store' });
      if (response.ok) setLinks(await response.json());
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const set = (patch: Partial<typeof EMPTY>) => setForm((current) => ({ ...current, ...patch }));

  const chooseService = (trackId: string) => {
    const track = services.find((item) => item.id === trackId);
    set({
      trackId,
      title: track?.name ?? form.title,
      amount: track?.price ? String(track.price) : form.amount,
    });
  };

  const chooseClient = (clientId: string) => {
    const client = clients.find((item) => item.id === clientId);
    set({
      clientId,
      clientName: client?.name ?? '',
      clientEmail: client?.email ?? '',
      clientPhone: client?.phone ?? '',
    });
  };

  const create = async (send: boolean) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/advisor/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, trackId: form.trackId || null, clientId: form.clientId || null, send }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'הקישור לא נוצר. נסו שוב.');
        return;
      }
      setForm(EMPTY);
      await refresh();
      if (body?.sendError) setNotice(`הקישור נוצר, אבל ${body.sendError}`);
      else if (send) setNotice('הקישור נוצר ונשלח ללקוח במייל.');
      else {
        await copy(body.link.url, body.link.id);
        setNotice('הקישור נוצר והועתק. אפשר להדביק אותו בוואטסאפ או במייל.');
      }
    } finally {
      setBusy(false);
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
    else setNotice(action === 'send' ? 'הקישור נשלח ללקוח במייל.' : 'הקישור בוטל.');
    await refresh();
  };

  const canCreate = form.title.trim().length > 1 && Number(form.amount) > 0;

  return (
    <div className="space-y-4" dir="rtl">
      <SectionCard title="קישור תשלום חדש" icon={<Plus className="h-4 w-4" />}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-bold text-slate-600">
            שירות
            <select value={form.trackId} onChange={(e) => chooseService(e.target.value)} className={`mt-1 ${selectClass}`}>
              <option value="">שירות אחר (לכתוב בעצמי)</option>
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
            <Input value={form.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} className="mt-1" />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            סכום (₪)
            <Input
              value={form.amount}
              inputMode="numeric"
              dir="ltr"
              onChange={(e) => set({ amount: e.target.value.replace(/[^\d]/g, '').slice(0, 6) })}
              className="mt-1"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            פירוט ללקוח <span className="font-normal text-slate-400">(רשות)</span>
            <Input
              value={form.description}
              maxLength={300}
              onChange={(e) => set({ description: e.target.value })}
              className="mt-1"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            לקוח
            <select value={form.clientId} onChange={(e) => chooseClient(e.target.value)} className={`mt-1 ${selectClass}`}>
              <option value="">לקוח שאינו ברשימה</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} · {client.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-600">
            שם הלקוח
            <Input value={form.clientName} maxLength={80} onChange={(e) => set({ clientName: e.target.value })} className="mt-1" />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            מייל הלקוח <span className="font-normal text-slate-400">(לשליחה ולחשבונית)</span>
            <Input
              type="email"
              dir="ltr"
              value={form.clientEmail}
              onChange={(e) => set({ clientEmail: e.target.value })}
              className="mt-1"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            טלפון <span className="font-normal text-slate-400">(רשות)</span>
            <Input
              dir="ltr"
              inputMode="tel"
              value={form.clientPhone}
              onChange={(e) => set({ clientPhone: e.target.value })}
              className="mt-1"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => create(true)} disabled={!canCreate || busy || !form.clientEmail}>
            {busy ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Mail className="ml-1 h-4 w-4" />}
            יצירה ושליחה ללקוח במייל
          </Button>
          <Button type="button" variant="outline" onClick={() => create(false)} disabled={!canCreate || busy}>
            <Link2 className="ml-1 h-4 w-4" />
            יצירה והעתקת הקישור
          </Button>
          {error && <span className="text-sm font-bold text-rose-700">{error}</span>}
          {notice && <span className="text-sm font-bold text-emerald-700">{notice}</span>}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          הלקוח משלם בעמוד התשלום המאובטח של HYP ומקבל חשבונית במייל. כשהתשלום עובר, הקישור מסומן כאן כשולם ונשלח אליך
          מייל. קישור שנשלח לא יכול להיות משולם פעמיים.
        </p>
      </SectionCard>

      <SectionCard title="קישורים שנוצרו" icon={<Link2 className="h-4 w-4" />}>
        {!ready ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
        ) : links.length === 0 ? (
          <p className="text-sm text-slate-500">עוד לא נוצרו קישורי תשלום.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {links.map((link) => (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{link.title}</span>
                    <span className="text-sm font-bold text-slate-700">{formatShekel(link.amount)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${STATUS[link.status].tone}`}>
                      {STATUS[link.status].label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {link.clientName || link.clientEmail || 'לקוח לא צוין'} · נוצר {formatDate(link.createdAt)}
                    {link.sentAt && ` · נשלח במייל ${formatDate(link.sentAt)}`}
                    {link.paidAt && ` · שולם ${formatDate(link.paidAt)}`}
                    {link.invoiceNumber && ` · חשבונית ${link.invoiceNumber}`}
                  </div>
                </div>
                {link.status === 'OPEN' && (
                  <div className="flex items-center gap-1.5">
                    <Button type="button" size="sm" variant="outline" onClick={() => copy(link.url, link.id)}>
                      {copied === link.id ? <Check className="ml-1 h-4 w-4" /> : <Copy className="ml-1 h-4 w-4" />}
                      {copied === link.id ? 'הועתק' : 'העתקה'}
                    </Button>
                    {link.clientEmail && (
                      <Button type="button" size="sm" variant="outline" onClick={() => act(link.id, 'send')}>
                        <Mail className="ml-1 h-4 w-4" />
                        {link.sentAt ? 'שליחה שוב' : 'שליחה במייל'}
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="ghost" onClick={() => act(link.id, 'cancel')}>
                      <X className="ml-1 h-4 w-4" />
                      ביטול
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
