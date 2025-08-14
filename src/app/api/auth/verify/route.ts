import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'חסרים פרטי אימות' },
        { status: 400 }
      );
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        token,
      },
    });

    if (!verificationToken || verificationToken.identifier !== email) {
      return NextResponse.json(
        { error: 'קישור האימות אינו תקין' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { token },
      });
      
      return NextResponse.json(
        { error: 'קישור האימות פג תוקף' },
        { status: 400 }
      );
    }

    // Update user as verified
    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: new Date(),
      },
    });

    // Delete used verification token
    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json(
      { message: 'כתובת המייל אומתה בהצלחה! כעת תוכל להתחבר' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'אירעה שגיאה בתהליך האימות' },
      { status: 500 }
    );
  }
}