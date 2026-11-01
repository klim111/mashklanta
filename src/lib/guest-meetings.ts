import { randomBytes } from 'crypto';
import { AccessToken } from 'livekit-server-sdk';
import { prisma } from './db';

/**
 * פגישת וידאו בלינק חד-פעמי, עם מי שעדיין אינו רשום.
 *
 * היועץ קובע מועד, והפגישה נכנסת ללוח השנה שלו כפגישה קבועה. הלינק תקף
 * מהמועד שנקבע ועוד תשעים דקות (`GUEST_LINK_MINUTES`); לפני כן הוא מציג ספירה
 * לאחור, ואחרי כן — שהפגישה הסתיימה. האורח רואה רק את מסך הפגישה: וידאו, צ'אט,
 * תיק מסמכים לדוגמה וכפתור פעולות עם הכלים, שרצים בארגז החול של ההדגמה. שום
 * דבר שהאורח מזין לא נשמר בשרת — הצ'אט והקבצים עוברים בערוץ של השיחה עצמה,
 * ונעלמים כשהיא נגמרת.
 *
 * הווידאו עובר ב-LiveKit, כמו בפגישות עם לקוחות רשומים (src/lib/meeting-call.ts),
 * בחדר נפרד לכל פגישה; אסימון הכניסה של האורח פג יחד עם הלינק.
 */

/** כמה זמן הלינק תקף מהמועד שנקבע */
export const GUEST_LINK_MINUTES = 90;

export type GuestMeetingState = 'cancelled' | 'early' | 'open' | 'expired';

export interface GuestMeetingView {
  id: string;
  title: string;
  guestName: string | null;
  startsAt: string;
  /** מתי הלינק מפסיק לעבוד */
  endsAt: string;
  durationMinutes: number;
  note: string | null;
  /** הנתיב של הלינק, בלי הדומיין — המסך מוסיף את כתובת האתר */
  linkPath: string;
  state: GuestMeetingState;
  /** תיק הלקוח שנפתח לאורח במהלך הפגישה, אם נפתח */
  clientId: string | null;
  clientName: string | null;
}

export function guestLinkPath(token: string): string {
  return `/m/${token}`;
}

export function guestMeetingEnds(startsAt: Date, durationMinutes = GUEST_LINK_MINUTES): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
}

export function guestMeetingState(
  meeting: { startsAt: Date; durationMinutes: number; cancelledAt: Date | null },
  now = new Date()
): GuestMeetingState {
  if (meeting.cancelledAt) return 'cancelled';
  if (now < meeting.startsAt) return 'early';
  if (now >= guestMeetingEnds(meeting.startsAt, meeting.durationMinutes)) return 'expired';
  return 'open';
}

const viewSelect = {
  id: true,
  title: true,
  guestName: true,
  startsAt: true,
  durationMinutes: true,
  note: true,
  token: true,
  cancelledAt: true,
  clientId: true,
  client: { select: { name: true } },
} as const;

type Row = {
  id: string;
  title: string;
  guestName: string | null;
  startsAt: Date;
  durationMinutes: number;
  note: string | null;
  token: string;
  cancelledAt: Date | null;
  clientId: string | null;
  client: { name: string } | null;
};

function toView(row: Row, now = new Date()): GuestMeetingView {
  return {
    id: row.id,
    title: row.title,
    guestName: row.guestName,
    startsAt: row.startsAt.toISOString(),
    endsAt: guestMeetingEnds(row.startsAt, row.durationMinutes).toISOString(),
    durationMinutes: row.durationMinutes,
    note: row.note,
    linkPath: guestLinkPath(row.token),
    state: guestMeetingState(row, now),
    clientId: row.clientId,
    clientName: row.client?.name ?? null,
  };
}

export async function listGuestMeetings(advisorId: string): Promise<GuestMeetingView[]> {
  const rows = await prisma.guestMeeting.findMany({
    where: { advisorId, cancelledAt: null },
    orderBy: { startsAt: 'asc' },
    select: viewSelect,
  });
  const now = new Date();
  return rows.map((row) => toView(row, now));
}

export async function createGuestMeeting(input: {
  advisorId: string;
  title: string;
  guestName: string | null;
  startsAt: Date;
  note: string | null;
}): Promise<GuestMeetingView> {
  const row = await prisma.guestMeeting.create({
    data: {
      advisorId: input.advisorId,
      token: randomBytes(18).toString('base64url'),
      title: input.title,
      guestName: input.guestName,
      startsAt: input.startsAt,
      durationMinutes: GUEST_LINK_MINUTES,
      note: input.note,
    },
    select: viewSelect,
  });
  return toView(row);
}

