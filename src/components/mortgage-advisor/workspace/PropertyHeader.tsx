'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  Calculator,
  Home,
  MapPin,
  Pencil,
  Percent,
  PiggyBank,
  Wallet,
  X,
} from 'lucide-react';
import { DEAL_TYPES, MAX_LTV_PERCENT } from '../types';
import type { DealType } from '../types';
import type { WorkspaceMix } from '../engine';
import {
  DEAL_TYPE_KEYS,
  dealTypeOf,
  equityOf,
  ltvOf,
  maxMortgageFor,
} from '../propertyContext';
import { MaxPaymentDialog } from './MaxPaymentDialog';
import { formatPayment, formatShekel } from './primitives';
import type { DealField } from '../dealGuard';

/** עריכה של פרטי העסקה — כל השדות יחד, כדי שהבדיקה תיעשה על המצב הסופי */
export interface DealPatch {
  propertyValue?: number;
  totalAmount?: number;
  equity?: number;
  maxMonthlyPayment?: number;
  dealType?: DealType;
  propertyAddress?: string;
}

interface PropertyHeaderProps {
  mix: WorkspaceMix;
  /** ההחזר החודשי בפועל של התמהיל שבעבודה — נבדק מול תקרת ההחזר */
  monthlyPayment: number;
  /** מספר התמהילים שכבר קיימים לנכס הזה */
  mixCount: number;
  /** תקרה שחושבה מהפרופיל — 40% מההכנסה הפנויה של היחיד או של הזוג */
  profileMaxMonthlyPayment?: number;
  /**
   * עריכת פרטי העסקה. העריכה נשמרת תמיד; חריגה ממגבלת רגולציה מגיעה כהתראה
   * דרך `notice` ומוצגת כאן, מתחת לשדות.
   */
  onCommitDeal: (patch: DealPatch, edited: DealField) => boolean;
  /** התראה מהבדיקה הרגולטורית */
  notice?: string | null;
  onDismissNotice?: () => void;
  /**
   * הכלי של היועץ: כל ערך משתנה מיד, גם מעל תקרת המימון או ההחזר. החריגה
   * מוצגת כאזהרה מתחת לשדות ולא חוסמת — היועץ בונה גם תרחישים שחורגים.
   */
  advisory?: boolean;
  /** ההחזר המקסימלי מחושב מהכנסת הלווים שהוזנה בכלי */
  maxPaymentFromIncome?: boolean;
}

/**
 * כותרת הנכס שמעל התמהילים: סכום המשכנתא, עלות הנכס, ההון העצמי, סוג העסקה
 * וכתובת הנכס. כל ערך ניתן לעריכה בלחיצה עליו ומשנה רק את עצמו. חריגה מתקרת
 * המימון, מההון העצמי המינימלי או מתקרת ההחזר מוצגת כהתראה מתחת לשדות.
 */
