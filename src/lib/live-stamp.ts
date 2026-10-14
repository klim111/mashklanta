import { createHash } from 'crypto';
import { prisma } from './db';

/**
 * חותמת השינויים של הצופה — הבסיס לעדכון בלי ריפרש בין הלקוח ליועץ.
 *
 * הדפדפן שואל כל כמה שניות רק "האם משהו השתנה", והחותמת עונה בלי להחזיר נתונים:
 * לכל טבלה שהלקוח או היועץ נוגעים בה — כמה שורות יש ומתי השתנתה האחרונה. כל
 * הזנה, עדכון או מחיקה בצד אחד משנים את החותמת, והמסכים הפתוחים בצד השני
 * טוענים מחדש רק את מה שהם מציגים.
 *
 * לקוח רואה את מה שלו ואת מה שהיועץ כתב בכרטיס שלו. יועץ רואה את כל הלקוחות
 * שלו, ובנוסף נרשמים חדשים והרשמות שלא הושלמו.
 */

interface Part {
  _count: number;
  _max: Record<string, Date | null>;
}

function partOf(result: Part, field: string): string {
  const max = result._max[field];
  return `${result._count}:${max ? max.getTime() : 0}`;
}

const NONE = ['__none__'];

export async function liveStampFor(userId: string, role: string | undefined): Promise<string> {
  const advisor = role === 'ADVISOR';

  const links = await prisma.client.findMany({
    where: advisor ? { advisorId: userId } : { userId },
    select: { id: true, userId: true, updatedAt: true },
  });
  const clientIds = links.length ? links.map((link) => link.id) : NONE;
  const userIds = advisor ? (links.length ? links.map((link) => link.userId) : NONE) : [userId];

  const owned = { ownerId: { in: userIds } };
  const byClient = { clientId: { in: clientIds } };
  const ownedOrClient = { OR: [owned, byClient] };
  const advisorRows = advisor ? { OR: [{ advisorId: userId }, byClient] } : byClient;

  const updated = { _count: true, _max: { updatedAt: true } } as const;

  const queries: Array<[Promise<unknown>, string]> = [
    [prisma.mortgagePlan.aggregate({ where: owned, ...updated }), 'updatedAt'],
    [prisma.mortgagePlanStage.aggregate({ where: { plan: owned }, ...updated }), 'updatedAt'],
    [prisma.mortgageMix.aggregate({ where: ownedOrClient, ...updated }), 'updatedAt'],
    [prisma.planDocument.aggregate({ where: owned, _count: true, _max: { uploadedAt: true } }), 'uploadedAt'],
    [prisma.clientDocument.aggregate({ where: byClient, ...updated }), 'updatedAt'],
    [prisma.clientTask.aggregate({ where: owned, ...updated }), 'updatedAt'],
    [prisma.clientTaskState.aggregate({ where: { userId: { in: userIds } }, ...updated }), 'updatedAt'],
    [
      prisma.advisorServiceOrder.aggregate({
        where: advisor ? { OR: [{ advisorId: userId }, owned] } : owned,
        ...updated,
      }),
      'updatedAt',
    ],
    [
      prisma.advisorLead.aggregate({
        where: advisor ? { OR: [{ advisorId: userId }, owned, byClient] } : ownedOrClient,
        ...updated,
      }),
      'updatedAt',
    ],
    [prisma.bankRateRequest.aggregate({ where: ownedOrClient, ...updated }), 'updatedAt'],
    [prisma.equityPlan.aggregate({ where: owned, ...updated }), 'updatedAt'],
    [prisma.advisorTask.aggregate({ where: advisorRows, ...updated }), 'updatedAt'],
    [prisma.advisorNote.aggregate({ where: advisorRows, ...updated }), 'updatedAt'],
    [prisma.advisorMeeting.aggregate({ where: advisorRows, ...updated }), 'updatedAt'],
    [prisma.clientAction.aggregate({ where: byClient, ...updated }), 'updatedAt'],
    // תיק האישור העקרוני רשום על המשתמש של הלקוח, לא על הכרטיס שלו
    [prisma.mortgageCase.aggregate({ where: { clientId: { in: userIds } }, ...updated }), 'updatedAt'],
    [prisma.caseField.aggregate({ where: { case: { clientId: { in: userIds } } }, ...updated }), 'updatedAt'],
    [
      prisma.caseEntity.aggregate({
        where: { case: { clientId: { in: userIds } } },
        _count: true,
        _max: { createdAt: true },
      }),
      'createdAt',
    ],
    [prisma.fieldConflict.aggregate({ where: { case: { clientId: { in: userIds } } }, ...updated }), 'updatedAt'],
    [
      prisma.platformPayment.aggregate({
        where: { userId: { in: userIds } },
        _count: true,
        _max: { createdAt: true },
      }),
      'createdAt',
    ],
    [prisma.user.aggregate({ where: { id: { in: userIds } }, ...updated }), 'updatedAt'],
  ];

  if (advisor) {
    // נרשמים חדשים, הרשמות באמצע ולקוחות שעזבו — מופיעים אצל היועץ בלי ריפרש
    queries.push(
      [prisma.user.aggregate({ where: { role: 'CLIENT' }, _count: true, _max: { createdAt: true } }), 'createdAt'],
      [prisma.signupDraft.aggregate({ ...updated }), 'updatedAt'],
      [prisma.departedClient.aggregate({ _count: true, _max: { departedAt: true } }), 'departedAt']
    );
  }

  const results = await Promise.all(queries.map(([query]) => query));
  const pieces = results.map((result, index) => partOf(result as Part, queries[index][1]));
  pieces.push(links.map((link) => `${link.id}@${link.updatedAt.getTime()}`).sort().join(','));

  return createHash('sha1').update(pieces.join('|')).digest('hex').slice(0, 16);
}
