import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { normalizeEmail } from '@/lib/find-user-by-login';
import { passwordProblem } from '@/lib/password-policy';
import {
  REGISTRATION_DEVICE_COOKIE,
  VERIFICATION_TTL_MINUTES,
  generateToken,
  startRegistration,
} from '@/lib/registration';

export const maxDuration = 30;

/**
 * הרשמת לקוח חדש. לא יוצרת משתמש — רק הרשמה ממתינה ומייל עם קישור אימות.
 * המשתמש נוצר ומחובר רק כשהקישור מאושר (ראו src/lib/registration.ts).
 *
 * ההרשמה פתוחה ללקוחות בלבד: שדה role, אם נשלח, מתעלמים ממנו.
 *
 * אין שם משתמש נפרד: השם המלא הוא השם שמוצג בכל מקום, והכניסה היא במייל.
 * שדה username, אם נשלח מטופס ישן, מתעלמים ממנו.
 */
const registerSchema = z.object({
  email: z.string().trim().email('כתובת מייל לא תקינה').max(254),
  // 8 תווים, אות, ספרה וסימן, ועד 72 בתים (ראו src/lib/password-policy.ts)
  password: z.string().superRefine((value, ctx) => {
    const problem = passwordProblem(value);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
  }),
  name: z.string().trim().min(2, 'השם חייב להכיל לפחות 2 תווים').max(80),
  callbackUrl: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { password, name, callbackUrl } = validation.data;
    const email = normalizeEmail(validation.data.email);

    // עוגייה שמזהה את הדפדפן הזה: אישור הקישור מכאן לא ידרוש שוב את הסיסמה
    const deviceToken = request.cookies.get(REGISTRATION_DEVICE_COOKIE)?.value || generateToken();

    const result = await startRegistration({
      email,
      name,
      password,
      callbackUrl,
      deviceToken,
      requestOrigin: request.nextUrl.origin,
    });

    if (result.status === 'exists') {
      return NextResponse.json(
        { error: 'כבר קיים משתמש עם המייל הזה. התחברו, או בחרו סיסמה חדשה אם שכחתם אותה.', code: 'email-exists' },
        { status: 409 }
      );
    }
    if (result.status === 'cooldown') {
      return NextResponse.json(
        { error: 'כבר שלחנו קישור לכתובת הזו לפני רגע. בדקו את תיבת המייל, או נסו שוב בעוד דקה.' },
        { status: 429 }
      );
    }
    if (result.status === 'limit') {
      return NextResponse.json(
        { error: 'נשלחו יותר מדי קישורים לכתובת הזו. נסו שוב בעוד שעה.' },
        { status: 429 }
      );
    }
    if (result.status === 'email-failed') {
      return NextResponse.json(
        { error: 'לא הצלחנו לשלוח את מייל האימות. נסו שוב בעוד רגע.' },
        { status: 502 }
      );
    }

    const response = NextResponse.json(
      {
        message: 'שלחנו לכם מייל עם קישור לאישור ההרשמה.',
        email,
        ttlMinutes: VERIFICATION_TTL_MINUTES,
      },
      { status: 202 }
    );
    response.cookies.set(REGISTRATION_DEVICE_COOKIE, deviceToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json({ error: 'לא ניתן להתחבר למסד הנתונים. נסו שוב בעוד רגע.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'אירעה שגיאה בתהליך ההרשמה' }, { status: 500 });
  }
}
