'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Layers, Lock, Save, Sparkles, TrendingDown } from 'lucide-react';

/**
 * הגבלת הכלי למשתמש שאינו רשום.
 *
 * המשתמש הלא-רשום מקבל בדיקה אמיתית: שלושה שינויים מצטברים בפאנל השליטה —
 * ריבית, תקופה, סכום, סוג מסלול או לוח סילוקין, בכל מסלול שהוא. גרירה של אותו
 * סליידר נחשבת שינוי אחד, כדי שלא תתבזבז באמצע התנועה. מהשינוי הרביעי נפתחת
 * ההזמנה להרשמה, והשינוי לא מוחל.
 */

/** מספר השינויים הפתוחים למשתמש שאינו רשום */
export const GUEST_CHANGE_ALLOWANCE = 3;

export interface RefinanceGuestGate {
  /** האם ההגבלה פעילה בכלל (משתמש לא רשום) */
  limited: boolean;
  /** האם השינוי מותר. controlKey מזהה את הבקרה שנגעו בה */
  allow: (controlKey: string) => boolean;
  /** כמה שינויים כבר נוצלו */
  used: number;
  /** כמה שינויים נותרו */
  remaining: number;
  /** נוצלה מכסת השינויים */
  spent: boolean;
  promptOpen: boolean;
  openPrompt: () => void;
  closePrompt: () => void;
}

export function useRefinanceGuestGate(
  limited: boolean,
  allowance: number = GUEST_CHANGE_ALLOWANCE
): RefinanceGuestGate {
  const [touched, setTouched] = useState<string[]>([]);
  const [promptOpen, setPromptOpen] = useState(false);

  const allow = useCallback(
    (controlKey: string) => {
      if (!limited) return true;
      // בקרה שכבר נגעו בה ממשיכה לעבוד — גרירה אחת אינה שלושה שינויים
      if (touched.includes(controlKey)) return true;
      if (touched.length < allowance) {
        setTouched((prev) => (prev.includes(controlKey) ? prev : [...prev, controlKey]));
        return true;
      }
      setPromptOpen(true);
      return false;
    },
    [limited, touched, allowance]
  );

  const used = limited ? touched.length : 0;

  return {
    limited,
    allow,
    used,
    remaining: Math.max(0, allowance - used),
    spent: limited && used >= allowance,
    promptOpen,
    openPrompt: useCallback(() => setPromptOpen(true), []),
    closePrompt: useCallback(() => setPromptOpen(false), []),
  };
}

/** ההזמנה להרשמה שנפתחת אחרי שנוצלו כל השינויים הפתוחים */
export function GuestLimitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        dir="rtl"
        className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden p-5 text-right sm:w-full"
      >
        <DialogHeader className="min-w-0 space-y-2 text-right">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center text-lg font-bold leading-snug text-slate-900">
            בדקתם {GUEST_CHANGE_ALLOWANCE} שינויים. הכלי המלא במרחק הרשמה אחת
          </DialogTitle>
          <DialogDescription className="text-center text-[13px] leading-relaxed text-slate-600">
            בתצוגה הפתוחה אפשר לבחון {GUEST_CHANGE_ALLOWANCE} שינויים בפאנל השליטה. פתיחת חשבון —
            בחינם, בפחות מדקה — מסירה את ההגבלה לגמרי.
          </DialogDescription>
        </DialogHeader>

        <ul className="m-0 min-w-0 list-none space-y-1.5 p-0">
          <Benefit icon={TrendingDown} text="שינוי ריבית, תקופה וסכום בכל מסלול — ללא הגבלה" />
          <Benefit icon={Layers} text="הוספת מסלולים ובניית תמהיל מיחזור מלא" />
          <Benefit icon={Save} text="שמירת החלופות באזור האישי וחזרה אליהן בכל שלב" />
          <Benefit icon={Lock} text="הנתונים נשמרים בחשבון שלכם בלבד" />
        </ul>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row-reverse sm:items-center">
          <Link href="/auth/register" className="min-w-0 sm:flex-1">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700">
              פתיחת חשבון חינם
              <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
            </Button>
          </Link>
          <Link href="/auth/login" className="min-w-0 sm:flex-1">
            <Button variant="outline" className="w-full">
              כבר יש לי חשבון
            </Button>
          </Link>
          <Button variant="ghost" onClick={onClose} className="shrink-0 text-slate-500">
            אמשיך לצפות
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Benefit({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 break-words text-[13px] leading-snug text-slate-700">{text}</span>
    </li>
  );
}
