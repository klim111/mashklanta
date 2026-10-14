import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { del, list } from '@vercel/blob';
import { prisma } from './db';
import { conversationFilePrefix } from './conversation';
import { storedLeadFiles } from './lead-files';
import { blobIsConfigured, planDocumentPrefix } from './plan-documents';
import { S3_BUCKET, s3 } from './s3';

/**
 * הסרת חשבון לקוח לבקשתו — מוחקת את המשתמש ואת כל מה שקשור אליו.
 *
 * רוב הטבלאות נמחקות יחד עם המשתמש (onDelete: Cascade). כאן נמחקות גם השורות
 * שהיו נשארות בלעדיו: מה שהיועץ יצר לכרטיס הלקוח (תמהילים, תהליכים, מסמכים,
 * קישורי תשלום), פניות ליועץ, ההרשמה הממתינה, טיוטת ההרשמה והביקורים באתר. אחרי
 * המחיקה במסד נמחקים גם הקבצים עצמם מחנות הקבצים. אחר כך אפשר להירשם מחדש עם
 * אותו מייל, כמו משתמש חדש לגמרי.
 */

/** מה שמזהה את הלקוח בבקשת המחיקה — המייל, או שם הכניסה כשאין מייל */
export function accountConfirmationValue(user: { email: string | null; username: string | null }): string {
  return (user.email ?? user.username ?? '').trim();
}

export function confirmationMatches(expected: string, typed: unknown): boolean {
  if (typeof typed !== 'string' || !expected) return false;
  return typed.trim().toLowerCase() === expected.toLowerCase();
}

/** טקסט חיפוש לא תלוי רישיות, לשדות מייל */
function sameEmail(email: string) {
  return { equals: email, mode: 'insensitive' as const };
}

export type DeleteAccountResult = { ok: true } | { ok: false; status: number; error: string };

export async function deleteClientAccount(userId: string): Promise<DeleteAccountResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) return { ok: false, status: 404, error: 'החשבון לא נמצא' };
  if (user.role !== 'CLIENT') return { ok: false, status: 403, error: 'אפשר להסיר מכאן רק חשבון לקוח' };

  const email = user.email?.trim() || null;
  const clientIds = (
    await prisma.client.findMany({ where: { userId }, select: { id: true } })
  ).map((row) => row.id);
  const byClient = clientIds.length > 0 ? [{ clientId: { in: clientIds } }] : [];

  const planIds = (
    await prisma.mortgagePlan.findMany({
      where: { OR: [{ ownerId: userId }, ...byClient] },
      select: { id: true },
    })
  ).map((row) => row.id);

  const leadWhere = {
    OR: [{ ownerId: userId }, ...byClient, ...(email ? [{ email: sameEmail(email) }] : [])],
  };

  // הקבצים נאספים לפני המחיקה, כי אחריה אין דרך לדעת מה היה שלו
  const [planDocs, leads, documents] = await Promise.all([
    prisma.planDocument.findMany({
      where: { OR: [{ ownerId: userId }, { planId: { in: planIds } }, ...byClient] },
      select: { blobPath: true },
    }),
    prisma.advisorLead.findMany({ where: leadWhere, select: { files: true } }),
    prisma.document.findMany({ where: { userId }, select: { s3Key: true } }),
  ]);
  const blobPaths = new Set<string>(planDocs.map((doc) => doc.blobPath));
  for (const lead of leads) {
    for (const file of storedLeadFiles(lead.files)) if (file.blob) blobPaths.add(file.blob);
  }
  const s3Keys = documents.map((doc) => doc.s3Key).filter((key): key is string => Boolean(key));

  await prisma.$transaction(
    async (tx) => {
      await tx.advisorLead.deleteMany({ where: leadWhere });
      await tx.paymentLink.deleteMany({
        where: { OR: [...byClient, ...(email ? [{ clientEmail: sameEmail(email) }] : [])] },
      });
      await tx.mortgageMix.deleteMany({ where: { OR: [{ ownerId: userId }, ...byClient] } });
      await tx.bankRateRequest.deleteMany({ where: { OR: [{ ownerId: userId }, ...byClient] } });
      await tx.advisorServiceOrder.deleteMany({
        where: { OR: [{ ownerId: userId }, { planId: { in: planIds } }, ...byClient] },
      });
      await tx.planDocument.deleteMany({
        where: { OR: [{ ownerId: userId }, { planId: { in: planIds } }, ...byClient] },
      });
      await tx.mortgagePlan.deleteMany({ where: { id: { in: planIds } } });
      await tx.document.deleteMany({ where: { userId } });
      await tx.calculation.deleteMany({ where: { userId } });
      await tx.siteVisit.deleteMany({ where: { userId } });
      await tx.verificationToken.deleteMany({
        where: { OR: [{ identifier: { contains: userId } }, ...(email ? [{ identifier: sameEmail(email) }] : [])] },
      });
      if (email) {
        await tx.pendingRegistration.deleteMany({ where: { email: sameEmail(email) } });
        await tx.signupDraft.deleteMany({ where: { email: sameEmail(email) } });
      }
      // השאר — הכרטיס אצל היועץ, השיחה, המיילים, המשימות, התשלומים, תיק האישור —
      // נמחק יחד עם המשתמש
      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 60_000, maxWait: 10_000 }
  );

  await deleteStoredFiles(userId, planIds, [...blobPaths], s3Keys);
  return { ok: true };
}

/** מחיקת הקבצים מחנות הקבצים. כשל כאן לא מחזיר את החשבון — רק נרשם ביומן */
async function deleteStoredFiles(userId: string, planIds: string[], paths: string[], s3Keys: string[]) {
  if (blobIsConfigured()) {
    const all = new Set(paths);
    // גם מה שלא רשום בשום שורה (העלאה שלא הושלמה, עותק שצורף להודעה) — לפי התחילית
    const prefixes = [conversationFilePrefix(userId), ...planIds.map(planDocumentPrefix)];
    for (const prefix of prefixes) {
      try {
        let cursor: string | undefined;
        do {
          const page = await list({ prefix, cursor, limit: 1000 });
          for (const blob of page.blobs) all.add(blob.pathname);
          cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor);
      } catch (error) {
        console.error('[account-deletion] blob list failed:', prefix, error);
      }
    }
    const items = [...all];
    for (let i = 0; i < items.length; i += 500) {
      await del(items.slice(i, i + 500)).catch((error) =>
        console.error('[account-deletion] blob delete failed:', error)
      );
    }
  }

  if (S3_BUCKET && s3Keys.length > 0) {
    await s3
      .send(
        new DeleteObjectsCommand({
          Bucket: S3_BUCKET,
          Delete: { Objects: s3Keys.map((Key) => ({ Key })) },
        })
      )
      .catch((error) => console.error('[account-deletion] s3 delete failed:', error));
  }
}