export function PropertyHeader({
  mix,
  monthlyPayment,
  mixCount,
  profileMaxMonthlyPayment,
  onCommitDeal,
  notice,
  onDismissNotice,
  advisory = false,
  maxPaymentFromIncome = false,
}: PropertyHeaderProps) {
  const [showMaxPayment, setShowMaxPayment] = useState(false);

  const dealType = dealTypeOf(mix);
  const propertyValue = mix.propertyValue ?? 0;
  const equity = equityOf(mix);
  const ltv = ltvOf(mix);
  const ltvLimit = MAX_LTV_PERCENT[dealType];
  const maxMortgage = maxMortgageFor(propertyValue, dealType);
  const overFinanced = propertyValue > 0 && mix.totalAmount > maxMortgage + 1;
  const overPayment =
    (mix.maxMonthlyPayment ?? 0) > 0 && monthlyPayment > (mix.maxMonthlyPayment ?? 0) + 1;

  const minEquity = propertyValue > 0 ? Math.max(0, propertyValue - maxMortgage) : 0;
  /** הון שהוזן בנפרד ונמוך מהמינימום. בתמהיל ישן ההון נגזר, והחריגה היא חריגת המימון */
  const lowEquity = mix.equity !== undefined && propertyValue > 0 && equity < minEquity - 1;
  /** משכנתא והון עצמי שלא מכסים יחד את עלות הנכס */
  const fundingGap =
    mix.equity !== undefined && propertyValue > 0 && mix.totalAmount > 0
      ? propertyValue - mix.totalAmount - equity
      : 0;

  /**
   * כל שדה מעדכן רק את עצמו: סכום המשכנתא, עלות הנכס וההון העצמי נשמרים כפי
   * שהוזנו ולא מזיזים זה את זה. חריגה ממגבלה לא חוסמת — היא מוצגת כהתראה.
   */
  const commitAmount = (next: number) => {
    if (next <= 0) return;
    onCommitDeal({ totalAmount: next }, 'totalAmount');
  };

  const commitEquity = (next: number) => {
    onCommitDeal({ equity: Math.max(0, next) }, 'equity');
  };

  const commitPropertyValue = (next: number) => {
    onCommitDeal({ propertyValue: Math.max(0, next) }, 'propertyValue');
  };

  const changeDealType = (next: DealType) => {
    onCommitDeal({ dealType: next }, 'dealType');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 p-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shrink-0">
          <Home className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <EditableText
            value={mix.propertyAddress ?? ''}
            placeholder="הוסיפו כתובת נכס"
            emptyLabel={mix.totalAmount > 0 ? `משכנתא בסך ${formatShekel(mix.totalAmount)}` : 'תמהיל חדש'}
            onCommit={(propertyAddress) =>
              onCommitDeal({ propertyAddress: propertyAddress.trim() }, 'propertyAddress')
            }
          />
          <p className="text-2xs text-slate-500 flex flex-wrap items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {mix.propertyAddress?.trim()
              ? 'כל התמהילים לכתובת הזו מוצגים ומושווים יחד'
              : 'ללא כתובת — התמהילים מקובצים לפי סכום המשכנתא'}
            <span className="text-slate-300">·</span>
            {mixCount} תמהילים
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select value={dealType} onValueChange={(value) => changeDealType(value as DealType)}>
            <SelectTrigger className="h-9 w-full min-w-0 text-xs sm:h-8 sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEAL_TYPE_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {DEAL_TYPES[key]} · עד {MAX_LTV_PERCENT[key]}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {propertyValue > 0 && (
            <Badge
              className={`text-2xs ${
                overFinanced
                  ? 'bg-red-100 text-red-800 hover:bg-red-100'
                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Percent className="h-3 w-3 ml-1" />
              מימון {ltv.toFixed(1)}% מתוך {ltvLimit}%
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-3">
        <EditableAmount
          icon={<Wallet className="h-3.5 w-3.5 text-blue-600" />}
          label="סכום המשכנתא"
          value={mix.totalAmount}
          emphasized
          startEditing={advisory && mix.totalAmount <= 0}
          onCommit={commitAmount}
          hint={
            mix.totalAmount <= 0
              ? 'הזינו את סכום המשכנתא כדי להתחיל לבנות את התמהיל'
              : propertyValue > 0
                ? `מקסימום ל${DEAL_TYPES[dealType]} — ${formatShekel(maxMortgage)}`
                : 'הזינו עלות נכס כדי לבדוק את תקרת המימון'
          }
        />
        <EditableAmount
          icon={<Home className="h-3.5 w-3.5 text-violet-600" />}
          label="עלות הנכס"
          value={propertyValue}
          onCommit={commitPropertyValue}
          hint={
            propertyValue > 0 && mix.totalAmount > 0
              ? `הון עצמי ${formatShekel(equity)} · מימון ${ltv.toFixed(1)}%`
              : undefined
          }
        />
        <EditableAmount
          icon={<PiggyBank className="h-3.5 w-3.5 text-emerald-600" />}
          label="הון עצמי"
          value={equity}
          onCommit={commitEquity}
          hint={
            propertyValue > 0
              ? `נדרש לפחות ${formatShekel(minEquity)}`
              : 'ההון העצמי שעומד לרשות הלקוח'
          }
        />
        <EditableAmount
          icon={<Calculator className="h-3.5 w-3.5 text-amber-600" />}
          label="החזר חודשי מקסימלי"
          value={mix.maxMonthlyPayment ?? 0}
          onCommit={(next) => onCommitDeal({ maxMonthlyPayment: Math.max(0, next) }, 'maxMonthlyPayment')}
          action={
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-2xs text-blue-600"
              onClick={() => setShowMaxPayment(true)}
            >
              חשב
            </Button>
          }
          hint={
            maxPaymentFromIncome
              ? `40% מהכנסת הלווים · בתמהיל הנוכחי ${formatPayment(monthlyPayment)}`
              : (mix.maxMonthlyPayment ?? 0) > 0
              ? profileMaxMonthlyPayment
                ? `40% מההכנסה הפנויה · בתמהיל הנוכחי ${formatPayment(monthlyPayment)}`
                : `בתמהיל הנוכחי ${formatPayment(monthlyPayment)}`
              : profileMaxMonthlyPayment
                ? 'מחושב אוטומטית כ-40% מההכנסה הפנויה'
                : 'לחצו על "חשב" לפי נתוני הלקוח'
          }
        />
      </div>

      {notice && (
        <div className="flex items-start gap-2 border-t border-amber-300 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-xs font-bold text-amber-900">שימו לב: הנתונים חורגים ממגבלות בנק ישראל</p>
            <p className="text-2xs leading-relaxed text-amber-800">{notice}</p>
          </div>
          {onDismissNotice && (
            <button
              type="button"
              onClick={onDismissNotice}
              title="סגירת ההודעה"
              className="rounded-md p-1 text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {lowEquity && (
        <div className="flex items-start gap-2 border-t border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-2xs text-red-800 leading-relaxed">
            ההון העצמי ({formatShekel(equity)}) נמוך מהמינימום של בנק ישראל ל{DEAL_TYPES[dealType]}: לנכס
            בעלות {formatShekel(propertyValue)} נדרש הון עצמי של {formatShekel(minEquity)} לפחות (
            {100 - ltvLimit}% מעלות הנכס).
          </p>
        </div>
      )}

      {fundingGap > 1 && (
        <div className="flex items-start gap-2 border-t border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-2xs text-amber-800 leading-relaxed">
            המשכנתא וההון העצמי יחד ({formatShekel(mix.totalAmount + equity)}) נמוכים מעלות הנכס ב
            {formatShekel(fundingGap)}.
          </p>
        </div>
      )}

      {overFinanced && (
        <div className="flex flex-wrap items-center gap-2 border-t border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="min-w-0 flex-1 text-2xs text-red-800 leading-relaxed">
            אחוז המימון ({ltv.toFixed(1)}%) גבוה מהתקרה של בנק ישראל ל{DEAL_TYPES[dealType]} (
            {ltvLimit}%). עליך להגדיל את ההון העצמי, או להקטין את המשכנתא עד{' '}
            {formatShekel(maxMortgage)}.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onCommitDeal({ totalAmount: Math.floor(maxMortgage) }, 'totalAmount')}
          >
            התאם לתקרה
          </Button>
        </div>
      )}

      {overPayment && !notice && (
        <div className="flex items-start gap-2 border-t border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-2xs text-amber-800 leading-relaxed">
            ההחזר החודשי בתמהיל ({formatPayment(monthlyPayment)}) גבוה מההחזר המקסימלי שנקבע ללקוח (
            {formatShekel(mix.maxMonthlyPayment ?? 0)}). האריכו תקופה, הקטינו את המשכנתא או עדכנו את
            התקרה.
          </p>
        </div>
      )}

      <MaxPaymentDialog
        open={showMaxPayment}
        dealType={dealType}
        equity={equity}
        onClose={() => setShowMaxPayment(false)}
        onConfirm={(maxMonthlyPayment) => onCommitDeal({ maxMonthlyPayment }, 'maxMonthlyPayment')}
      />
    </div>
  );
}

/** ערך כספי שנפתח לעריכה בלחיצה עליו, ונסגר באישור או ביציאה מהשדה. */
function EditableAmount({
  icon,
  label,
  value,
  hint,
  action,
  emphasized = false,
  startEditing = false,
  onCommit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  action?: React.ReactNode;
  emphasized?: boolean;
  /** השדה נפתח לעריכה מיד — סכום המשכנתא בתמהיל ריק */
  startEditing?: boolean;
  onCommit: (value: number) => void;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (!startEditing) return;
    setDraft(0);
    setEditing(true);
  }, [startEditing]);

  const start = () => {
    setDraft(Math.round(value));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (Math.round(draft) !== Math.round(value)) onCommit(draft);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="flex items-center justify-between gap-1">
        <p className="text-2xs text-slate-500 flex items-center gap-1">
          {icon}
          {label}
        </p>
        {action}
      </div>

      {editing ? (
        <FormattedNumberValueInput
          className="h-8 mt-0.5"
          autoFocus
          value={draft || ''}
          onValueChange={setDraft}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={start}
          title={`לחצו כדי לערוך את ${label}`}
          className="group flex w-full items-center gap-1 text-right"
        >
          <span
            className={`font-bold leading-tight ${
              emphasized ? 'text-lg text-blue-600' : 'text-base text-slate-900'
            }`}
          >
            {value > 0 ? formatShekel(value) : 'לא הוזן'}
          </span>
          <Pencil className="h-3 w-3 text-slate-300 transition-colors group-hover:text-blue-500" />
        </button>
      )}

      {hint && <p className="text-2xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

/** כתובת הנכס — כותרת שהופכת לשדה עריכה בלחיצה. */
function EditableText({
  value,
  placeholder,
  emptyLabel,
  onCommit,
}: {
  value: string;
  placeholder: string;
  emptyLabel: string;
  onCommit: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const start = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onCommit(draft);
  };

  if (editing) {
    return (
      <div className="max-w-sm">
        <AddressAutocomplete
          className="h-8"
          autoFocus
          placeholder={placeholder}
          value={draft}
          onChange={setDraft}
          // בחירה מהרשימה מסיימת את העריכה מיד
          onSelect={(suggestion) => {
            setEditing(false);
            if (suggestion.label.trim() !== value.trim()) onCommit(suggestion.label);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      title="לחצו כדי לערוך את כתובת הנכס"
      className="group flex items-center gap-1.5 text-right"
    >
      <span className="text-base font-bold text-slate-900 truncate max-w-full">
        {value.trim() || emptyLabel}
      </span>
      <Pencil className="h-3 w-3 text-slate-300 transition-colors group-hover:text-blue-500" />
    </button>
  );
}
