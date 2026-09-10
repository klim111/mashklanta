'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Layers, Lock, Save, Sparkles, TrendingDown } from 'lucide-react';

/**
 * הגבלת הכלי למשתמש שאינו רשום.
 *
 * המשתמש הלא-רשום מקבל בדיקה אמיתית אחת: הבקרה הראשונה שהוא נוגע בה פועלת
 * במלואה — הכותרת "אחרי המיחזור" והגרפים מתעדכנים לפי מה שהוא משנה. מרגע
 * שהוא נוגע בבקרה נוספת (סליידר אחר, ריבית אחרת, תקופה של מסלול אחר) נפתחת
 * ההזמנה להרשמה, והשינוי לא מוחל.
 */
export interface RefinanceGuestGate {
  /** האם ההגבלה פעילה בכלל (משתמש לא רשום) */
  limited: boolean;
  /** האם השינוי מותר. controlKey מזהה את הבקרה שנגעו בה */
  allow: (controlKey: string) => boolean;
  /** האם כבר נוצלה הבדיקה החינמית */
  spent: boolean;
  promptOpen: boolean;
  openPrompt: () => void;
  closePrompt: () => void;
}

export function useRefinanceGuestGate(limited: boolean): RefinanceGuestGate {
  const [freeControl, setFreeControl] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  const allow = useCallback(
    (controlKey: string) => {
      if (!limited) return true;
      if (freeControl === null) {
        setFreeControl(controlKey);
        return true;
      }
      if (freeControl === controlKey) return true;
      setPromptOpen(true);
      return false;
    },
    [limited, freeControl]
  );

  return {
    limited,
    allow,
    spent: limited && freeControl !== null,
    promptOpen,
    openPrompt: useCallback(() => setPromptOpen(true), []),
    closePrompt: useCallback(() => setPromptOpen(false), []),
  };
}

/** ההזמנה להרשמה שנפתחת אחרי השינוי הראשון */
export function GuestLimitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg text-right">
        <DialogHeader className="text-right">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-slate-900">
            ראיתם מה מיחזור אחד עושה. עכשיו בואו נבדוק את כל התמהיל
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-slate-600">
            בתצוגה הפתוחה אפשר לבחון שינוי אחד. פתיחת חשבון — בחינם, בפחות מדקה — פותחת את הכלי
            במלואו, בלי הגבלה על מספר השינויים.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-2">
          <Benefit icon={TrendingDown} text="שינוי ריבית ותקופה בכל מסלול בנפרד, ללא הגבלה" />
          <Benefit icon={Layers} text="בניית תמהיל מיחזור חלופי מלא והשוואה מולו" />
          <Benefit icon={Save} text="שמירת החלופות באזור האישי וחזרה אליהן בכל שלב" />
          <Benefit icon={Lock} text="הנתונים נשמרים בחשבון שלכם בלבד" />
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Link href="/auth/register" className="sm:flex-1">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white">
              פתיחת חשבון חינם
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/auth/login" className="sm:flex-1">
            <Button variant="outline" className="w-full">
              כבר יש לי חשבון
            </Button>
          </Link>
          <Button variant="ghost" onClick={onClose} className="text-slate-500 sm:flex-none">
            אמשיך לצפות
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Benefit({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm text-slate-700">{text}</span>
    </li>
  );
}
