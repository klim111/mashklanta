'use client';

import React from 'react';
import { Clock, Sparkles, UserCheck } from 'lucide-react';
import { formatOrderPrice, ADVISOR_STAGE_PRICE } from '@/lib/advisor-orders';
import type { PlanStageId } from '@/lib/mortgage-plan';

interface AdvisorHandoffButtonProps {
  stage: PlanStageId;
  /** השלב כבר מבוצע על ידי יועץ */
  taken?: boolean;
  /** יש בקשה שהוגשה וממתינה לתשלום */
  pending?: boolean;
  onClick: () => void;
}

/**
 * "תנו ליועץ משכלנתא לעשות לכם את העבודה".
 *
 * הכפתור נמצא בכל אחד מחמשת השלבים, ומציג מיד את מחיר השלב — כדי שההחלטה
 * תתקבל מול מספר ולא מול הבטחה. אחרי הזמנה ותשלום הוא מתחלף בסימון מצב.
 */
export function AdvisorHandoffButton({
  stage,
  taken = false,
  pending = false,
  onClick,
}: AdvisorHandoffButtonProps) {
  if (taken) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-100 px-4 py-2 text-xs font-black text-violet-700">
        <UserCheck className="h-3.5 w-3.5" />
        היועץ מבצע את השלב הזה
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="היועץ מבצע את השלב במקומכם — אתם ממשיכים לראות הכול"
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-violet-600 to-purple-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-all hover:brightness-110"
    >
      {pending ? <Clock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      {pending ? 'השלימו את התשלום לבקשת הליווי' : 'תנו ליועץ משכלנתא לעשות לכם את העבודה'}
      {!pending && (
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
          {formatOrderPrice(ADVISOR_STAGE_PRICE[stage])}
        </span>
      )}
    </button>
  );
}
