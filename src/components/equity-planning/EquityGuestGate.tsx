'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarClock, LayoutDashboard, Lock, Save, Sparkles, UserPlus } from 'lucide-react';

/**
 * הכלי פתוח לכולם, אבל השמירה שייכת לחשבון.
 *
 * מי שאינו רשום יכול להזין ערכים ולראות את התוצאה — ומהרגע שהזין ערך ראשון
 * מופיעה ההתראה שכדי לשמור אותם ולהמשיך לעבוד עם הכלי צריך להירשם. אחרי
 * מכסה קצרה של שינויים נפתחת ההזמנה להרשמה, והשינוי שמעבר למכסה אינו מוחל.
 * לחיצה על "להירשם" פותחת את מסך ההרשמה, וחוזרים לכלי עם הערכים שהוזנו.
 */

/** כמה ערכים אפשר להזין בלי חשבון */
export const EQUITY_GUEST_ALLOWANCE = 3;

/** חזרה לכלי אחרי ההרשמה, כדי שהטיוטה תישמר בחשבון */
export const EQUITY_REGISTER_HREF = '/auth/register?callbackUrl=%2Fequity-planning';
export const EQUITY_LOGIN_HREF = '/auth/login?callbackUrl=%2Fequity-planning';

export interface EquityGuestGate {
  /** ההגבלה פעילה — המשתמש אינו רשום */
  limited: boolean;
  /** האם השינוי מותר. `fieldKey` מזהה את השדה שנגעו בו */
  allow: (fieldKey: string) => boolean;
  /**
   * סימון שהוזנו ערכים בלי לנצל מהמכסה. פרטי הנכס הם תנאי לפתיחת הטבלה, ולכן
   * הם פתוחים לכולם — אבל מרגע שהוזנו, ההתראה על השמירה כבר מוצגת.
   */
  note: () => void;
  /** האם כבר הוזנו ערכים — מרגע זה מוצגת ההתראה */
  touched: boolean;
  used: number;
  remaining: number;
  spent: boolean;
  promptOpen: boolean;
  openPrompt: () => void;
  closePrompt: () => void;
}

export function useEquityGuestGate(
  limited: boolean,
  allowance: number = EQUITY_GUEST_ALLOWANCE
): EquityGuestGate {
  const [fields, setFields] = useState<string[]>([]);
  const [noted, setNoted] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const allow = useCallback(
    (fieldKey: string) => {
      if (!limited) return true;
      // שדה שכבר נגעו בו ממשיך לעבוד — הקלדה אחת אינה שלושה שינויים
      if (fields.includes(fieldKey)) return true;
      if (fields.length < allowance) {
        setFields((prev) => (prev.includes(fieldKey) ? prev : [...prev, fieldKey]));
        return true;
      }
      setPromptOpen(true);
      return false;
    },
    [limited, fields, allowance]
  );

  const used = limited ? fields.length : 0;

  return {
    limited,
    allow,
    note: useCallback(() => setNoted(true), []),
    touched: used > 0 || noted,
    used,
    remaining: Math.max(0, allowance - used),
    spent: limited && used >= allowance,
    promptOpen,
    openPrompt: useCallback(() => setPromptOpen(true), []),
    closePrompt: useCallback(() => setPromptOpen(false), []),
  };
}

/** ההתראה שמלווה את המשתמש הלא-רשום מרגע שהזין ערך ראשון */
export function GuestSaveNotice({ gate }: { gate: EquityGuestGate }) {
  if (!gate.limited || !gate.touched) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-amber-200 bg-gradient-to-l from-amber-50 via-orange-50 to-amber-50 p-4 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
        <Lock className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-info font-black text-amber-900">
          הערכים שהזנתם עדיין לא נשמרו
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-amber-800/80">
          כדי לשמור את הערכים ולהמשיך לעבוד עם הכלי צריך להירשם לפלטפורמה.
          {gate.spent
            ? ' מכסת ההזנה ללא חשבון נוצלה — ההרשמה פותחת את הכלי במלואו.'
            : ` נותרו לכם ${gate.remaining} שדות להזנה ללא חשבון.`}
        </p>
      </div>
      <Link href={EQUITY_REGISTER_HREF} className="shrink-0">
        <Button className="w-full bg-gradient-to-l from-amber-500 to-orange-600 font-black text-white hover:from-amber-600 hover:to-orange-700 sm:w-auto">
          <UserPlus className="ml-2 h-4 w-4" />
          להירשם ולשמור
        </Button>
      </Link>
    </div>
  );
}

/** ההזמנה להרשמה שנפתחת כשמכסת ההזנה ללא חשבון נוצלה */
export function EquityGuestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        dir="rtl"
        className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden p-5 text-right sm:w-full"
      >
        <DialogHeader className="min-w-0 space-y-2 text-right">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center text-lg font-bold leading-snug text-slate-900">
            כדי לשמור את הערכים ולהמשיך — צריך להירשם
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed text-slate-600">
            הזנתם {EQUITY_GUEST_ALLOWANCE} ערכים בתצוגה הפתוחה. פתיחת חשבון — בחינם, בפחות מדקה —
            שומרת את מה שהזנתם ומסירה את ההגבלה לגמרי.
          </DialogDescription>
        </DialogHeader>

        <ul className="m-0 min-w-0 list-none space-y-1.5 p-0">
          <Benefit icon={Save} text="התכנון נשמר בחשבון שלכם ולא אובד בסגירת הדפדפן" />
          <Benefit icon={CalendarClock} text="מועדי התשלום נכנסים ללוח השנה הראשי באזור האישי" />
          <Benefit icon={LayoutDashboard} text="תמונת ההון העצמי וההוצאות מופיעה בדאשבורד" />
          <Benefit icon={Lock} text="הנתונים שמורים בחשבון שלכם בלבד" />
        </ul>

        <div className="flex min-w-0 flex-col gap-2">
          <Link href={EQUITY_REGISTER_HREF} className="block min-w-0">
            <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700">
              להירשם ולשמור את הערכים
              <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
            </Button>
          </Link>
          <div className="flex min-w-0 gap-2">
            <Link href={EQUITY_LOGIN_HREF} className="min-w-0 flex-1">
              <Button variant="outline" className="w-full">
                כבר יש לי חשבון
              </Button>
            </Link>
            <Button variant="ghost" onClick={onClose} className="shrink-0 text-slate-500">
              אמשיך לצפות
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Benefit({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-emerald-600 shadow-sm">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 break-words text-sm leading-snug text-slate-700">{text}</span>
    </li>
  );
}
