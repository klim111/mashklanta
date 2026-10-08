import { NextRequest, NextResponse } from 'next/server';
import { completeReturn } from '@/lib/billing';

/**
 * דף ההצלחה ודף הכישלון שמוגדרים במסוף HYP מצביעים לכאן. התשלום נרשם רק אחרי
 * שהתוצאה אומתה מול HYP (src/lib/billing.ts), ואז הלקוח עובר לעמוד התוצאה
 * באזור האישי.
 */
async function handle(req: NextRequest, params: URLSearchParams) {
  const result = await completeReturn(params);
  const target = new URL('/billing/result', req.nextUrl.origin);
  target.searchParams.set('status', result.outcome);
  if (result.outcome === 'paid') {
    if (result.returnPath) target.searchParams.set('next', result.returnPath);
    if (result.renewal) target.searchParams.set('renewal', '1');
  }
  if (result.outcome === 'failed' && result.code) target.searchParams.set('code', result.code.slice(0, 10));
  return NextResponse.redirect(target, { status: 303 });
}

export async function GET(req: NextRequest) {
  return handle(req, req.nextUrl.searchParams);
}

/** חלק מהמסופים מחזירים את התוצאה בטופס POST */
export async function POST(req: NextRequest) {
  const params = new URLSearchParams(req.nextUrl.searchParams);
  const form = await req.formData().catch(() => null);
  form?.forEach((value, key) => {
    if (typeof value === 'string' && !params.has(key)) params.append(key, value);
  });
  return handle(req, params);
}
