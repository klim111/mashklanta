'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ChevronLeft,
  FileText,
  Layers,
  Mail,
  Phone,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { STAGE_LABELS } from '@/lib/client-process';
import { INCOME_BUCKET_LABELS, INCOME_BUCKETS } from '@/lib/income-buckets';
import type { AdvisorClient } from './useAdvisorClients';

interface ClientListProps {
  clients: AdvisorClient[];
  ready: boolean;
  error?: string | null;
  onAddClient: (input: { email: string; name?: string; phone?: string }) => Promise<string | null>;
  /** ברירת המחדל היא מעבר לדף הלקוח; מסכים אחרים יכולים לתפוס את הלחיצה */
  onSelect?: (client: AdvisorClient) => void;
  emptyHint?: string;
}

function formatShekel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `₪${Math.round(value).toLocaleString('he-IL')}`;
}

/**
 * רשימת הלקוחות של היועץ. אותה רשימה משמשת גם בלוח היועץ וגם במסך הפתיחה של
 * כלי התכנון, כדי שהיועץ יתחיל תמיד מהלקוח ולא מתמהיל מנותק.
 */
export function ClientList({
  clients,
  ready,
  error,
  onAddClient,
  onSelect,
  emptyHint,
}: ClientListProps) {
  const [query, setQuery] = useState('');
  const [incomeBucket, setIncomeBucket] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return clients.filter((client) => {
      if (incomeBucket && client.incomeBucket !== incomeBucket) return false;
      if (!term) return true;
      return [client.name, client.email, client.phone ?? ''].some((field) =>
        field.toLowerCase().includes(term)
      );
    });
  }, [clients, query, incomeBucket]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const failure = await onAddClient({ email, name: name || undefined, phone: phone || undefined });
    setBusy(false);
    if (failure) {
      setAddError(failure);
      return;
    }
    setEmail('');
    setName('');
    setPhone('');
    setAddError(null);
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש לפי שם, אימייל או טלפון"
            className="pr-9 h-9 text-sm"
          />
        </div>
        <select
          value={incomeBucket}
          onChange={(event) => setIncomeBucket(event.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
          aria-label="סינון לפי טווח הכנסה"
        >
          <option value="">כל טווחי ההכנסה</option>
          {INCOME_BUCKETS.map((bucket) => (
            <option key={bucket} value={bucket}>
              {INCOME_BUCKET_LABELS[bucket]}
            </option>
          ))}
        </select>
        <Button size="sm" className="h-9" onClick={() => setAdding((open) => !open)}>
          <UserPlus className="h-4 w-4 ml-1" />
          צרף לקוח
        </Button>
      </div>

      {adding && (
        <form
          onSubmit={submit}
          className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
        >
          <p className="text-xs text-slate-600">
            הלקוח מצטרף לפי האימייל של החשבון שהוא פתח במערכת. אם עדיין אין לו חשבון, בקשו ממנו
            להירשם ואז צרפו אותו.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="אימייל הלקוח"
              type="email"
              required
              className="h-9 text-sm"
            />
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="שם לתצוגה (לא חובה)"
              className="h-9 text-sm"
            />
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="טלפון (לא חובה)"
              className="h-9 text-sm"
            />
          </div>
          {addError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {addError}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-8 text-xs" disabled={busy}>
              {busy ? 'מצרף...' : 'צרף'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setAdding(false)}
            >
              ביטול
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      {!ready ? (
        <p className="py-8 text-center text-sm text-slate-500">טוען לקוחות...</p>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {clients.length === 0
              ? emptyHint ?? 'עדיין אין לקוחות. צרפו לקוח לפי האימייל שאיתו נרשם למערכת.'
              : 'אין לקוח שמתאים לחיפוש.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <ClientRow key={client.id} client={client} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientRow({
  client,
  onSelect,
}: {
  client: AdvisorClient;
  onSelect?: (client: AdvisorClient) => void;
}) {
  const body = (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-400 hover:bg-blue-50/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
        {client.name.slice(0, 2)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 truncate">{client.name}</p>
        <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {client.email}
          </span>
          {client.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {client.phone}
            </span>
          )}
        </p>
      </div>

      <div className="hidden sm:block text-center min-w-[120px]">
        <p className="text-[10px] text-slate-400">שלב בתהליך</p>
        <p className="text-xs font-semibold text-slate-800">{STAGE_LABELS[client.stage]}</p>
        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200">
          <div
            className="h-1.5 rounded-full bg-blue-500"
            style={{ width: `${Math.min(100, Math.max(0, client.progress))}%` }}
          />
        </div>
      </div>

      <div className="text-center min-w-[70px]">
        <p className="text-[10px] text-slate-400">משכנתא</p>
        <p className="text-xs font-semibold text-slate-800">{formatShekel(client.mortgageAmount)}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Layers className="h-3 w-3" />
          {client.mixCount} תמהילים
        </Badge>
        {client.openDocuments > 0 && (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] gap-1">
            <FileText className="h-3 w-3" />
            {client.openDocuments} מסמכים חסרים
          </Badge>
        )}
      </div>

      <ChevronLeft className="h-4 w-4 text-slate-400 shrink-0" />
    </div>
  );

  if (onSelect) {
    return (
      <button type="button" className="w-full text-right" onClick={() => onSelect(client)}>
        {body}
      </button>
    );
  }

  return <Link href={`/advisor-dashboard/client/${client.id}`}>{body}</Link>;
}
