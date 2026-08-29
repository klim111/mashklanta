'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BookmarkCheck,
  Building2,
  Copy,
  GitCompareArrows,
  Layers,
  Plus,
  Save,
  Sparkles,
  SquarePen,
  Trash2,
} from 'lucide-react';
import type { MixResult, WorkspaceMix } from '../engine';
import type { SavedMix } from '../savedMixes';
import { UNIFORM_BASKETS } from '@/lib/mortgage-plan';
import { MixRow } from './MixRow';
import { MixStripCard } from './MixStripCard';
import { formatShekel } from './primitives';

export const MAX_COMPARED_MIXES = 3;

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
  compareNotice?: string | null;
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
  compareNotice,
}: MixListProps) {
  const scope = address?.trim()
    ? `לנכס ב${address.trim()}`
    : `למשכנתא בסך ${formatShekel(activeResult.mix.totalAmount)}`;

  const bankDefaults = others.filter((item) => isBankDefaultMix(item.mix, uniformMixIds));
  const customMixes = others.filter((item) => !isBankDefaultMix(item.mix, uniformMixIds));
  const comparedItems = others.filter((item) => comparedIds.includes(item.mix.id));
  const comparedCount = comparedItems.length;
  const compareFull = comparedCount >= MAX_COMPARED_MIXES;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            תמהילים {scope}
            <span className="text-xs font-normal text-slate-500">{others.length + 1}</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCreateForProperty}>
              <Plus className="h-3.5 w-3.5 ml-1" />
              תמהיל נוסף לנכס הזה
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onLoadSaved}>
              <BookmarkCheck className="h-3.5 w-3.5 ml-1" />
              טען תמהיל שמור
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <GitCompareArrows className="h-3.5 w-3.5" />
          לחיצה על תיבת תמהיל מעלה אותו לאזור העבודה. סימון בעיגול מוסיף עד {MAX_COMPARED_MIXES}{' '}
          תמהילים להשוואה כשורות מלאות, בלי להחליף את זה שבעבודה.
        </p>
        {nameNotice && <p className="text-[11px] font-semibold text-red-700">{nameNotice}</p>}
        {compareNotice && <p className="text-[11px] font-semibold text-amber-700">{compareNotice}</p>}
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
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(activeResult.mix.id)}
                    title="הסרה מאזור העבודה — התמהיל יישמר בתמהילים השמורים"
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
          </section>

          {bankDefaults.length > 0 && (
            <MixSliderSection
              icon={<Building2 className="h-3.5 w-3.5" />}
              tone="bank"
              title="התמהילים שהבנק מציע כברירת מחדל"
              subtitle="נקודת ייחוס לבחינת התמהיל המותאם אישית"
              items={bankDefaults}
              comparedIds={comparedIds}
              compareFull={compareFull}
              onActivate={onActivate}
              onToggleCompare={onToggleCompare}
            />
          )}

          {customMixes.length > 0 && (
            <MixSliderSection
              icon={<Sparkles className="h-3.5 w-3.5" />}
              tone="custom"
              title="תמהילים מותאמים אישית"
              subtitle="תמהילים שנוצרו או נפתחו בכלי"
              items={customMixes}
              comparedIds={comparedIds}
              compareFull={compareFull}
              onActivate={onActivate}
              onToggleCompare={onToggleCompare}
            />
          )}

          {comparedItems.length > 0 && (
            <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <GitCompareArrows className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-xs font-black text-indigo-900">תמהילים בהשוואה</p>
                  <p className="text-[10px] text-indigo-700">
                    עד {MAX_COMPARED_MIXES} תמהילים כשורות מלאות. הסרה מכאן לא מוחקת את התמהיל
                    מהשמורים.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
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
                          onClick={() => onDismiss(item.mix.id)}
                          title="הסרה מהעמוד — התמהיל יישמר בתמהילים השמורים"
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

function MixSliderSection({
  icon,
  tone,
  title,
  subtitle,
  items,
  comparedIds,
  compareFull,
  onActivate,
  onToggleCompare,
}: {
  icon: React.ReactNode;
  tone: 'bank' | 'custom';
  title: string;
  subtitle: string;
  items: SavedMix[];
  comparedIds: string[];
  compareFull: boolean;
  onActivate: (item: SavedMix) => void;
  onToggleCompare: (id: string) => void;
}) {
  const bank = tone === 'bank';
  return (
    <section
      className={`rounded-2xl border p-3 ${
        bank ? 'border-amber-200 bg-amber-50/70' : 'border-violet-200 bg-violet-50/50'
      }`}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${
            bank ? 'bg-amber-600' : 'bg-violet-600'
          }`}
        >
          {icon}
        </span>
        <div>
          <p className={`text-xs font-black ${bank ? 'text-amber-950' : 'text-violet-950'}`}>
            {title}
          </p>
          <p className={`text-[10px] ${bank ? 'text-amber-800' : 'text-violet-700'}`}>{subtitle}</p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {items.map((item) => {
          const selected = comparedIds.includes(item.mix.id);
          return (
            <MixStripCard
              key={item.mix.id}
              mix={item.mix}
              summary={item.summary}
              selected={selected}
              selectDisabled={compareFull && !selected}
              onToggleSelect={() => onToggleCompare(item.mix.id)}
              onActivate={() => onActivate(item)}
            />
          );
        })}
      </div>
    </section>
  );
}
