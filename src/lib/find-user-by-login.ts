import { prisma } from '@/lib/db';

/** מחפש משתמש לפי מייל או לפי שם משתמש, בלי תלות ברישיות */
export async function findUserByLogin(identifier: string) {
  const value = identifier.trim();
  if (!value) return null;

  if (value.includes('@')) {
    return prisma.user.findFirst({
      where: { email: { equals: value, mode: 'insensitive' } },
    });
  }

  return prisma.user.findFirst({
    where: { username: { equals: value, mode: 'insensitive' } },
  });
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
