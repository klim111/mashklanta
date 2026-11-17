import { NextResponse } from 'next/server';
import { listDepartedClients } from '@/lib/account-deletion';
import { requireAdvisor } from '@/lib/platform-admin';

/** לקוחות שהסירו את החשבון, עם רשומות התשלום שנשמרו מהם — של היועץ בלבד */
export async function GET() {
  const auth = await requireAdvisor();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ clients: await listDepartedClients(auth.advisorId, auth.platformAdmin) });
}
