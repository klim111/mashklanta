'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useOpenAdvisorLead } from './useOpenAdvisorLead';

export const ALREADY_CONTACTED_MESSAGE = 'פנייתך כבר התקבלה ויועץ משכלנתא יחזור אליך בהקדם';

/** החלון הצף שמופיע ללקוח שכבר שלח פנייה ולוחץ שוב על כפתור שמוביל לפנייה ליועץ */
export function AlreadyContactedDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-sm rounded-3xl bg-white p-6 text-center sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </span>
        <DialogTitle className="mt-4 justify-center text-center text-subtitle font-black leading-snug text-slate-900">
          {ALREADY_CONTACTED_MESSAGE}
        </DialogTitle>
        <DialogDescription className="sr-only">הפנייה הקודמת שלכם עדיין בטיפול</DialogDescription>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-button font-black text-white transition-colors hover:bg-blue-700"
        >
          הבנתי
        </button>
      </DialogContent>
    </Dialog>
  );
}

/**
 * האם חלון של בקשת ליווי צריך להציג במקום הטופס את ההודעה שהפנייה כבר התקבלה.
 *
 * ההחלטה נקבעת פעם אחת בכל פתיחה, כשמצב הפנייה ידוע: כך הפנייה שנשלחת מתוך
 * החלון עצמו לא מחליפה את מסך האישור שלו בהודעה.
 */
export function useAlreadyContacted(open: boolean): boolean {
  const { ready, contacted } = useOpenAdvisorLead();
  const [blocked, setBlocked] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (!open) {
      decided.current = false;
      setBlocked(false);
      return;
    }
    if (decided.current || !ready) return;
    decided.current = true;
    setBlocked(contacted);
  }, [open, ready, contacted]);

  return blocked;
}
