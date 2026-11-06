import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from './db';
import { EMPTY_SITE_CONTENT, normalizeSiteContent, type SiteContent } from './site-content';

/**
 * קריאה ושמירה של תוכן האתר (src/lib/site-content.ts), באותה תבנית כמו התמחור:
 * כל העמודים קוראים דרך `getSiteContent()` מהמטמון, והשמירה של היועץ מרעננת
 * את כולם מיד.
 */

const SITE_CONTENT_TAG = 'site-content';

export async function getSiteContentFresh(): Promise<SiteContent> {
  const row = await prisma.siteContent.findUnique({ where: { id: 'default' } });
  return row ? normalizeSiteContent(row.contentJson) : EMPTY_SITE_CONTENT;
}

const cachedSiteContent = unstable_cache(getSiteContentFresh, ['site-content'], {
  tags: [SITE_CONTENT_TAG],
  revalidate: 600,
});

/** התוכן לתצוגה. כשבסיס הנתונים לא זמין (למשל בבנייה מקומית) — בלי שינויים */
export async function getSiteContent(): Promise<SiteContent> {
  try {
    return await cachedSiteContent();
  } catch {
    return EMPTY_SITE_CONTENT;
  }
}

export async function saveSiteContent(raw: unknown, updatedById: string): Promise<SiteContent> {
  const content = normalizeSiteContent(raw);
  await prisma.siteContent.upsert({
    where: { id: 'default' },
    create: { id: 'default', contentJson: content as object, updatedById },
    update: { contentJson: content as object, updatedById },
  });
  revalidateTag(SITE_CONTENT_TAG);
  // ההחלפות והבאנרים מגיעים מהפריסה הראשית, ולכן כל העמודים נבנים מחדש
  revalidatePath('/', 'layout');
  return content;
}
