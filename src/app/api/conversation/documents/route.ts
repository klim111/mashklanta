import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { conversationDocuments, resolveConversationAccess } from '@/lib/conversation-store';

/** המסמכים בתיק של הלקוח שאפשר לצרף מההתכתבות */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, req.nextUrl.searchParams.get('clientUserId'));
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await conversationDocuments(access));
}
