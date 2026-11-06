import { NextRequest, NextResponse } from 'next/server';
import {
  REGISTRATION_DEVICE_COOKIE,
  cancelVerification,
  inspectVerification,
  resendVerification,
} from '@/lib/registration';

/**
 * פעולות על קישור האימות, מעמוד האישור ומעמוד "בדקו את המייל":
 *   • inspect — פרטי ההרשמה לתצוגה, בלי לצרוך את הקישור. מסנני דואר שפותחים
 *     קישורים מראש לא יכולים לאשר הרשמה: האישור עצמו דורש לחיצה, דרך signIn.
 *   • cancel  — "לא אני נרשמתי": מוחק את ההרשמה הממתינה.
 *   • resend  — קישור חדש, לפי מייל או לפי קישור שפג תוקפו. הקודם מפסיק לעבוד.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action : 'inspect';
    const token = typeof body?.token === 'string' ? body.token : '';
    const email = typeof body?.email === 'string' ? body.email : '';

    if (action === 'inspect') {
      const deviceToken = request.cookies.get(REGISTRATION_DEVICE_COOKIE)?.value;
      return NextResponse.json(await inspectVerification(token, deviceToken));
    }

    if (action === 'cancel') {
      await cancelVerification(token);
      return NextResponse.json({ status: 'cancelled' });
    }

    if (action === 'resend') {
      if (!token && !email) {
        return NextResponse.json({ error: 'חסרה כתובת מייל' }, { status: 400 });
      }
      const result = await resendVerification({ token, email }, request.nextUrl.origin);
      if (result.status === 'cooldown') {
        return NextResponse.json({ error: 'אפשר לשלוח קישור חדש פעם בדקה.' }, { status: 429 });
      }
      if (result.status === 'limit') {
        return NextResponse.json({ error: 'נשלחו יותר מדי קישורים. נסו שוב בעוד שעה.' }, { status: 429 });
      }
      if (result.status === 'email-failed') {
        return NextResponse.json({ error: 'לא הצלחנו לשלוח את המייל. נסו שוב בעוד רגע.' }, { status: 502 });
      }
      return NextResponse.json({ status: 'sent' });
    }

    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'אירעה שגיאה בתהליך האימות' }, { status: 500 });
  }
}
