'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RecommendationTone } from '@/lib/profile-report';
import { RecommendationCard } from './RecommendationCallouts';
import type { RecommendationNote } from './RecommendationCallouts';

const toneButton: Record<RecommendationTone, string> = {
  critical: 'bg-rose-600 text-white ring-rose-200 hover:bg-rose-700',
  warning: 'bg-amber-500 text-white ring-amber-200 hover:bg-amber-600',
  info: 'bg-blue-600 text-white ring-blue-200 hover:bg-blue-700',
};

function strongestTone(notes: RecommendationNote[]): RecommendationTone {
  if (notes.some((note) => note.tone === 'critical')) return 'critical';
  if (notes.some((note) => note.tone === 'warning')) return 'warning';
  return 'info';
}

/**
 * סימן קריאה שפותח את ההערות בחלון צף.
 *
 * ההערות עצמן — מתי הן מופיעות ומה כתוב בהן — נגזרות מהפרופיל בדיוק כמו
 * קודם. מה שהשתנה הוא המקום: במקום שורות מתחת למודול, סימן ליד הנתון שהן
 * מתייחסות אליו, והלחיצה עליו פותחת אותן.
 */
export function NotesAlert({
  notes,
  label,
  title = 'הערות חשובות',
  className = '',
}: {
  notes: RecommendationNote[];
  /** כיתוב ליד הסימן. בלי כיתוב מוצג סימן עגול בלבד */
  label?: string;
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (notes.length === 0) return null;
  const tone = strongestTone(notes);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label ? undefined : title}
        title={title}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full ring-4 transition-colors ${toneButton[tone]} ${
          label ? 'px-3 py-1.5 text-[13px] font-black' : 'h-7 w-7 justify-center'
        } ${className}`}
      >
        <AlertCircle className="h-4 w-4" />
        {label && (
          <span>
            {label}
            {notes.length > 1 ? ` (${notes.length})` : ''}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader className="text-center">
            <DialogTitle className="justify-center text-center text-xl font-black text-slate-900">
              {title}
            </DialogTitle>
            <DialogDescription className="text-center text-[15px] text-slate-500">
              {notes.length === 1 ? 'הערה אחת לנתונים שהזנתם' : `${notes.length} הערות לנתונים שהזנתם`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {notes.map((note) => (
              <RecommendationCard key={note.id} recommendation={note} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
