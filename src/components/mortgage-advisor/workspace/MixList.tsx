'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, GitCompareArrows, Layers, Plus, Save, SquarePen, Trash2 } from 'lucide-react';
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
  /** תרחיש ריבית או מדד פעיל — הנתונים בשורה מוצגים לפי התרחיש */
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
  onDuplicate: (item: SavedMix) => void;
  onDuplicateActive: () => void;
  /** תמהיל ששוכפל או נשמר כחדש ומחכה לשם — שדה השם נפתח ריק */
  pendingRenameId?: string | null;
  onCreateForProperty: () => void;
  /** כשיש שינויים שלא נשמרו — כפתור שמירה כתמהיל חדש בשורת אזור העבודה */
  onSaveAsNew?: () => void;
  saveDirty?: boolean;
  flashSave?: boolean;
}

/**
 * כל התמהילים של הנכס. התמהיל שבעבודה מופרד ויזואלית בראש, ושאר התמהילים
 * נשארים למטה להשוואה. לחיצה על שורה מעלה אותה לאזור העבודה; סימון בווי מוסיף
 * להשוואה בלי להחליף את זה שבניתוח.
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
  onDuplicate,
  onDuplicateActive,
  pendingRenameId,
  onCreateForProperty,
  onSaveAsNew,
  saveDirty = false,
  flashSave = false,
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
          לחיצה על שורת תמהיל מעלה אותו לאזור העבודה. סימון בווי מוסיף תמהילים להשוואה בלי להחליף
          את זה שבעבודה.
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <section className="rounded-2xl border-2 border-blue-400 bg-gradient-to-b from-blue-50 to-white p-3 shadow-sm">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                <SquarePen className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black text-blue-900">אזור העבודה</p>
                <p className="text-[10px] text-blue-700">התמהיל שנפתח לניתוח ולעריכה</p>
              </div>
              {saveDirty && onSaveAsNew && (
                <Button
                  size="sm"
                  className={`ms-auto h-8 text-xs ${flashSave ? 'save-flash' : ''}`}
                  onClick={onSaveAsNew}
                >
                  <Save className="h-3.5 w-3.5 ml-1" />
                  שמור מצב נוכחי כתמהיל
                </Button>
              )}
            </div>
            <MixRow
              key={activeResult.mix.id}
              mix={activeResult.mix}
              summary={activeResult.summary}
              result={activeResult}
              active
              selected
              selectionLocked
              onToggleSelect={() => undefined}
              expanded={expanded}
              onClick={pendingRenameId === activeResult.mix.id ? undefined : onToggleExpanded}
              onRename={onRenameActive}
              startRenaming={pendingRenameId === activeResult.mix.id}
              requireName={pendingRenameId === activeResult.mix.id}
              namePlaceholder="תנו שם לתמהיל החדש"
              hint={
                pendingRenameId === activeResult.mix.id
                  ? 'תנו שם לתמהיל כדי להמשיך לערוך אותו'
                  : 'לחצו לעריכת המסלולים'
              }
              note={scenarioActive ? 'תרחיש פעיל' : undefined}
              actions={
                <>
                  <button
                    type="button"
                    onClick={onDuplicateActive}
                    title="שכפול התמהיל"
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {activeActions}
                </>
              }
            />
            {expanded && (
              <div className="mt-2 overflow-visible rounded-2xl border border-blue-200 bg-white shadow-sm">
                {editor}
              </div>
            )}
          </section>

          {others.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-white">
                  <GitCompareArrows className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-800">תמהילים להשוואה</p>
                  <p className="text-[10px] text-slate-500">
                    לחצו על תמהיל כדי להעלות אותו לעבודה, או סמנו בווי להשוואה בגרפים
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {others.map((item) => (
                  <MixRow
                    key={item.mix.id}
                    mix={item.mix}
                    summary={item.summary}
                    selected={comparedIds.includes(item.mix.id)}
                    onToggleSelect={() => onToggleCompare(item.mix.id)}
                    onClick={() => onActivate(item)}
                    onRename={(name) => onRename(item.mix.id, name)}
                    hint="לחצו להעברה לאזור העבודה"
                    actions={
                      <>
                        <button
                          type="button"
                          onClick={() => onDuplicate(item)}
                          title="שכפול התמהיל"
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.mix.id)}
                          title="מחיקת התמהיל"
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          ) : (
            <p className="text-[11px] text-slate-500 leading-relaxed px-1">
              זה התמהיל היחיד {scope}. בנו תמהיל נוסף לאותו נכס כדי להשוות חלופות — כל התמהילים לנכס
              הזה יוצגו כאן ובאזור האישי תחת אותה כותרת.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
