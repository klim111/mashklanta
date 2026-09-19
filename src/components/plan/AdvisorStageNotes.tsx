'use client';

import { MessageSquare, UserRound } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/advisor-crm';
import type { PlanStageId } from '@/lib/advisor-crm';
import { useAdvisorNotes } from '@/components/advisor/useAdvisorCrm';

/**
 * ההערות שהיועץ שלח ללקוח בשלב הזה.
 *
 * מוצגות רק הערות שהיועץ בחר במפורש לשלוח — הערה שנשמרה כאישית אינה מגיעה
 * לכאן כלל, כי היא לא עוזבת את צד היועץ.
 */
export function AdvisorStageNotes({ stage }: { stage: PlanStageId }) {
  const { notes, ready } = useAdvisorNotes();
  const forStage = notes.filter((note) => note.stage === stage);

  if (!ready || forStage.length === 0) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-3xl border border-blue-200 bg-blue-50/60">
      <div className="flex items-center gap-2 border-b border-blue-100 px-4 py-2.5">
        <MessageSquare className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-black text-blue-900">הערות מהיועץ שלכם בשלב הזה</span>
      </div>

      <div className="space-y-2 p-3">
        {forStage.map((note) => (
          <div key={note.id} className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {note.body}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-bold text-blue-700">
                <UserRound className="h-3 w-3" />
                הערה מהיועץ · {note.advisorName}
              </span>
              <span>
                {formatDate(note.createdAt)} · {formatTime(note.createdAt)}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
