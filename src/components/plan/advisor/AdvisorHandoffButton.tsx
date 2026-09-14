'use client';

import React from 'react';
import { Loader2, Sparkles, UserCheck } from 'lucide-react';
import type { PlanStageId } from '@/lib/mortgage-plan';

interface AdvisorHandoffButtonProps {
  stage: PlanStageId;
  /** השלב כבר מטופל על ידי יועץ */
  taken?: boolean;
  /** בקשת הליווי בשליחה כרגע */
  busy?: boolean;
  onClick: () => void;
}

/**
 * "תנו ליועץ משכלנתא לעשות לכם את העבודה".
 *
 * בקשה חינמית — היועץ מטפל בשלב והתשלום מסודר בהמשך מולו. אחרי שנשלחה, הכפתור
 * מתחלף בסימון שהיועץ מטפל. הכפתור יושב בכותרת השלב, לאחר שהלקוח כבר בחר
 * לעבוד לבד, כדי שיוכל להעביר את העבודה ליועץ בכל רגע.
 */
export function AdvisorHandoffButton({
  stage: _stage,
  taken = false,
  busy = false,
  onClick,
}: AdvisorHandoffButtonProps) {
  if (taken) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-100 px-4 py-2 text-xs font-black text-violet-700">
        <UserCheck className="h-3.5 w-3.5" />
        היועץ מטפל בשלב הזה
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="בקשה חינמית — היועץ מטפל בשלב, התשלום בהמשך"
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-violet-600 to-purple-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-70"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      תנו ליועץ משכלנתא לעשות לכם את העבודה
    </button>
  );
}
