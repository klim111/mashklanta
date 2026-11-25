'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Home } from 'lucide-react';

const BUTTON =
  'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700';

/** כמה מסכים של האתר נפתחו בלשונית הזו מאז הטעינה (AdvisorPageFrame סופר) */
let visitedInTab = 0;
export function countAdvisorVisit() {
  visitedInTab += 1;
}

/** האם יש מסך קודם של האתר עצמו שאפשר לחזור אליו */
function hasPreviousScreen(): boolean {
  if (visitedInTab > 1) return true;
  try {
    return Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** חוזר למסך הקודם. כשאין קודם (קישור שנפתח בלשונית חדשה) — למסך שמעל */
export function useGoBack(fallbackHref: string) {
  const router = useRouter();
  return () => {
    if (window.history.length > 1 && hasPreviousScreen()) router.back();
    else router.push(fallbackHref);
  };
}

/** שני הכפתורים עצמם: "חזרה" ו"לוח היועץ" */
export function BackHomeButtons({
  onBack,
  onHome,
}: {
  onBack: () => void;
  /** בלי onHome — קישור רגיל ללוח היועץ */
  onHome?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" onClick={onBack} className={BUTTON}>
        <ArrowRight className="h-4 w-4" aria-hidden />
        חזרה
      </button>
      {onHome ? (
        <button type="button" onClick={onHome} className={BUTTON} aria-label="למסך הבית של היועץ">
          <Home className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">מסך הבית</span>
        </button>
      ) : (
        <Link href="/advisor-dashboard" className={BUTTON} aria-label="למסך הבית של היועץ">
          <Home className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">מסך הבית</span>
        </Link>
      )}
    </div>
  );
}

/** שורה דקה בראש כל מסך פנימי של היועץ (תיק לקוח, מסמכים, כלים) */
export function AdvisorBackBar({ fallbackHref }: { fallbackHref: string }) {
  const goBack = useGoBack(fallbackHref);
  return (
    <div dir="rtl" className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <BackHomeButtons onBack={goBack} />
      </div>
    </div>
  );
}
