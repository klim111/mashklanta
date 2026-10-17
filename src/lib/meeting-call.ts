import { AccessToken } from 'livekit-server-sdk';
import { prisma } from './db';
import { meetingIsLive } from './advisor-crm';
import type { MeetingParty, MeetingStatus } from './advisor-crm';

/**
 * שיחת הווידאו של פגישה.
 *
 * הווידאו עצמו עובר דרך LiveKit: שרתי מדיה מנוהלים, TURN על פורט 443 שעובר
 * חומות אש ארגוניות, והתאמת איכות לכל משתתף. אצלנו נשאר רק מי רשאי להיכנס:
 * כל פגישה היא חדר, ורק היועץ שקבע אותה והלקוח שהיא נקבעה איתו מקבלים אסימון
 * כניסה — קצר מועד, לחדר הזה בלבד.
 */

/** משתני הסביבה של LiveKit. בלעדיהם הכפתור מסביר שהשיחות עוד לא הוגדרו */
export function liveKitConfig(): { url: string; apiKey: string; apiSecret: string } | null {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

export interface MeetingCallInfo {
  meetingId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  status: MeetingStatus;
  /** הצד שמסתכל */
  role: MeetingParty;
  advisorName: string;
  clientName: string;
  /** כרטיס הלקוח אצל היועץ — לחזרה מהשיחה */
  clientId: string;
  /** חשבון הלקוח — הצ'אט עם הלקוח נפתח לפיו בצד היועץ */
  clientUserId: string;
  /** התהליך שתיק המסמכים שלו פתוח בשיחה, או null כשאין ללקוח תהליך */
  planId: string | null;
}

/** החדר של הפגישה ב-LiveKit */
export function meetingRoomName(meetingId: string): string {
  return `meeting-${meetingId}`;
}

/**
 * הפגישה כפי שהמשתמש רואה אותה בשיחה, או null כשהוא לא צד לה. פגישה שבוטלה
 * או נדחתה מוחזרת עם הסטטוס שלה, כדי שהמסך יגיד את זה במקום "לא נמצא".
 */
export async function meetingCallInfo(userId: string, meetingId: string): Promise<MeetingCallInfo | null> {
  const meeting = await prisma.advisorMeeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      durationMinutes: true,
      status: true,
      advisorId: true,
      clientId: true,
      advisor: { select: { name: true, email: true } },
      client: { select: { name: true, userId: true } },
    },
  });
  if (!meeting) return null;

  const role: MeetingParty | null =
    meeting.advisorId === userId ? 'ADVISOR' : meeting.client.userId === userId ? 'CLIENT' : null;
  if (!role) return null;

  // התיק של התהליך הפעיל, ואם אין — של האחרון שעודכן
  const plan =
    (await prisma.mortgagePlan.findFirst({
      where: { clientId: meeting.clientId, status: 'IN_PROGRESS' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    })) ??
    (await prisma.mortgagePlan.findFirst({
      where: { clientId: meeting.clientId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    }));

  return {
    meetingId: meeting.id,
    title: meeting.title,
    startsAt: meeting.startsAt.toISOString(),
    durationMinutes: meeting.durationMinutes,
    status: meeting.status as MeetingStatus,
    role,
    advisorName: meeting.advisor.name || meeting.advisor.email || 'היועץ',
    clientName: meeting.client.name,
    clientId: meeting.clientId,
    clientUserId: meeting.client.userId,
    planId: plan?.id ?? null,
  };
}

/** אפשר להיכנס לשיחה כל עוד הפגישה לא בוטלה ולא נדחתה */
export function meetingCallOpen(info: Pick<MeetingCallInfo, 'status'>): boolean {
  return meetingIsLive(info.status);
}

/**
 * אסימון כניסה לחדר של הפגישה. הזהות כוללת את הצד, כדי שכל צד יזהה את השני
 * גם בלי לשאול את השרת; התוקף מכסה פגישה ארוכה במיוחד, ולא יותר.
 */
export async function meetingCallToken(
  info: MeetingCallInfo,
  userId: string,
  config: { apiKey: string; apiSecret: string }
): Promise<string> {
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: `${info.role.toLowerCase()}:${userId}`,
    name: info.role === 'ADVISOR' ? info.advisorName : info.clientName,
    ttl: '4h',
    metadata: JSON.stringify({ role: info.role }),
  });
  token.addGrant({
    room: meetingRoomName(info.meetingId),
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
}
