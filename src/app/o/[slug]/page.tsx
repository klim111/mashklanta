import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getServerAuth } from '@/lib/auth';
import { getOfficePage } from '@/lib/office-store';
import { OfficePage } from '@/components/office/OfficePage';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

/** המשרד והצופה — פעם אחת לבקשה, גם למטא-דאטה וגם לדף */
const load = cache(async (slug: string) => {
  const session = await getServerAuth();
  return getOfficePage(slug, session?.user?.id ?? null);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page) return { title: 'המשרד לא נמצא', robots: { index: false, follow: false } };
  const { office, published } = page;
  const title = office.profile.advisorName ? `${office.name} | ${office.profile.advisorName}` : office.name;
  return {
    title,
    description: office.profile.headline,
    openGraph: { title, description: office.profile.headline, siteName: office.name, locale: 'he_IL', type: 'website' },
    // משרד שעוד לא פעיל מוצג רק ליועץ עצמו — לא למנועי חיפוש
    robots: published ? undefined : { index: false, follow: false },
  };
}

/** דף המשרד הציבורי של יועץ (src/lib/office.ts) */
export default async function OfficeRoute({ params }: Props) {
  const page = await load((await params).slug);
  if (!page) notFound();
  return <OfficePage office={page.office} published={page.published} ownerView={page.ownerView} />;
}
