import type { Session } from 'next-auth';
import { headers } from 'next/headers';
import { prisma } from './db';
import { ACT_AS_HEADER, validClientId } from './act-as-shared';

/**
 * היועץ עובד בכלים בשם לקוח מתעניין.
 *
 * תיק מתעניין (src/lib/prospect-client.ts) נפתח אצל היועץ בחלון נפרד — בתוך
 * שיחת הווידאו או בלשונית. החלון הזה מוסיף לכל בקשה את הכותרת `x-mk-act-as`
 * עם מזהה הכרטיס (src/components/act-as/actAsWindow.ts), והשרת מחזיר בו את
 * ה-session של החשבון הזמני של הלקוח: כל ה-API הקיימים — תהליכים, תמהילים,
 * נתוני כלים — שומרים תחת הלקוח בלי שינוי, והאזור האישי נראה בדיוק כמו אצל
 * לקוח רשום.
 *
 * הכותרת מכובדת רק כשההתחברות האמיתית היא של יועץ, והכרטיס הוא תיק מתעניין
 * שלו. באזור היועץ עצמו (בלי הכותרת) שום דבר לא משתנה.
 */
export async function actAsSession(real: Session | null): Promise<Session | null> {
  if (!real?.user?.id || real.user.role !== 'ADVISOR') return null;
  let clientId: string | null = null;
  try {
    clientId = (await headers()).get(ACT_AS_HEADER);
  } catch {
    return null; // מחוץ לבקשה
  }
  if (!validClientId(clientId)) return null;

  const file = await prisma.client.findFirst({
    where: { id: clientId, advisorId: real.user.id, prospect: true },
    select: { name: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!file?.user) return null;
  return {
    ...real,
    user: {
      id: file.user.id,
      role: 'CLIENT',
      name: file.name || file.user.name,
      email: file.user.email,
      image: null,
      actingAdvisorId: real.user.id,
    },
  };
}
