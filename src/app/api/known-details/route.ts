import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseClientProfile } from '@/lib/client-profile';
import { getEquityPlan } from '@/lib/equity-plan-store';
import { resolveKnownDetails } from '@/lib/known-details';
import { listPlansForUser } from '@/lib/mortgage-plans';
import { analysisFromToolData, parseToolData } from '@/lib/tool-data';

/**
 * הפרטים שהלקוח כבר הזין בפלטפורמה (src/lib/known-details.ts), כדי שכל כלי
 * יציג אותם במקום לשאול עליהם שוב.
 */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user, plans, equityPlan] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { profileJson: true, toolDataJson: true } }),
    listPlansForUser(userId),
    getEquityPlan(userId).catch(() => null),
  ]);

  // התהליך הפעיל של משכנתא חדשה; אם אין — האחרון שהסתיים
  const purchase = plans.filter((plan) => plan.kind === 'NEW');
  const plan = purchase.find((item) => item.status === 'IN_PROGRESS') ?? purchase[0] ?? null;

  let affordability = null;
  try {
    affordability = analysisFromToolData(user?.toolDataJson) ?? null;
  } catch {
    affordability = null;
  }
  // טיוטת תכנון ההון העצמי מלפני ההרשמה, עד שהיא עוברת לטבלה שלה
  const equityDraft = parseToolData(user?.toolDataJson).equity as
    | { propertyData?: { price?: unknown; financingProfile?: unknown } }
    | undefined;

  const details = resolveKnownDetails({
    plan: plan ? { id: plan.id, analysis: plan.data.ANALYSIS, mix: plan.data.MIX } : null,
    profile: user?.profileJson ? parseClientProfile(user.profileJson) : null,
    affordability,
    equityPlan:
      equityPlan && equityPlan.propertyPrice > 0
        ? equityPlan
        : equityDraft?.propertyData
          ? {
              propertyPrice: Number(equityDraft.propertyData.price) || null,
              financingProfile:
                typeof equityDraft.propertyData.financingProfile === 'string'
                  ? equityDraft.propertyData.financingProfile
                  : null,
            }
          : null,
  });

  return NextResponse.json(details);
}
