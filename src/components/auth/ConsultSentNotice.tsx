'use client';

import { useEffect } from 'react';
import { CheckCircle2, GraduationCap, LayoutDashboard, MessagesSquare } from 'lucide-react';
import { readConsultPrefill, type ConsultPrefill } from '@/lib/consult-reasons';

/**
 * ההסבר בראש עמוד ההרשמה אחרי שאורח שלח בקשת ליווי מ"היוועצו איתנו".
 * השם והמייל שהזין בבקשה עוברים לטופס דרך `onPrefill`.
 */
export function ConsultSentNotice({ onPrefill }: { onPrefill: (prefill: ConsultPrefill) => void }) {
  useEffect(() => {
    const prefill = readConsultPrefill();
    if (prefill) onPrefill(prefill);
    // פעם אחת בטעינה, כדי לא לדרוס את מה שהלקוח מקליד
  }, []);

  return (
    <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-right" role="status">
      <div className="flex items-center gap-2 font-bold text-violet-900">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        הבקשה שלכם נשלחה ליועץ משכלנתא
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        היועץ יחזור אליכם בהקדם. למעקב אחרי סטטוס הפנייה הירשמו למשכלנתא. בחשבון תוכלו גם:
      </p>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
        <li className="flex items-start gap-2">
          <LayoutDashboard className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          לנהל את תהליך המשכנתא שלב אחר שלב
        </li>
        <li className="flex items-start gap-2">
          <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
          לתקשר עם היועץ ועם כל הגורמים המקצועיים בעסקה
        </li>
        <li className="flex items-start gap-2">
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          ללמוד במרכז הלמידה כל מה שצריך לדעת על משכנתא
        </li>
      </ul>
    </div>
  );
}
