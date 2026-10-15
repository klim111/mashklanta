'use client';

import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

/**
 * תיק המסמכים וכלי בניית התמהילים פתוחים רק ללקוח שרכש חבילה (או שהיועץ סימן
 * אותו כמשלם). הקישורים אליהם נשארים בכל מקום, ובמקום הכלי מוצג ההסבר הזה.
 */
export const PAID_FEATURES = {
  documents: {
    title: 'תיק המסמכים יהיה זמין עם רכישת החבילה',
    text: 'העלאה, צפייה והורדה של כל המסמכים שהבנק ידרוש, לפי הפרופיל שלכם, נפתחות עם רכישת החבילה. כל מה שכבר בתיק שמור ונפתח מיד.',
  },
  mix: {
    title: 'כלי בניית התמהילים יהיה זמין עם רכישת החבילה',
    text: 'הרכבת מסלולי המשכנתא עם לוח סילוקין מלא, החזר חודשי וסך הריבית, והשוואה בין תמהילים, נפתחים עם רכישת החבילה.',
  },
} as const;

export type PaidFeature = keyof typeof PAID_FEATURES;

/** השורה הקצרה שמתחת לקישור נעול */
export const PAID_FEATURE_HINT = 'זמין עם רכישת החבילה';

export function PaidFeatureNotice({
  feature,
  checkoutHref = '/dashboard/checkout',
}: {
  feature: PaidFeature;
  checkoutHref?: string;
}) {
  const copy = PAID_FEATURES[feature];
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-8 text-center" role="status">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900">
        <Lock className="h-6 w-6 text-white" />
      </span>
      <p className="text-lg font-black text-slate-900">{copy.title}</p>
      <p className="mx-auto mt-2 max-w-md text-info leading-relaxed text-slate-600">{copy.text}</p>
      <Link
        href={checkoutHref}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white shadow-md transition-colors hover:bg-blue-700"
      >
        לרכישת החבילה
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}
