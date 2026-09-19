'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BriefcaseBusiness,
  HeartHandshake,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { AdvisorOrderRequest } from '@/lib/advisor-order-store';
import type { AdvisorLeadView } from '@/lib/advisor-leads';
import { formatOrderPrice } from '@/lib/advisor-orders';
import { planStageNumber } from '@/lib/mortgage-plan';
import { EmptyState, SectionCard, StageChip } from './ui';

/**
 * בקשות הליווי שלקוחות שילמו עליהן.
 *
 * זו ההתראה של היועץ על עבודה חדשה שנכנסה: מי ביקש, על איזה נכס, אילו שלבים
 * ומה שולם. לכל בקשה נפתחו גם משימות בלוח המשימות, לפי שלב — כאן רואים את
 * הבקשה עצמה, שלמה, לפני שמתחילים לעבוד.
 */
export function useAdvisorRequests() {
  const [requests, setRequests] = useState<AdvisorOrderRequest[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/advisor/service-orders', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      setRequests(Array.isArray(body) ? body : []);
    } catch {
      setRequests([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { requests, ready, refresh };
}

/** הפניות הכלליות שהגיעו ליועץ מטופס "אל דאגה" באזור האישי */
export function useAdvisorLeads() {
  const [leads, setLeads] = useState<AdvisorLeadView[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/advisor/leads', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      setLeads(Array.isArray(body) ? body : []);
    } catch {
      setLeads([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { leads, ready, refresh };
}

export function ServiceRequestsPanel({
  requests,
  ready,
  leads = [],
  leadsReady = true,
  onOpenClient,
  onMarkWork,
}: {
  requests: AdvisorOrderRequest[];
  ready: boolean;
  /** הפניות הכלליות מטופס "אל דאגה" */
  leads?: AdvisorLeadView[];
  leadsReady?: boolean;
  /** מעבר לתיק הלקוח שממנו הגיעה הבקשה */
  onOpenClient?: (clientId: string) => void;
  /** סימון שהשלב בעבודה והתשלום עליו סודר — נועל את התהליך מפני מחיקה */
  onMarkWork?: (orderId: string, inWork: boolean) => Promise<void>;
}) {
  if (!ready) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const total = requests.length + leads.length;

  return (
    <SectionCard
      title="בקשות ופניות ליווי"
      icon={<Sparkles className="h-4 w-4 text-violet-600" />}
      action={
        total > 0 ? (
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-black text-violet-700">
            {total}
          </span>
        ) : null
      }
    >
      <div className="space-y-5">
        {/* פניות כלליות מהאזור האישי — טופס "אל דאגה" */}
        {leadsReady && leads.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="flex items-center gap-1.5 text-xs font-black text-slate-700">
              <HeartHandshake className="h-4 w-4 text-violet-600" />
              בקשות ליווי ופניות ({leads.length})
            </h4>
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} onOpenClient={onOpenClient} />
            ))}
          </div>
        )}

        {/* בקשות ליווי לשלבים — חינמיות ובתשלום */}
        {requests.length > 0 && (
          <div className="space-y-2.5">
            {leads.length > 0 && (
              <h4 className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                <Sparkles className="h-4 w-4 text-violet-600" />
                בקשות ליווי לשלבים ({requests.length})
              </h4>
            )}
            {requests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                onOpenClient={onOpenClient}
                onMarkWork={onMarkWork}
              />
            ))}
          </div>
        )}

        {total === 0 && (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="אין בקשות או פניות חדשות"
            hint="בקשת ליווי מ״מה תרצו לעשות?״ באזור האישי או בעמוד הבית, פנייה מטופס ׳אל דאגה׳, פנייה ליועץ כלכלת המשפחה מכלי ההלוואות הצרכניות, או בקשת ׳תנו ליועץ׳ מתוך שלב — יופיעו כאן עם כל הפרטים וההערה של הלקוח."
          />
        )}
      </div>
    </SectionCard>
  );
}

const LEAD_TONE = 'border-violet-200 bg-violet-50/40';

