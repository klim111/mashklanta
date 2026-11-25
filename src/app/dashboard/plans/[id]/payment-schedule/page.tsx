import { Suspense } from 'react';
import { PaymentScheduleTool } from '@/components/plan/payment-schedule/PaymentScheduleTool';

export const metadata = {
  title: 'תכנון פעימות התשלום',
};

export default async function PaymentSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PaymentScheduleTool planId={id} />
    </Suspense>
  );
}
