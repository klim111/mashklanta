'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCompareArrows, Layers, Plus, Trash2 } from 'lucide-react';
import type { MixResult } from '../engine';
import type { SavedMix } from '../savedMixes';
import { MixRow } from './MixRow';
import { formatShekel } from './primitives';

interface MixListProps {
  /** התמהיל שבניתוח, מהמצב החי שלו */
  activeResult: MixResult;
  /** שאר התמהילים לאותו נכס */
  others: SavedMix[];
  comparedIds: string[];
  address?: string;
  expanded: boolean;
  /** תרחיש ריבית או מדד פעיל — הנתונים בשורה מוצגים לפיו */
  scenarioActive?: boolean;
  /** פעולות התמהיל כולו, מוצגות בשורה של התמהיל שבניתוח */
  activeActions?: React.ReactNode;
  /** פירוט התמהיל שבניתוח לעריכה */
  editor: React.ReactNode;
  onToggleExpanded: () => void;
  onActivate: (item: SavedMix) => void;
  onToggleCompare: (id: string) => void;
  onRenameActive: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreateForProperty: () => void;
}

/**
 * כל התמהילים של הנכס באותה רשימה ובאותה תצוגה. התמהיל שבניתוח נמצא בראש
 * הרשימה, ולחיצה על שורה של תמהיל אחר מעלה אותו לראש ומעבירה אליו את הניתוח
 * הגרפי. סימון בווי מוסיף תמהיל להשוואה בלי להחליף את זה שבניתוח.
 */
export function MixList({
  activeResult,
  others,
  comparedIds,
  address,
  expanded,
  scenarioActive = false,
  activeActions,
  editor,
  onToggleExpanded,
  onActivate,
  onToggleCompare,
  onRenameActive,
  onRename,
  onDelete,
  onCreateForProperty,
}: MixListProps) {
  const scope = address?.trim()
    ? `לנכס ב${address.trim()}`
    : `למשכנתא בסך ${formatShekel(activeResult.mix.totalAmount)}`;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            תמהילים {scope}
            <span className="text-xs font-normal text-slate-500">{others.length + 1}</span>
          </CardTitle>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCreateForProperty}>
            <Plus className="h-3.5 w-3.5 ml-1" />
            תמהיל נוסף לנכס הזה
          </Button>
        </div>
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <GitCompareArrows className="h-3.5 w-3.5" />
          לחיצה על שורת תמהיל מעלה אותו לראש הרשימה ומציגה את הניתוח הגרפי שלו. סימון בווי מוסיף
          תמהילים להשוואה.
        </p>
      </CardHeader>

      <CardContent className="space-y-2">
        <MixRow
          mix={activeResult.mix}
          summary={activeResult.summary}
          active
          selected
          selectionLocked
          onToggleSelect={() => undefined}
          expanded={expanded}
          onClick={onToggleExpanded}
          onRename={onRenameActive}
          actions={activeActions}
          detail={editor}
          hint="לחצו לעריכת המסלולים"
          note={scenarioActive ? 'תרחיש פעיל' : undefined}
        />

        {others.map((item) => (
          <MixRow
            key={item.mix.id}
            mix={item.mix}
            summary={item.summary}
            selected={comparedIds.includes(item.mix.id)}
            onToggleSelect={() => onToggleCompare(item.mix.id)}
            onClick={() => onActivate(item)}
            onRename={(name) => onRename(item.mix.id, name)}
            hint="לחצו להעברה לראש הרשימה ולניתוח"
            actions={
              <button
                type="button"
                onClick={() => onDelete(item.mix.id)}
                title="מחיקת התמהיל"
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            }
          />
        ))}

        {others.length === 0 && (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            זה התמהיל היחיד {scope}. בנו תמהיל נוסף לאותו נכס כדי להשוות חלופות — כל התמהילים לנכס
            הזה יוצגו כאן ובאזור האישי תחת אותה כותרת.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