/** ביטול — הלינק מפסיק לעבוד מיד, והפגישה יורדת מלוח השנה */
export async function cancelGuestMeeting(advisorId: string, id: string): Promise<boolean> {
  const { count } = await prisma.guestMeeting.updateMany({
    where: { id, advisorId, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });
  return count > 0;
}

/** תיק הלקוח שנפתח לאורח במהלך הפגישה */
export async function linkGuestMeetingClient(advisorId: string, id: string, clientId: string): Promise<boolean> {
  const client = await prisma.client.findFirst({ where: { id: clientId, advisorId }, select: { id: true } });
  if (!client) return false;
  const { count } = await prisma.guestMeeting.updateMany({ where: { id, advisorId }, data: { clientId } });
  return count > 0;
}

/** מה שהאורח רואה לפני הכניסה — בלי שום פרט של היועץ מעבר לשם */
export interface GuestMeetingPublic {
  title: string;
  advisorName: string;
  guestName: string | null;
  startsAt: string;
  endsAt: string;
  state: GuestMeetingState;
  /** משתני LIVEKIT מוגדרים בסביבה */
  configured: boolean;
}

async function rowByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  return prisma.guestMeeting.findUnique({
    where: { token },
    select: { ...viewSelect, advisorId: true, advisor: { select: { name: true, email: true } } },
  });
}

export async function guestMeetingByToken(token: string, configured: boolean): Promise<GuestMeetingPublic | null> {
  const row = await rowByToken(token);
  if (!row) return null;
  return {
    title: row.title,
    advisorName: row.advisor.name || 'היועץ',
    guestName: row.guestName,
    startsAt: row.startsAt.toISOString(),
    endsAt: guestMeetingEnds(row.startsAt, row.durationMinutes).toISOString(),
    state: guestMeetingState(row),
    configured,
  };
}

export function guestRoomName(meetingId: string): string {
  return `guest-meeting-${meetingId}`;
}

/** כמה שניות נשארו ללינק — לתוקף של אסימון הכניסה */
function secondsLeft(startsAt: Date, durationMinutes: number): number {
  return Math.max(60, Math.floor((guestMeetingEnds(startsAt, durationMinutes).getTime() - Date.now()) / 1000));
}

/** אסימון הכניסה של האורח. null — הלינק אינו פתוח עכשיו */
export async function guestJoinToken(
  token: string,
  guestName: string,
  config: { apiKey: string; apiSecret: string }
): Promise<{ token: string; state: GuestMeetingState } | { token: null; state: GuestMeetingState } | null> {
  const row = await rowByToken(token);
  if (!row) return null;
  const state = guestMeetingState(row);
  if (state !== 'open') return { token: null, state };

  const access = new AccessToken(config.apiKey, config.apiSecret, {
    identity: `guest:${row.id}:${randomBytes(4).toString('hex')}`,
    name: guestName,
    ttl: secondsLeft(row.startsAt, row.durationMinutes),
    metadata: JSON.stringify({ role: 'CLIENT', guest: true }),
  });
  access.addGrant({
    room: guestRoomName(row.id),
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return { token: await access.toJwt(), state };
}

/** הפגישה כפי שהיועץ רואה אותה במסך השיחה */
export async function guestMeetingForAdvisor(advisorId: string, id: string) {
  const row = await prisma.guestMeeting.findFirst({
    where: { id, advisorId },
    select: { ...viewSelect, advisor: { select: { name: true, email: true } } },
  });
  if (!row) return null;
  return { view: toView(row), advisorName: row.advisor.name || row.advisor.email || 'היועץ' };
}

/** אסימון הכניסה של היועץ לחדר של פגישת האורח */
export async function advisorGuestToken(
  advisorId: string,
  meeting: GuestMeetingView,
  advisorName: string,
  config: { apiKey: string; apiSecret: string }
): Promise<string> {
  const access = new AccessToken(config.apiKey, config.apiSecret, {
    identity: `advisor:${advisorId}`,
    name: advisorName,
    ttl: '4h',
    metadata: JSON.stringify({ role: 'ADVISOR' }),
  });
  access.addGrant({
    room: guestRoomName(meeting.id),
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return access.toJwt();
}
