'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, UserPlus, Users } from 'lucide-react';

interface ClientRow {
  clientId: string;
  name: string | null;
  email: string | null;
  caseId: string | null;
  caseStatus: string | null;
  updatedAt: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'בעריכה',
  submitted: 'הוגש',
  approved: 'אושר',
  archived: 'בארכיון',
};

/** Advisor landing page: pick a client and open their principal-approval file. */
export function AdvisorClientList() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/advisor/clients', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'טעינת הלקוחות נכשלה');
      setClients(json);
    } catch (err: any) {
      setError(err?.message ?? 'טעינת הלקוחות נכשלה');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addClient = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/advisor/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientEmail: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'השיוך נכשל');
      setEmail('');
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'השיוך נכשל');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">הלקוחות שלי</h1>
              <p className="mt-0.5 text-[13px] text-slate-500">
                בחירת לקוח פותחת את תיק האישור העקרוני שלו להזנה ולעדכון
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5">
            <div className="flex-1 min-w-[240px]">
              <label htmlFor="client-email" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                שיוך לקוח לפי אימייל
              </label>
              <input
                id="client-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-50"
              />
            </div>
            <button
              type="button"
              onClick={() => void addClient()}
              disabled={busy || !email.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              שיוך לקוח
            </button>
          </div>

          {error && <p className="mt-3 text-[12px] text-rose-600">{error}</p>}
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <Plus className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">טרם שויכו לקוחות. יש לשייך לקוח לפי כתובת האימייל שלו.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <Link
                key={client.clientId}
                href={`/advisor/clients/${client.clientId}/principal-approval`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
              >
                <div>
                  <p className="text-[14px] font-bold text-slate-900">{client.name ?? client.email}</p>
                  <p className="text-[12px] text-slate-400">{client.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {client.caseStatus && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {STATUS_LABEL[client.caseStatus] ?? client.caseStatus}
                    </span>
                  )}
                  {client.updatedAt && (
                    <span className="text-[11px] text-slate-400">
                      עודכן {new Date(client.updatedAt).toLocaleDateString('he-IL')}
                    </span>
                  )}
                  <ArrowLeft className="h-4 w-4 text-indigo-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
