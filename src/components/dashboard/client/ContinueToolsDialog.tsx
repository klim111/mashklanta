'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlayCircle, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parseResume, TOOL_HAS_CONTENT } from '@/lib/tool-data';
import type { AccountToolData, ResumeInfo, ResumeTool } from '@/lib/tool-data';
import { loadAccountToolData, putToolData } from '@/components/tool-data/toolData';
import { useEquityPlanSummary } from '@/components/equity-planning/useEquityPlanSummary';
import { readEntryQuery } from '@/components/service-flow/MortgageEntry';
import { TOOL_ROWS, money } from './SavedToolsCard';

/** איפה כל כלי עצר, במילים של הכלי */
const STEP_LABELS: Partial<Record<ResumeTool, Record<string, string>>> = {
  affordability: {
    'property-type': 'סוג הנכס',
    'calculation-type': 'סוג החישוב',
    'borrower-type': 'מי הלווים',
    'personal-info': 'הפרטים האישיים',
    'personal-info-couple': 'הפרטים האישיים',
    'existing-property': 'פרטי הנכס',
    'reverse-mortgage': 'משכנתא הפוכה',
    'offer-analysis': 'ניתוח הצעת הבנק',
    results: 'התוצאות',
    'profile-complete': 'התוצאות',
  },
  refinance: {
    goal: 'מטרת המיחזור',
    income: 'הכנסה והלוואות',
    tracks: 'המסלולים',
    result: 'תוצאת הבדיקה',
    preview: 'כלי המיחזור המלא',
  },
  equity: { '0': 'פרטי הנכס', '1': 'טבלת ההוצאות', '2': 'הסיכום' },
};

const EQUITY_ROW = {
  key: 'equity' as const,
  title: 'תכנון הון עצמי',
  href: '/dashboard#expenses',
  icon: Wallet as LucideIcon,
};

interface Choice {
  key: ResumeTool;
  title: string;
  href: string;
  icon: LucideIcon;
  detail: string;
  step: string | null;
}

function choicesOf(resume: ResumeInfo, data: AccountToolData, equityPrice: number | null): Choice[] {
  return resume.tools.flatMap((tool): Choice[] => {
    const step = STEP_LABELS[tool]?.[resume.steps[tool] ?? ''] ?? null;
    if (tool === 'equity') {
      const detail = equityPrice ? `מחיר נכס ${money(equityPrice)}` : 'התכנון שמור בחשבון';
      return [{ ...EQUITY_ROW, detail, step }];
    }
    const row = TOOL_ROWS.find((item) => item.key === tool);
    if (!row || !TOOL_HAS_CONTENT[tool](data[tool])) return [];
    return [{ key: tool, title: row.title, href: row.href, icon: row.icon, detail: row.summary(data[tool]), step }];
  });
}

/**
 * "תרצו להמשיך?" — בכניסה הראשונה לדאשבורד אחרי ההרשמה, למי שהתחיל כלים
 * חינמיים לפני שנרשם. כל מה שהזין כבר שמור בחשבון; ההודעה מציעה להמשיך בכל
 * אחד מהכלים שהתחיל, והכלי נפתח עם הנתונים בשלב שבו עצר. בחירה או סגירה
 * מוחקות את ההודעה, כך שהיא מופיעה פעם אחת.
 */
export function ContinueToolsDialog() {
  const router = useRouter();
  const equity = useEquityPlanSummary();
  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [data, setData] = useState<AccountToolData>({});

  useEffect(() => {
    // מי שהגיע עם בחירה להמשך (למשל תשלום על כלי המיחזור) ממשיך בה; ההודעה תחכה לכניסה הבאה
    if (readEntryQuery().goal) return;
    let cancelled = false;
    loadAccountToolData()
      .then((account) => {
        if (cancelled) return;
        setData(account);
        setResume(parseResume(account.resume));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const equityPrice = equity.plan?.propertyPrice ?? null;
  const choices = resume ? choicesOf(resume, data, equityPrice) : [];
  const open = choices.length > 0;

  const close = () => {
    setResume(null);
    void putToolData('resume', null);
  };

  const choose = (href: string) => {
    close();
    router.push(href);
  };

  if (!resume) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent dir="rtl" className="w-[calc(100vw-2rem)] max-w-lg p-5 text-right sm:w-full">
        <DialogHeader className="space-y-2 text-right">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg">
            <PlayCircle className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center text-lg font-black text-slate-900">
            תרצו להמשיך מאיפה שעצרתם?
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed text-slate-600">
            כל מה שהזנתם בכלים לפני ההרשמה שמור בחשבון שלכם. בחרו כלי, והוא ייפתח עם הנתונים בשלב שבו עצרתם.
          </DialogDescription>
        </DialogHeader>

        <ul className="m-0 list-none space-y-2 p-0">
          {choices.map(({ key, title, href, icon: Icon, detail, step }) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => choose(href)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-info font-black text-slate-900">{title}</span>
                  <span className="block break-words text-sm text-slate-600">{detail}</span>
                  {step && <span className="block text-xs font-bold text-blue-700">עצרתם ב: {step}</span>}
                </span>
                <ArrowLeft className="h-4 w-4 shrink-0 text-blue-600" />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={close}
          className="mx-auto mt-1 block text-sm font-bold text-slate-500 hover:text-slate-700"
        >
          לא עכשיו, אמשיך לדאשבורד
        </button>
      </DialogContent>
    </Dialog>
  );
}
