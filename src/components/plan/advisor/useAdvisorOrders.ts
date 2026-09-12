'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdvisorOrder } from '@/lib/advisor-orders';
import type { PlanStageId } from '@/lib/mortgage-plan';

export interface PaymentDetails {
  payerName: string;
  cardLast4: string;
  paymentRef?: string;
}

/**
 * הזמנות הליווי של התהליך.
 *
 * הרשימה נטענת מהשרת כדי שהשלבים שיועץ מבצע יהיו זהים בכל מכשיר, ולא ייקבעו
 * לפי מה שנשמר בדפדפן של הלקוח.
 */
export function useAdvisorOrders(planId: string) {
  const [orders, setOrders] = useState<AdvisorOrder[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/plans/${planId}/advisor-orders`, { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      setOrders(Array.isArray(body) ? body : []);
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את בקשות הליווי');
    } finally {
      setReady(true);
    }
  }, [planId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback(
    async (stages: PlanStageId[], note?: string): Promise<AdvisorOrder | null> => {
      const response = await fetch(`/api/plans/${planId}/advisor-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages, note }),
      });
      if (!response.ok) {
        setError('הבקשה לא נשמרה. נסו שוב.');
        return null;
      }
      const order = (await response.json()) as AdvisorOrder;
      await refresh();
      return order;
    },
    [planId, refresh]
  );

  const pay = useCallback(
    async (orderId: string, details: PaymentDetails): Promise<boolean> => {
      const response = await fetch(`/api/plans/${planId}/advisor-orders/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, termsAccepted: true }),
      });
      if (!response.ok) {
        setError('התשלום לא הושלם. בדקו את הפרטים ונסו שוב.');
        return false;
      }
      await refresh();
      return true;
    },
    [planId, refresh]
  );

  const cancel = useCallback(
    async (orderId: string) => {
      await fetch(`/api/plans/${planId}/advisor-orders/${orderId}`, { method: 'DELETE' });
      await refresh();
    },
    [planId, refresh]
  );

  return { orders, ready, error, refresh, request, pay, cancel };
}
