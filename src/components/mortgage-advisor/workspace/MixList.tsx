'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BookmarkCheck,
  Copy,
  GitCompareArrows,
  Layers,
  Plus,
  Save,
  SquarePen,
  Trash2,
} from 'lucide-react';
import type { MixResult, WorkspaceMix } from '../engine';
import type { SavedMix } from '../savedMixes';
import { UNIFORM_BASKETS } from '@/lib/mortgage-plan';
import { MixRow } from './MixRow';
import { MixStripCard } from './MixStripCard';
import type { MixOrigin } from './MixStripCard';
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
  onRenameActive: (name: string) => boolean | void;
  onRename: (id: string, name: string) => boolean | void;
  /** הסרה מהעמוד בלבד — התמהיל נשאר בתמהילים השמורים */
  onDismiss: (id: string) => void;
  onDuplicate: (item: SavedMix) => void;
  onDuplicateActive: () => void;
  /** תמהיל ששוכפל או נשמר כחדש ומחכה לשם — שדה השם נפתח ריק */
  pendingRenameId?: string | null;
  onCreateForProperty: () => void;
  onLoadSaved: () => void;
  /** כשיש שינויים שלא נשמרו — כפתור שמירה כתמהיל חדש בשורת אזור העבודה */
  onSaveAsNew?: () => void;
  saveDirty?: boolean;
  flashSave?: boolean;
  /** מזהי הסלים האחידים שנשמרו מהאישור העקרוני */
  uniformMixIds?: string[];
  nameNotice?: string | null;
}

function isBankDefaultMix(mix: WorkspaceMix, preferredIds: string[]): boolean {
  if (preferredIds.includes(mix.id)) return true;
  if (mix.id.startsWith('uniform-mix-')) return true;
  return UNIFORM_BASKETS.some(
    (basket) => mix.name === basket.shortName || mix.name.startsWith(`${basket.shortName} ·`)
  );
}