/** שורת פנייה כללית — פרטי הקשר ונושא הפנייה */
function LeadRow({
  lead,
  onOpenClient,
}: {
  lead: AdvisorLeadView;
  onOpenClient?: (clientId: string) => void;
}) {
  const when = new Date(lead.createdAt);
  return (
    <div className={`rounded-2xl border p-3 ${LEAD_TONE}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-black text-slate-900">
          <UserRound className="h-4 w-4 text-violet-600" />
          {lead.name}
        </span>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-violet-700 ring-1 ring-violet-200">
          {lead.topicLabel}
        </span>
        <span className="mr-auto text-[11px] text-slate-400">
          {when.toLocaleDateString('he-IL')}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-slate-700">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-violet-700" dir="ltr">
            <Phone className="h-3.5 w-3.5" />
            {lead.phone}
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:text-violet-700" dir="ltr">
            <Mail className="h-3.5 w-3.5" />
            {lead.email}
          </a>
        )}
        {lead.clientId && onOpenClient && (
          <button
            type="button"
            onClick={() => onOpenClient(lead.clientId as string)}
            className="mr-auto inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-slate-700"
          >
            לתיק הלקוח
            <ArrowLeft className="h-3 w-3" />
          </button>
        )}
      </div>

      {lead.notes && (
        <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[12px] leading-relaxed text-slate-600">
          {lead.notes}
        </p>
      )}
    </div>
  );
}

function RequestRow({
  request,
  onOpenClient,
  onMarkWork,
}: {
  request: AdvisorOrderRequest;
  onOpenClient?: (clientId: string) => void;
  onMarkWork?: (orderId: string, inWork: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const paid = request.paidAt ? new Date(request.paidAt) : null;
  const inWork = request.workStartedAt !== null;

  const toggleWork = async () => {
    if (!onMarkWork) return;
    setBusy(true);
    try {
      await onMarkWork(request.id, !inWork);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-black text-slate-900">
          <UserRound className="h-4 w-4 text-violet-600" />
          {request.clientName}
        </span>

        {request.propertyAddress && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
            <MapPin className="h-3 w-3" />
            {request.propertyAddress}
          </span>
        )}

        <span className="mr-auto text-[11px] font-black text-slate-700">
          {inWork ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
              בעבודה · התשלום סודר
            </span>
          ) : request.status === 'REQUESTED' ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">
              בקשה חינמית · לקבוע פגישה
            </span>
          ) : (
            <>
              {formatOrderPrice(request.amount)}
              {paid && (
                <span className="mr-1.5 font-normal text-slate-400">
                  שולם ב-{paid.toLocaleDateString('he-IL')}
                </span>
              )}
            </>
          )}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {request.stages.map((stage) => (
          <StageChip key={stage} stage={stage} />
        ))}
        <span className="text-[11px] text-slate-500">
          {request.stages.length === 1
            ? `הלקוח ביקש שתבצעו את שלב ${planStageNumber(request.stages[0])}`
            : `הלקוח ביקש שתבצעו ${request.stages.length} שלבים`}
        </span>

        {onMarkWork && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleWork()}
            title={
              inWork
                ? 'הסרת הסימון תחזיר ללקוח את האפשרות לבטל את התהליך'
                : 'סימון שהשלב בעבודה אצלכם ושהתשלום עליו סודר — הלקוח לא יוכל למחוק את התהליך'
            }
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-black transition-colors disabled:opacity-60 ${
              inWork
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <BriefcaseBusiness className="h-3 w-3" />}
            {inWork ? 'בעבודה — לסיום הסימון' : 'סמנו: בעבודה, התשלום סודר'}
          </button>
        )}

        {request.clientId &&
          (onOpenClient ? (
            <button
              type="button"
              onClick={() => onOpenClient(request.clientId as string)}
              className="mr-auto inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-slate-700"
            >
              לתיק הלקוח
              <ArrowLeft className="h-3 w-3" />
            </button>
          ) : (
            <Link
              href={`/advisor-dashboard?client=${encodeURIComponent(request.clientId)}`}
              className="mr-auto inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-slate-700"
            >
              לתיק הלקוח
              <ArrowLeft className="h-3 w-3" />
            </Link>
          ))}
      </div>
    </div>
  );
}
