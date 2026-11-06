'use client';

import React from 'react';
import { ListChecks } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PlanStageId } from '@/lib/advisor-crm';
import { TaskForm } from './TaskComposer';
import type { NewTaskInput } from './useAdvisorCrm';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** הלקוח שהמשימה נפתחת עליו. ריק — בוחרים לקוח, או משאירים בלי שיוך */
  clientId?: string;
  clientName?: string;
  clients?: Array<{ id: string; name: string }>;
  stage?: PlanStageId;
  onCreate: (input: NewTaskInput) => Promise<string | null>;
}

/**
 * משימה חדשה מהגישה המהירה שבראש העמוד.
 *
 * כשנפתחת מדף לקוח, המשימה כבר משויכת אליו ואין מה לבחור. כשנפתחת מלוח הבקרה,
 * אפשר לשייך אותה ללקוח או להשאיר אותה משימה של היועץ עצמו.
 */
export function TaskDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  clients,
  stage,
  onCreate,
}: TaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg text-right">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-right">
            <ListChecks className="h-5 w-5 text-blue-600" />
            משימה חדשה{clientName ? ` · ${clientName}` : ''}
          </DialogTitle>
          <DialogDescription className="text-right">
            {clientName
              ? 'המשימה תשויך ללקוח הזה ותופיע אצלו בשלב שתבחרו.'
              : 'אפשר לשייך את המשימה ללקוח, או להשאיר אותה משימה שלכם בלי שיוך.'}
            {' '}משימה עם תאריך מופיעה גם בלוח השנה.
          </DialogDescription>
        </DialogHeader>

        <TaskForm
          clientId={clientId}
          clients={clients}
          stage={stage}
          onCreate={onCreate}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
