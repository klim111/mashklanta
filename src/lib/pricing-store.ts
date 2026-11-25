import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from './db';
import { DEFAULT_PRICING, normalizePricing, type PricingConfig } from './pricing-config';

/**
 * קריאה ושמירה של הגדרות התמחור (src/lib/pricing-config.ts).
 *
 * עמודי האתר קוראים דרך `getPricing()` — שמור במטמון ומתרענן מיד כשהיועץ שומר.
 * החיוב ב-HYP קורא דרך `getPricingFresh()`, ישר מבסיס הנתונים, כדי שהסכום
 * שנגבה יהיה תמיד המחיר העדכני.
 */

const PRICING_TAG = 'pricing';

export async function getPricingFresh(): Promise<PricingConfig> {
  const row = await prisma.pricingSettings.findUnique({ where: { id: 'default' } });
  return row ? normalizePricing(row.configJson) : DEFAULT_PRICING;
}

const cachedPricing = unstable_cache(getPricingFresh, ['pricing-settings'], {
  tags: [PRICING_TAG],
  revalidate: 600,
});

/** ההגדרות לתצוגה. כשבסיס הנתונים לא זמין (למשל בבנייה מקומית) — ברירת המחדל */
export async function getPricing(): Promise<PricingConfig> {
  try {
    return await cachedPricing();
  } catch {
    return DEFAULT_PRICING;
  }
}

export async function savePricing(raw: unknown, updatedById: string): Promise<PricingConfig> {
  const config = normalizePricing(raw);
  await prisma.pricingSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', configJson: config as object, updatedById },
    update: { configJson: config as object, updatedById },
  });
  revalidateTag(PRICING_TAG);
  // העמודים שנבנו מראש עם המחיר הקודם נבנים מחדש
  revalidatePath('/', 'layout');
  return config;
}
