import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { normalizeEmail, normalizeUsername } from '@/lib/find-user-by-login';
import {
  REGISTRATION_DEVICE_COOKIE,
  VERIFICATION_TTL_MINUTES,
  generateToken,
  startRegistration,
  usernameTaken,
} from '@/lib/registration';

export const maxDuration = 30;

/**
 * הרשמת לקוח חדש. לא יוצרת משתמש — רק הרשמה ממתינה ומייל עם קישור אימות.
 * המשתמש נוצר ומחובר רק כשהקישור מאושר (ראו src/lib/registration.ts).
 *
 * ההרשמה פתוחה ללקוחות בלבד: שדה role, אם נשלח, מתעלמים ממנו.
 */
const registerSchema = z.object({
  email: z.string().trim().email('כתובת מייל לא תקינה').max(254),
  username: z
    .string()
    .trim()
    .min(3, 'שם המשתמש חייב להכיל לפחות 3 תווים')
    .max(32, 'שם המשתמש ארוך מדי')
    .regex(/^[a-zA-Z0-9._֐-׿-]+$/, 'שם המשתמש יכול להכיל אותיות, מספרים, נקודה, מקף וקו תחתון'),
  // bcrypt מתעלם מכל מה שמעבר ל-72 בתים, ולכן גם זה הגבול העליון
  password: z
    .string()
    .min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'הסיסמה ארוכה מדי'),
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
    const username = normalizeUsername(validation.data.username);

    if (await usernameTaken(username, email)) {
      return NextResponse.json({ error: 'שם המשתמש הזה כבר תפוס' }, { status: 400 });
    }

    // עוגייה שמזהה את הדפדפן הזה: אישור הקישור מכאן לא ידרוש שוב את הסיסמה
    const deviceToken = request.cookies.get(REGISTRATION_DEVICE_COOKIE)?.value || generateToken();

    const result = await startRegistration({
      email,
      name,
      username,
      password,
      callbackUrl,
      deviceToken,
      requestOrigin: request.nextUrl.origin,
    });

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
