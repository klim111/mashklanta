import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from './db';
import { DEFAULT_LANDING_CONTENT, LANDING_PAGES, normalizeLandingContent, type LandingContent } from './landing-content';

/**
 * קריאה ושמירה של הטקסטים של דפי הנחיתה (src/lib/landing-content.ts), באותה
 * תבנית כמו התמחור: הדפים קוראים דרך `getLandingContent()` מהמטמון, והשמירה של
 * היועץ מרעננת אותם מיד.
 */

const LANDING_CONTENT_TAG = 'landing-content';

export async function getLandingContentFresh(): Promise<LandingContent> {
  const row = await prisma.landingContent.findUnique({ where: { id: 'default' } });
  return row ? normalizeLandingContent(row.contentJson) : DEFAULT_LANDING_CONTENT;
}

const cachedLandingContent = unstable_cache(getLandingContentFresh, ['landing-content'], {
  tags: [LANDING_CONTENT_TAG],
  revalidate: 600,
});

/** התוכן לתצוגה. כשבסיס הנתונים לא זמין (למשל בבנייה מקומית) — ברירת המחדל */
export async function getLandingContent(): Promise<LandingContent> {
  try {
    return await cachedLandingContent();
  } catch {
    return DEFAULT_LANDING_CONTENT;
  }
}

export async function saveLandingContent(raw: unknown, updatedById: string): Promise<LandingContent> {
  const content = normalizeLandingContent(raw);
  await prisma.landingContent.upsert({
    where: { id: 'default' },
    create: { id: 'default', contentJson: content as object, updatedById },
    update: { contentJson: content as object, updatedById },
  });
  revalidateTag(LANDING_CONTENT_TAG);
  LANDING_PAGES.forEach((page) => revalidatePath(page.path));
  return content;
}
