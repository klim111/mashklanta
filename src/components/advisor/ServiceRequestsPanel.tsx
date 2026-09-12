'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, MapPin, Sparkles, UserRound } from 'lucide-react';
import type { AdvisorOrderRequest } from '@/lib/advisor-order-store';
import { formatOrderPrice } from '@/lib/advisor-orders';
import { journeyStageFor } from '@/data/platform/planStages';
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

export function ServiceRequestsPanel({
  requests,
  ready,
  onOpenClient,
}: {
  requests: AdvisorOrderRequest[];
  ready: boolean;
  /** מעבר לתיק הלקוח שממנו הגיעה הבקשה */
  onOpenClient?: (clientId: string) => void;
}) {
  if (!ready) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <SectionCard
      title="בקשות ליווי מלקוחות"
      icon={<Sparkles className="h-4 w-4 text-violet-600" />}
      action={
        requests.length > 0 ? (
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-black text-violet-700">
            {requests.length}
          </span>
        ) : null
      }
    >
      {requests.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="אין בקשות ליווי חדשות"
          hint="כשלקוח לוחץ ׳תנו ליועץ משכלנתא לעשות לכם את העבודה׳ ומשלם, הבקשה תופיע כאן — ומשימה לכל שלב תיפתח בלוח המשימות."
        />
      ) : (
        <div className="space-y-2.5">
          {requests.map((request) => (
            <RequestRow key={request.id} request={request} onOpenClient={onOpenClient} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function RequestRow({
  request,
  onOpenClient,
}: {
  request: AdvisorOrderRequest;
  onOpenClient?: (clientId: string) => void;
}) {
  const paid = request.paidAt ? new Date(request.paidAt) : null;

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
          {formatOrderPrice(request.amount)}
          {paid && (
            <span className="mr-1.5 font-normal text-slate-400">
              שולם ב-{paid.toLocaleDateString('he-IL')}
            </span>
          )}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {request.stages.map((stage) => (
          <StageChip key={stage} stage={stage} />
        ))}
        <span className="text-[11px] text-slate-500">
          {request.stages.length === 1
            ? `הלקוח ביקש שתבצעו את שלב ${journeyStageFor(request.stages[0]).number}`
            : `הלקוח ביקש שתבצעו ${request.stages.length} שלבים`}
        </span>

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
