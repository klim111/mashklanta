import { NextResponse } from 'next/server';
import { listAdvisorApplications, listOfficesForAdmin } from '@/lib/advisor-applications';
import { requirePlatformAdmin } from '@/lib/platform-admin';

/** מנהל הפלטפורמה: בקשות ההצטרפות של יועצים וכל המשרדים */
export async function GET() {
  const auth = await requirePlatformAdmin();
  if (auth instanceof NextResponse) return auth;
  const [applications, offices] = await Promise.all([listAdvisorApplications(), listOfficesForAdmin()]);
  return NextResponse.json({ applications, offices });
}
