import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * בשלב הזה בפלטפורמה יש יועץ אחד בלבד: איגור לבדינסקי, mashkalanta@gmail.com.
 *
 * `ensureSingleAdvisor` מביאה את המסד למצב הזה: יוצרת את רשומת היועץ אם אינה
 * קיימת, מעבירה אליה את כל מה שהיה מקושר ליועצים אחרים (לקוחות מלווים, שיחות,
 * משימות, הערות, פגישות, כתבי הסמכה, פניות, הזמנות…) ומוחקת את היועצים האחרים.
 *
 * היא רצה בכל כניסה של היועץ דרך הכניסה הנסתרת, ולא במיגרציה: מיגרציה רצה על
 * מסד הייצור כבר כשענף נדחף, ואילו כאן השינוי קורה רק כשהיועץ עצמו נכנס. אחרי
 * הפעם הראשונה אין יותר מה להעביר, והבדיקה מסתכמת בשאילתה אחת.
 */

export const ADVISOR_EMAIL = 'mashkalanta@gmail.com';
export const ADVISOR_NAME = 'איגור לבדינסקי';

type Tx = Prisma.TransactionClient;

/** טבלאות שלא עוברות ליועץ: חשבונות Google וסשנים של יועץ שנמחק נמחקים איתו */
const NEVER_MOVE = new Set(['Account', 'Session']);

const quote = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;

type ForeignKey = { table: string; column: string; hasId: boolean };

/** כל העמודות במסד שמפנות ל-`table`.id, לפי קטלוג ה-Postgres עצמו */
async function referencesTo(tx: Tx, table: string): Promise<ForeignKey[]> {
  const rows = await tx.$queryRawUnsafe<{ table: string; column: string; has_id: boolean }[]>(
    `SELECT cl.relname AS "table", att.attname AS "column",
            EXISTS (
              SELECT 1 FROM pg_attribute idc
              WHERE idc.attrelid = cl.oid AND idc.attname = 'id' AND NOT idc.attisdropped
            ) AS has_id
       FROM pg_constraint c
       JOIN pg_class cl ON cl.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = cl.relnamespace
       JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = c.conkey[1]
      WHERE c.contype = 'f'
        AND array_length(c.conkey, 1) = 1
        AND n.nspname = current_schema()
        AND c.confrelid = to_regclass(format('%I.%I', current_schema(), $1::text))`,
    table
  );
  return rows.map((row) => ({ table: row.table, column: row.column, hasId: row.has_id }));
}

function isUniqueViolation(error: unknown): boolean {
  const text = String((error as { message?: string })?.message ?? error);
  return text.includes('23505') || text.toLowerCase().includes('unique constraint');
}

/** מריץ פקודה בתוך savepoint, כך שכישלון שלה לא מבטל את כל הטרנזקציה */
async function attempt(tx: Tx, name: string, sql: string, ...params: unknown[]): Promise<boolean> {
  await tx.$executeRawUnsafe(`SAVEPOINT ${name}`);
  try {
    await tx.$executeRawUnsafe(sql, ...params);
    await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`);
    return true;
  } catch (error) {
    await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`);
    if (!isUniqueViolation(error)) throw error;
    return false;
  }
}

/**
 * מעביר כל שורה שמפנה ל-`table`.fromId כך שתפנה ל-toId.
 *
 * שורה שאי אפשר להעביר כי ליעד כבר יש שורה מקבילה (למשל אותו לקוח מלווה אצל
 * שני היועצים) — ברשומת ליווי (Client) התוכן שלה מתמזג לרשומה שכבר קיימת,
 * ובכל טבלה אחרת היא כפילות של מה שכבר יש ליעד, ונמחקת.
 */
