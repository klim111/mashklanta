'use client';

import { BookmarkCheck, Home, PieChart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SavedMix } from '../savedMixes';
import { MixRow } from './MixRow';
import { formatShekel } from './primitives';

interface SavedMixPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SavedMix[];
  address?: string;
  totalAmount: number;
  activeId?: string;
  onSelect: (item: SavedMix) => void;
}

/**
 * בחירת תמהיל שמור לאותו נכס — או לאותו סכום משכנתא כשאין כתובת —
 * בלי לחזור למסך הפתיחה של הכלי.
 */
export function SavedMixPicker({
  open,
  onOpenChange,
  items,
  address,
  totalAmount,
  activeId,
  onSelect,
}: SavedMixPickerProps) {
  const scope = address?.trim()
    ? `לנכס ב${address.trim()}`
    : `למשכנתא בסך ${formatShekel(totalAmount)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookmarkCheck className="h-4 w-4 text-blue-600" />
            תמהילים שמורים {scope}
          </DialogTitle>
          <DialogDescription className="text-right text-xs leading-relaxed">
            מוצגים רק תמהילים לאותו נכס, או לאותו סכום משכנתא כשלא הוזנה כתובת. בחירה טוענת את
            התמהיל לאזור העבודה.
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="py-8 text-center">
            <PieChart className="mx-auto mb-2 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">אין תמהילים שמורים {scope}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <Home className="h-3.5 w-3.5 text-slate-400" />
              {items.length} תמהילים
            </p>
            {items.map((item) => (
              <MixRow
                key={item.mix.id}
                mix={item.mix}
                summary={item.summary}
                active={item.mix.id === activeId}
                selected={item.mix.id === activeId}
                highlight={item.mix.id === activeId ? 'בעבודה' : undefined}
                hint="לחצו לטעינה לאזור העבודה"
                onClick={() => {
                  onSelect(item);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
