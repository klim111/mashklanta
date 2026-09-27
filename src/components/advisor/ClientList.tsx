'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  FileText,
  Layers,
  ListChecks,
  Mail,
  Phone,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { INCOME_BUCKET_LABELS, INCOME_BUCKETS } from '@/lib/income-buckets';
import { PLAN_STAGES, formatDate, formatTime } from '@/lib/advisor-crm';
import type { PlanStageId } from '@/lib/advisor-crm';
import { StageIcon, stageLabel } from './ui';
import type { AdvisorClient } from './useAdvisorClients';

interface ClientListProps {
  clients: AdvisorClient[];
  ready: boolean;
  error?: string | null;
  onAddClient: (input: { email: string; name?: string; phone?: string }) => Promise<string | null>;
  /** ברירת המחדל היא מעבר לדף הלקוח; מסכים אחרים יכולים לתפוס את הלחיצה */
  onSelect?: (client: AdvisorClient) => void;
  /** קביעת פגישה ישירות משורת הלקוח */
  onScheduleMeeting?: (client: AdvisorClient) => void;
  emptyHint?: string;
  /** חיפוש חיצוני — כשהוא מגיע משורת החיפוש שבראש הלוח */
  query?: string;
  onQueryChange?: (value: string) => void;
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
  onScheduleMeeting,
  emptyHint,
  query: externalQuery,
  onQueryChange,
}: ClientListProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const query = externalQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;

  const [incomeBucket, setIncomeBucket] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');
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
      if (stageFilter && client.planStage !== stageFilter) return false;
      if (!term) return true;
      return [client.name, client.email, client.phone ?? ''].some((field) =>
        field.toLowerCase().includes(term)
      );
    });
  }, [clients, query, incomeBucket, stageFilter]);

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
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש לפי שם, אימייל או טלפון"
            className="h-9 pr-9 text-sm"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(event) => setStageFilter(event.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
          aria-label="סינון לפי שלב בתהליך"
        >
          <option value="">כל השלבים</option>
          {PLAN_STAGES.map((stage, index) => (
            <option key={stage} value={stage}>
              שלב {index + 1} · {stageLabel(stage)}
            </option>
          ))}
        </select>
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
          <UserPlus className="ml-1 h-4 w-4" />
          לקוח חדש
        </Button>
      </div>

      {adding && (
        <form onSubmit={submit} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
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
            <p className="flex items-center gap-1 text-xs text-red-600">
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
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      {!ready ? (
        <p className="py-8 text-center text-sm text-slate-500">טוען לקוחות...</p>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center">
          <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">
            {clients.length === 0
              ? emptyHint ?? 'עדיין אין לקוחות. צרפו לקוח לפי האימייל שאיתו נרשם למערכת.'
              : 'אין לקוח שמתאים לחיפוש.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <ClientRow
              key={client.id}
              client={client}
              onSelect={onSelect}
              onScheduleMeeting={onScheduleMeeting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** רצף חמשת השלבים בזעיר אנפין, כפי שהם מופיעים אצל הלקוח */
function MiniStageTrack({ stage }: { stage: PlanStageId | null }) {
  const current = stage ? PLAN_STAGES.indexOf(stage) : -1;

  return (
    <div className="flex items-center gap-1">
      {PLAN_STAGES.map((item, index) => (
        <span
          key={item}
          title={`שלב ${index + 1} · ${stageLabel(item)}`}
          className={`flex h-5 w-5 items-center justify-center rounded-md ${
            current < 0
              ? 'bg-slate-100 text-slate-300'
              : index < current
                ? 'bg-emerald-100 text-emerald-600'
                : index === current
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-400'
          }`}
        >
          <StageIcon stage={item} className="h-3 w-3" />
        </span>
      ))}
    </div>
  );
}

function ClientRow({
  client,
  onSelect,
  onScheduleMeeting,
}: {
  client: AdvisorClient;
  onSelect?: (client: AdvisorClient) => void;
  onScheduleMeeting?: (client: AdvisorClient) => void;
}) {
  const body = (
    <div className="relative flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-400 hover:bg-blue-50/40">
      {/* הקישור פרוש על כל השורה, כדי שכפתור הפגישה יישאר כפתור עצמאי ולא
          ייווצר אלמנט לחיץ בתוך אלמנט לחיץ */}
      {!onSelect && (
        <Link
          href={`/advisor-dashboard/client/${client.id}`}
          aria-label={`פתיחת התיק של ${client.name}`}
          className="absolute inset-0 rounded-xl"
        />
      )}

      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white">
        {client.name.slice(0, 2)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{client.name}</p>
        <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
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

      <div className="hidden min-w-[140px] text-center sm:block">
        <p className="text-[10px] text-slate-400">
          {client.planStage ? stageLabel(client.planStage) : 'טרם נפתח תהליך'}
        </p>
        <div className="mt-1 flex justify-center">
          <MiniStageTrack stage={client.planStage} />
        </div>
      </div>

      <div className="min-w-[70px] text-center">
        <p className="text-[10px] text-slate-400">משכנתא</p>
        <p className="text-xs font-semibold text-slate-800">{formatShekel(client.mortgageAmount)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Layers className="h-3 w-3" />
          {client.mixCount} תמהילים
        </Badge>
        {client.openTasks > 0 && (
          <Badge className="gap-1 bg-blue-100 text-[10px] text-blue-800 hover:bg-blue-100">
            <ListChecks className="h-3 w-3" />
            {client.openTasks} משימות
          </Badge>
        )}
        {client.openDocuments > 0 && (
          <Badge className="gap-1 bg-amber-100 text-[10px] text-amber-800 hover:bg-amber-100">
            <FileText className="h-3 w-3" />
            {client.openDocuments} מסמכים
          </Badge>
        )}
        {client.nextMeetingAt && (
          <Badge className="gap-1 bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
            <CalendarClock className="h-3 w-3" />
            {formatDate(client.nextMeetingAt)} · {formatTime(client.nextMeetingAt)}
          </Badge>
        )}
      </div>

      {onScheduleMeeting && (
        <Button
          size="sm"
          variant="outline"
          className="relative z-10 h-8 text-[11px]"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onScheduleMeeting(client);
          }}
        >
          <CalendarPlus className="ml-1 h-3.5 w-3.5" />
          קבע פגישה
        </Button>
      )}

      <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />
    </div>
  );

  if (onSelect) {
    return (
      <div
        role="button"
        tabIndex={0}
        className="w-full cursor-pointer text-right"
        onClick={() => onSelect(client)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onSelect(client);
        }}
      >
        {body}
      </div>
    );
  }

  return body;
}
