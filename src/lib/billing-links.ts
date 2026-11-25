import crypto from 'node:crypto';

/**
 * הקישור לחידוש שנשלח במייל התזכורת, ובמייל שנשלח כשהיועץ מסיים את הליווי.
 * הקישור חתום, כדי שאפשר יהיה לפתוח אותו ישר מהמייל בלי להתחבר, ושאי אפשר
 * יהיה לזייף קישור למשתמש אחר. הקישור רק מוביל לעמוד אישור ומשם לעמוד התשלום
 * של HYP — הוא לא מחייב לבד.
 */

/** למה נשלח הקישור — חידוש חודש, או המשך לבד אחרי שהליווי הסתיים */
export type RenewalReason = 'renewal' | 'advisory-ended';

export interface RenewalLink {
  userId: string;
  /** התהליך שהחבילה האחרונה פתחה — ריק כשהיא עוד לא נקשרה לתהליך */
  planId: string | null;
  /** עד מתי הקישור תקף */
  expiresAt: Date;
  /** ברירת המחדל: חידוש */
  reason?: RenewalReason;
}

/** כמה זמן הקישור תקף אחרי שהחודש מסתיים — מי שחוזר מאוחר עדיין יכול לחדש */
export const RENEWAL_LINK_GRACE_DAYS = 45;

function secret(): string {
  const value = process.env.BILLING_LINK_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error('NEXTAUTH_SECRET is not set');
  return value;
}

function signature(payload: string, key: string): string {
  return crypto.createHmac('sha256', key).update(`renewal:${payload}`).digest('base64url');
}

export function renewalToken(link: RenewalLink, key = secret()): string {
  const payload = Buffer.from(
    JSON.stringify({
      u: link.userId,
      p: link.planId,
      e: Math.floor(link.expiresAt.getTime() / 1000),
      ...(link.reason === 'advisory-ended' ? { r: 'a' } : {}),
    })
  ).toString('base64url');
  return `${payload}.${signature(payload, key)}`;
}

export function readRenewalToken(token: string | null | undefined, now = new Date(), key = secret()): RenewalLink | null {
  if (!token || token.length > 1000) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(signature(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data?.u !== 'string' || typeof data?.e !== 'number') return null;
    const expiresAt = new Date(data.e * 1000);
    if (expiresAt <= now) return null;
    return {
      userId: data.u,
      planId: typeof data.p === 'string' ? data.p : null,
      expiresAt,
      reason: data.r === 'a' ? 'advisory-ended' : 'renewal',
    };
  } catch {
    return null;
  }
}
