'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, PartyPopper } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/**
 * הברכה אחרי "חתמתי על המשכנתא בבנק". סגירת החלון, בכל דרך, מובילה לאזור
 * האישי — שם המשכנתא מופיעה כמשכנתא שהתהליך שלה הסתיים.
 */
export function PlanCompletedDialog({
  open,
  refinance,
  bank,
  onDone,
}: {
  open: boolean;
  refinance: boolean;
  bank: string | null;
  onDone: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDone();
      }}
    >
      <DialogContent dir="rtl" className="max-w-md rounded-3xl bg-white p-8 text-center">
        <motion.span
          initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg"
        >
          <PartyPopper className="h-10 w-10 text-white" />
        </motion.span>
        <DialogTitle className="text-center text-subtitle font-black leading-snug text-slate-900">
          מזל טוב! {refinance ? 'המיחזור הושלם' : 'המשכנתא נחתמה'}
        </DialogTitle>
        <DialogDescription className="mt-2 text-center text-info leading-relaxed text-slate-600">
          {bank ? `חתמתם מול בנק ${bank}, ` : ''}
          והתהליך עם משכלנתא הסתיים בהצלחה. עשיתם את זה בדרך הנכונה: הגעתם לבנק עם תכנון, מספרים
          והשוואה, ולא עם ניחושים. בהצלחה בבית, והמשכנתא נשארת זמינה אצלכם באזור האישי.
        </DialogDescription>
        <button
          type="button"
          onClick={onDone}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-cta font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700"
        >
          לאזור האישי
          <ArrowLeft className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
