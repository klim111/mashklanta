import { prisma } from '@/lib/db';

/**
 * תנאי לשאילתות על SiteVisit שמסנן את הגלישה של היועץ עצמו: כל הביקורים
 * מדפדפן שהיועץ התחבר ממנו, גם מלפני הכניסה וגם כשגלש בו בלי להתחבר
 * (src/lib/staff-device.ts).
 */
export async function notStaffVisitor(): Promise<{ visitorId?: { notIn: string[] } }> {
  const rows = await prisma.staffVisitor.findMany({ select: { visitorId: true } });
  return rows.length ? { visitorId: { notIn: rows.map((row) => row.visitorId) } } : {};
}
