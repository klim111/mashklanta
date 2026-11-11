'use client';

import { CalendarClock, FileText, HelpCircle, Users } from 'lucide-react';
import { REQUEST_KINDS, REQUEST_KIND_CHOICES } from '@/lib/advisor-requests';
import type { RequestKind } from '@/lib/advisor-requests';

const ICONS: Record<RequestKind, typeof Users> = {
  GUIDANCE: Users,
  MEETING: CalendarClock,
  QUESTION: HelpCircle,
  QUOTE: FileText,
};

/**
 * "מה תרצו מהיועץ?" — ליווי, פגישה, שאלה או הצעת מחיר. הבחירה נשמרת עם
 * הפנייה, והיועץ מקבל מייל לפיה ("מחכה לך בקשה לפגישה").
 */
export function RequestKindPicker({
  value,
  onChange,
  className = '',
}: {
  value: RequestKind;
  onChange: (kind: RequestKind) => void;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-xs font-bold text-slate-600">מה תרצו מהיועץ?</legend>
      <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {REQUEST_KINDS.map((kind) => {
          const Icon = ICONS[kind];
          const active = kind === value;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(kind)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-sm font-bold transition-colors ${
                active
                  ? 'border-violet-600 bg-violet-50 text-violet-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {REQUEST_KIND_CHOICES[kind]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** העמוד שממנו נשלחת הפנייה — כדי שהיועץ ידע מאיפה הלקוח פנה */
export function currentPagePath(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.pathname;
}
