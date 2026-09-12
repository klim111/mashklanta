import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';
import { z } from 'zod';
import crypto from 'crypto';
import { normalizeEmail, normalizeUsername } from '@/lib/find-user-by-login';

export const maxDuration = 30;

const registerSchema = z.object({
  email: z.string().email('כתובת מייל לא תקינה'),
  username: z
    .string()
    .trim()
    .min(3, 'שם המשתמש חייב להכיל לפחות 3 תווים')
    .max(32, 'שם המשתמש ארוך מדי')
    .regex(/^[a-zA-Z0-9._\u0590-\u05FF-]+$/, 'שם המשתמש יכול להכיל אותיות, מספרים, נקודה, מקף וקו תחתון'),
  password: z.string().min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים'),
  name: z.string().min(2, 'השם חייב להכיל לפחות 2 תווים'),
  role: z.enum(['CLIENT', 'ADVISOR']).optional().default('CLIENT'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { password, name, role } = validationResult.data;
    const email = normalizeEmail(validationResult.data.email);
    const username = normalizeUsername(validationResult.data.username);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { username: { equals: username, mode: 'insensitive' } },
        ],
      },
    });

    if (existing?.email && existing.email.toLowerCase() === email) {
      return NextResponse.json({ error: 'משתמש עם כתובת מייל זו כבר קיים' }, { status: 400 });
    }
    if (existing?.username && existing.username.toLowerCase() === username) {
      return NextResponse.json({ error: 'שם המשתמש הזה כבר תפוס' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        name,
        hashedPassword,
        role,
        emailVerified: new Date(),
      },
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || '';
    const verificationUrl = `${appUrl}/auth/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    try {
      await prisma.verificationToken.create({
        data: { identifier: email, token: verificationToken, expires },
      });
    } catch (tokenError) {
      console.error('Verification token error:', tokenError);
    }

    const emailTemplate = emailTemplates.welcomeEmail(name, verificationUrl);
    void sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    }).catch((mailError) => {
      console.error('Welcome email failed:', mailError);
    });

    return NextResponse.json(
      {
        message: 'ההרשמה הושלמה בהצלחה. אפשר להתחבר עכשיו עם שם המשתמש והסיסמה.',
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'משתמש עם מייל או שם משתמש זה כבר קיים' },
        { status: 400 }
      );
    }
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: 'לא ניתן להתחבר למסד הנתונים. נסו שוב בעוד רגע.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'אירעה שגיאה בתהליך ההרשמה' }, { status: 500 });
  }
}
