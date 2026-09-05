import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseClientProfile, profileToJson } from '@/lib/client-profile';
import type { ClientProfile } from '@/lib/client-profile';
import { normalizeUsername } from '@/lib/find-user-by-login';

function toResponse(
  user: { name: string | null; email: string | null; username: string | null; profileJson: unknown }
): ClientProfile {
  return {
    ...parseClientProfile(user.profileJson),
    name: user.name ?? '',
    email: user.email ?? '',
    username: user.username ?? '',
  };
}

export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, username: true, profileJson: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(toResponse(user));
}

export async function PATCH(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, username: true, profileJson: true, hashedPassword: true },
  });
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const nextProfile = profileToJson({
    ...parseClientProfile(current.profileJson),
    ...parseClientProfile(body),
  });

  const data: Prisma.UserUpdateInput = {
    profileJson: nextProfile as unknown as Prisma.InputJsonValue,
  };

  if (typeof body.name === 'string' && body.name.trim()) {
    data.name = body.name.trim();
  }

  if (typeof body.username === 'string' && body.username.trim()) {
    const username = normalizeUsername(body.username);
    if (username.length < 3) {
      return NextResponse.json({ error: 'שם המשתמש חייב להכיל לפחות 3 תווים' }, { status: 400 });
    }
    const taken = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        NOT: { id: userId },
      },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: 'שם המשתמש הזה כבר תפוס' }, { status: 400 });
    }
    data.username = username;
  }

  if (typeof body.password === 'string' && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 8 תווים' }, { status: 400 });
    }
    data.hashedPassword = await bcrypt.hash(body.password, 12);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { name: true, email: true, username: true, profileJson: true },
  });

  return NextResponse.json(toResponse(user));
}