async function moveReferences(tx: Tx, table: string, fromId: string, toId: string): Promise<void> {
  for (const fk of await referencesTo(tx, table)) {
    if (table === 'User' && NEVER_MOVE.has(fk.table)) continue;
    const t = quote(fk.table);
    const c = quote(fk.column);

    if (await attempt(tx, 'move_all', `UPDATE ${t} SET ${c} = $1 WHERE ${c} = $2`, toId, fromId)) continue;

    if (!fk.hasId) {
      await tx.$executeRawUnsafe(`DELETE FROM ${t} WHERE ${c} = $1`, fromId);
      continue;
    }

    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM ${t} WHERE ${c} = $1`, fromId);
    for (const { id } of rows) {
      if (await attempt(tx, 'move_one', `UPDATE ${t} SET ${c} = $1 WHERE id = $2`, toId, id)) continue;

      if (fk.table === 'Client') {
        const [duplicate] = await tx.$queryRawUnsafe<{ advisorId: string; userId: string }[]>(
          `SELECT "advisorId", "userId" FROM "Client" WHERE id = $1`,
          id
        );
        const advisorId = fk.column === 'advisorId' ? toId : duplicate.advisorId;
        const userId = fk.column === 'userId' ? toId : duplicate.userId;
        const [keeper] = await tx.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM "Client" WHERE "advisorId" = $1 AND "userId" = $2 AND id <> $3`,
          advisorId,
          userId,
          id
        );
        if (keeper) {
          // ליווי אמיתי גובר על כרטיס שנפתח אוטומטית (src/lib/advisor-link.ts)
          await tx.$executeRawUnsafe(
            `UPDATE "Client" SET "autoLinked" = false
              WHERE id = $1 AND EXISTS (SELECT 1 FROM "Client" WHERE id = $2 AND "autoLinked" = false)`,
            keeper.id,
            id
          );
          await moveReferences(tx, 'Client', id, keeper.id);
        }
      }
      await tx.$executeRawUnsafe(`DELETE FROM ${t} WHERE id = $1`, id);
    }
  }
}

export type SingleAdvisorResult = {
  advisor: { id: string; email: string | null; name: string | null; role: 'ADVISOR' };
  removedAdvisors: number;
};

export async function ensureSingleAdvisor(): Promise<SingleAdvisorResult> {
  return prisma.$transaction(
    async (tx) => {
      const others = await tx.user.findMany({
        where: { role: 'ADVISOR', NOT: { email: { equals: ADVISOR_EMAIL, mode: 'insensitive' } } },
        select: { id: true, advisorDetailsJson: true, _count: { select: { clients: true } } },
        orderBy: { createdAt: 'asc' },
      });

      let advisor = await tx.user.findFirst({
        where: { email: { equals: ADVISOR_EMAIL, mode: 'insensitive' } },
        select: { id: true, role: true, name: true, hashedPassword: true, advisorDetailsJson: true },
      });

      if (!advisor) {
        advisor = await tx.user.create({
          data: { email: ADVISOR_EMAIL, name: ADVISOR_NAME, role: 'ADVISOR', emailVerified: new Date() },
          select: { id: true, role: true, name: true, hashedPassword: true, advisorDetailsJson: true },
        });
      } else if (advisor.role !== 'ADVISOR' || advisor.name !== ADVISOR_NAME || advisor.hashedPassword) {
        // אין כניסה ליועץ בסיסמה; הכניסה היחידה היא הקישור למייל
        await tx.user.update({
          where: { id: advisor.id },
          data: { role: 'ADVISOR', name: ADVISOR_NAME, hashedPassword: null },
        });
      }

      // הפרטים לכתבי ההסמכה ("פרטים לכתבי ההסמכה") עוברים מהיועץ שליווה הכי הרבה לקוחות
      if (!advisor.advisorDetailsJson) {
        const source = [...others]
          .filter((other) => other.advisorDetailsJson)
          .sort((a, b) => b._count.clients - a._count.clients)[0];
        if (source) {
          await tx.user.update({
            where: { id: advisor.id },
            data: { advisorDetailsJson: source.advisorDetailsJson as Prisma.InputJsonValue },
          });
        }
      }

      for (const other of others) {
        await moveReferences(tx, 'User', other.id, advisor.id);
        await tx.user.delete({ where: { id: other.id } });
      }

      return {
        advisor: { id: advisor.id, email: ADVISOR_EMAIL, name: ADVISOR_NAME, role: 'ADVISOR' as const },
        removedAdvisors: others.length,
      };
    },
    { timeout: 120_000, maxWait: 20_000 }
  );
}
