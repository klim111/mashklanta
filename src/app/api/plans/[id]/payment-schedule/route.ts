import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { getPlanForUser } from '@/lib/mortgage-plans';
import { draftSchedule } from '@/lib/payment-schedule';
import { scheduleReportHtml } from '@/lib/payment-schedule-report';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * דוח פעימות התשלום כעמוד HTML. `?download=1` מוריד אותו כקובץ, כדי לשלוח
 * אותו לעורך הדין. כשעוד לא נשמרו פעימות — מוצג הלוח ההתחלתי מהפרופיל.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const plan = await getPlanForUser(userId, id);
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const schedule =
    plan.data.SIGNING.paymentSchedule ??
    draftSchedule(plan.data.ANALYSIS.propertyValue, plan.data.ANALYSIS.mortgageAmount);
  const html = scheduleReportHtml({
    schedule,
    title: plan.name,
    propertyAddress: plan.propertyAddress,
    generatedAt: new Date(),
  });

  const headers: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
  };
  if (req.nextUrl.searchParams.get('download') === '1') {
    headers['Content-Disposition'] = `attachment; filename="payment-schedule.html"; filename*=UTF-8''${encodeURIComponent('פעימות-תשלום.html')}`;
  }
  return new NextResponse(html, { headers });
}
