'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, FolderOpen, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MeetingDialog } from './MeetingDialog';
import { TaskDialog } from './TaskDialog';
import type { NewMeetingInput, NewTaskInput } from './useAdvisorCrm';

export interface QuickActionsProps {
  /** הלקוח שהעמוד עוסק בו. כשהוא קיים, שלוש הפעולות נפתחות עליו כברירת מחדל */
  clientId?: string;
  clientName?: string;
  clients: Array<{ id: string; name: string }>;
  onCreateTask: (input: NewTaskInput) => Promise<string | null>;
  onProposeMeeting: (input: NewMeetingInput) => Promise<string | null>;
  /** כהה — לשורה שיושבת על הרקע הכהה של ראש לוח הבקרה */
  tone?: 'dark' | 'light';
}

/**
 * הגישה המהירה שבראש העמוד: משימה, פגישה ותיק מסמכים.
 *
 * ההקשר קובע את ברירת המחדל. מתוך דף לקוח שלוש הפעולות כבר יודעות על מי הן
 * נעשות; מלוח הבקרה הן נפתחות עם בחירת לקוח — ומשימה יכולה גם להישאר בלי שיוך.
 */
export function QuickActions({
  clientId,
  clientName,
  clients,
  onCreateTask,
  onProposeMeeting,
  tone = 'light',
}: QuickActionsProps) {
  const router = useRouter();
  const [taskOpen, setTaskOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  const openDocuments = () => {
    if (clientId) router.push(`/advisor-dashboard/client/${clientId}/documents`);
    else setDocumentsOpen(true);
  };

  const buttonClass =
    tone === 'dark'
      ? 'inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20'
      : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTaskOpen(true)} className={buttonClass}>
          <ListChecks className="h-4 w-4" />
          הוסף משימה
        </button>
        <button type="button" onClick={() => setMeetingOpen(true)} className={buttonClass}>
          <CalendarPlus className="h-4 w-4" />
          קבע פגישה
        </button>
        <button type="button" onClick={openDocuments} className={buttonClass}>
          <FolderOpen className="h-4 w-4" />
          תיק מסמכים
        </button>
      </div>

      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        clientId={clientId}
        clientName={clientName}
        clients={clients}
        onCreate={onCreateTask}
      />

      <MeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        clientId={clientId}
        clientName={clientName}
        clients={clients}
        onSubmit={onProposeMeeting}
      />

      {/* מלוח הבקרה תיק המסמכים נפתח אחרי בחירת הלקוח שאליו הוא שייך */}
      <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
        <DialogContent dir="rtl" className="max-h-[70vh] max-w-md overflow-y-auto text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-right">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              תיק מסמכים
            </DialogTitle>
            <DialogDescription className="text-right">
              תיק המסמכים נשמר תחת הלקוח. בחרו את הלקוח שתיקו ייפתח.
            </DialogDescription>
          </DialogHeader>

          {clients.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              עדיין אין לקוחות. צרפו לקוח כדי לפתוח לו תיק מסמכים.
            </p>
          ) : (
            <div className="space-y-1">
              {clients.map((client) => (
                <Button
                  key={client.id}
                  variant="ghost"
                  className="h-10 w-full justify-start text-sm"
                  onClick={() => {
                    setDocumentsOpen(false);
                    router.push(`/advisor-dashboard/client/${client.id}/documents`);
                  }}
                >
                  {client.name}
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