/**
 * כל התמהילים של הנכס. התמהיל שבעבודה בראש; הסלים האחידים והתמהילים המותאמים
 * מוצגים כסרגל אופקי, והמסומנים להשוואה — עד שלושה — כשורות מלאות מתחת.
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
  onDismiss,
  onDuplicate,
  onDuplicateActive,
  pendingRenameId,
  onCreateForProperty,
  onLoadSaved,
  onSaveAsNew,
  saveDirty = false,
  flashSave = false,
  uniformMixIds = [],
  nameNotice,
}: MixListProps) {
  const scope = address?.trim()
    ? `לנכס ב${address.trim()}`
    : `למשכנתא בסך ${formatShekel(activeResult.mix.totalAmount)}`;

  const originOf = (item: SavedMix): MixOrigin =>
    isBankDefaultMix(item.mix, uniformMixIds) ? 'bank' : 'custom';
  const comparedItems = others.filter((item) => comparedIds.includes(item.mix.id));

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-right">
          <CardTitle className="flex items-center justify-center gap-2 text-base sm:justify-start">
            <Layers className="h-4 w-4 text-blue-600" />
            תמהילים {scope}
            <span className="text-xs font-normal text-slate-500">{others.length + 1}</span>
          </CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button size="sm" variant="outline" className="h-10 w-full text-xs sm:h-8 sm:w-auto" onClick={onCreateForProperty}>
              <Plus className="h-3.5 w-3.5 ml-1" />
              תמהיל נוסף לנכס הזה
            </Button>
            <Button size="sm" variant="outline" className="h-10 w-full text-xs sm:h-8 sm:w-auto" onClick={onLoadSaved}>
              <BookmarkCheck className="h-3.5 w-3.5 ml-1" />
              טען תמהיל שמור
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 text-center sm:justify-start sm:text-right">
          <GitCompareArrows className="h-3.5 w-3.5" />
          לחיצה על תיבת תמהיל פותחת אותה באזור העבודה. סימון בעיגול שבצד ימין מוסיף את התמהיל
          לאזור העבודה להשוואה — בלי הגבלה על מספר התמהילים.
        </p>
        {nameNotice && <p className="text-[11px] font-semibold text-red-700">{nameNotice}</p>}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <section className="rounded-2xl border-2 border-blue-400 bg-gradient-to-b from-blue-50 to-white p-3 shadow-sm">
            <div className="mb-2.5 flex flex-col items-center gap-2 text-center sm:flex-row sm:flex-wrap sm:items-center sm:text-right">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                <SquarePen className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-black text-blue-900 sm:justify-start">
                  אזור העבודה
                  {comparedItems.length > 0 && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">
                      {comparedItems.length + 1} תמהילים בהשוואה
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-blue-700">
                  {comparedItems.length > 0
                    ? 'הטבלה והגרפים שמתחת מציגים את כל התמהילים שבאזור העבודה'
                    : 'התמהיל שנפתח לניתוח ולעריכה'}
                </p>
              </div>
              {saveDirty && onSaveAsNew && (
                <Button
                  size="sm"
                  className={`h-10 w-full text-xs sm:ms-auto sm:h-8 sm:w-auto ${flashSave ? 'save-flash' : ''}`}
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
              showExpandIcon
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
                    className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 sm:p-1.5"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(activeResult.mix.id)}
                    title="הסרה מאזור העבודה — התמהיל יישמר בתמהילים השמורים"
                    className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:p-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
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

            {/* התמהילים שסומנו נכנסים לאזור העבודה עצמו, ומוזנים לטבלה ולגרפים שמתחת */}
            {comparedItems.length > 0 && (
              <div className="mt-3 space-y-2">
                {comparedItems.map((item) => (
                  <MixRow
                    key={item.mix.id}
                    mix={item.mix}
                    summary={item.summary}
                    selected
                    showExpandIcon={false}
                    onToggleSelect={() => onToggleCompare(item.mix.id)}
                    onClick={() => onActivate(item)}
                    onRename={(name) => onRename(item.mix.id, name)}
                    hint="לחצו כדי לפתוח אותו לעריכה"
                    actions={
                      <>
                        <button
                          type="button"
                          onClick={() => onDuplicate(item)}
                          title="שכפול התמהיל"
                          className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 sm:p-1.5"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismiss(item.mix.id)}
                          title="הסרה מהעמוד — התמהיל יישמר בתמהילים השמורים"
                          className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:p-1.5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {others.length > 0 && (
            <MixSliderSection
              items={others}
              originOf={originOf}
              comparedIds={comparedIds}
              onActivate={onActivate}
              onToggleCompare={onToggleCompare}
            />
          )}

          {others.length === 0 && (
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

/**
 * כל התמהילים של הנכס בשורה אחת — אלה של הבנק ואלה שנבנו בכלי יחד.
 *
 * ההבחנה ביניהם נעשית על הכרטיס עצמו, בגוון ובתווית, כדי שאפשר יהיה להשוות
 * ביניהם בלי לקפוץ בין שני אזורים נפרדים.
 */
function MixSliderSection({
  items,
  originOf,
  comparedIds,
  onActivate,
  onToggleCompare,
}: {
  items: SavedMix[];
  originOf: (item: SavedMix) => MixOrigin;
  comparedIds: string[];
  onActivate: (item: SavedMix) => void;
  onToggleCompare: (id: string) => void;
}) {
  const bankCount = items.filter((item) => originOf(item) === 'bank').length;
  const customCount = items.length - bankCount;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-2.5 flex flex-col items-center gap-1 text-center sm:flex-row sm:items-center sm:gap-2 sm:text-right">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-white">
          <GitCompareArrows className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-xs font-black text-slate-900">תמהילים להשוואה</p>
          <p className="flex flex-wrap items-center justify-center gap-x-2 text-[10px] text-slate-600 sm:justify-start">
            {bankCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {bankCount} ברירת מחדל של הבנק
              </span>
            )}
            {customCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-violet-400" />
                {customCount} מותאמים אישית
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:snap-x sm:snap-mandatory sm:overflow-x-auto sm:pb-1 sm:[scrollbar-width:thin] sm:justify-start">
        {items.map((item) => {
          const selected = comparedIds.includes(item.mix.id);
          return (
            <MixStripCard
              key={item.mix.id}
              mix={item.mix}
              summary={item.summary}
              origin={originOf(item)}
              selected={selected}
              onToggleSelect={() => onToggleCompare(item.mix.id)}
              onActivate={() => onActivate(item)}
            />
          );
        })}
      </div>
    </section>
  );
}
