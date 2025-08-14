import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema
const registerSchema = z.object({
  email: z.string().email('כתובת מייל לא תקינה'),
  password: z.string().min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים'),
  name: z.string().min(2, 'השם חייב להכיל לפחות 2 תווים'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, name } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'משתמש עם כתובת מייל זו כבר קיים' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
      },
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires,
      },
    });

    // Create verification URL
    const verificationUrl = `${process.env.NEXTAUTH_URL || process.env.APP_URL}/auth/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    // Send welcome email with verification link
    const emailTemplate = emailTemplates.welcomeEmail(name, verificationUrl);
    await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return NextResponse.json(
      { 
        message: 'ההרשמה הושלמה בהצלחה! נשלח אליך מייל עם קישור לאימות',
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'אירעה שגיאה בתהליך ההרשמה' },
      { status: 500 }
    );
  }
}