'use client';

import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StartCard } from './StartCard';

/**
 * "מתכננים משכנתא חדשה" — אותה שאלת פתיחה, בחלון צף.
 *
 * הכפתורים כאן הם בדיוק אלה שבתפריט הצד ובמסך הראשון, ומתנהגים באותה צורה:
 * שתי אפשרויות פותחות תהליך, שתיים פותחות פנייה ליועץ, ושתי הבדיקות מובילות
 * לכלים. אין כאן זרימה נפרדת — רק מקום נוסף להגיע ממנו.
 */
export function NewMortgageDialog({
  open,
  onOpenChange,
  onStart,
  busy,
  hasPlans,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
  busy: boolean;
  hasPlans: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="justify-center text-center text-2xl">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              מתכננים משכנתא חדשה
            </span>
          </DialogTitle>
          <DialogDescription className="text-center text-info">
            נתחיל מהמקום שבו אתם נמצאים — בחרו את המצב שמתאים לכם.
          </DialogDescription>
        </DialogHeader>

        <StartCard variant="dialog" onStart={onStart} busy={busy} hasPlans={hasPlans} />
      </DialogContent>
    </Dialog>
  );
}
