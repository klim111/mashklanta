'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  requiredEquityFor,
} from '../propertyContext';
import { MaxPaymentDialog } from './MaxPaymentDialog';
import { formatShekel } from './primitives';

interface PropertyHeaderProps {
  mix: WorkspaceMix;
  /** ההחזר החודשי בפועל של התמהיל שבעבודה — נבדק מול תקרת ההחזר */
  monthlyPayment: number;
  /** מספר התמהילים שכבר קיימים לנכס הזה */
  mixCount: number;
  onPatch: (patch: Partial<WorkspaceMix>) => void;
  onTotalAmountChange: (amount: number) => void;
}

/**
 * כותרת הנכס שמעל התמהילים: סכום המשכנתא, עלות הנכס, ההון העצמי, סוג העסקה
 * וכתובת הנכס. כל ערך ניתן לעריכה בלחיצה עליו, וסכום המשכנתא מוגבל לתקרת
 * המימון של בנק ישראל לפי סוג העסקה — חריגה ממנה דורשת הגדלת ההון העצמי.
 */
export function PropertyHeader({
  mix,
  monthlyPayment,
  mixCount,
  onPatch,
  onTotalAmountChange,
}: PropertyHeaderProps) {
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [draftEquity, setDraftEquity] = useState(0);
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

  const requiredEquity = pendingAmount === null ? 0 : requiredEquityFor(pendingAmount, dealType);

  /** הגדלת המשכנתא מעל התקרה לא מתבצעת ישירות — היא ממתינה להגדלת ההון העצמי. */
  const commitAmount = (next: number) => {
    if (next <= 0) return;
    if (propertyValue <= 0 || next <= maxMortgage + 1) {
      setPendingAmount(null);
      onTotalAmountChange(next);
      return;
    }
    setPendingAmount(next);
    setDraftEquity(Math.round(requiredEquityFor(next, dealType)));
  };

  const commitEquity = (next: number) => {
    if (propertyValue <= 0) return;
    onTotalAmountChange(Math.max(0, propertyValue - Math.max(0, next)));
  };

  const applyPendingWithEquity = () => {
    if (pendingAmount === null || draftEquity < requiredEquity - 1) return;
    onPatch({ propertyValue: Math.round(pendingAmount + draftEquity) });
    onTotalAmountChange(pendingAmount);
    setPendingAmount(null);
  };

  const changeDealType = (next: DealType) => {
    setPendingAmount(null);
    onPatch({ dealType: next });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 p-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shrink-0">
          <Home className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <EditableText
            value={mix.propertyAddress ?? ''}
            placeholder="הוסיפו כתובת נכס"
            emptyLabel={`משכנתא בסך ${formatShekel(mix.totalAmount)}`}
            onCommit={(propertyAddress) =>
              onPatch({ propertyAddress: propertyAddress.trim() || undefined })
            }
          />
          <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {mix.propertyAddress?.trim()
              ? 'כל התמהילים לכתובת הזו מוצגים ומושווים יחד'
              : 'ללא כתובת — התמהילים מקובצים לפי סכום המשכנתא'}
            <span className="text-slate-300">·</span>
            {mixCount} תמהילים
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={dealType} onValueChange={(value) => changeDealType(value as DealType)}>
            <SelectTrigger className="h-8 w-[190px] text-xs">
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
              className={`text-[10px] ${
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
          onCommit={commitAmount}
          hint={
            propertyValue > 0
              ? `מקסימום ל${DEAL_TYPES[dealType]} — ${formatShekel(maxMortgage)}`
              : 'הזינו עלות נכס כדי לבדוק את תקרת המימון'
          }
        />
        <EditableAmount
          icon={<Home className="h-3.5 w-3.5 text-violet-600" />}
          label="עלות הנכס"
          value={propertyValue}
          onCommit={(next) => onPatch({ propertyValue: next > 0 ? next : undefined })}
        />
        <EditableAmount
          icon={<PiggyBank className="h-3.5 w-3.5 text-emerald-600" />}
          label="הון עצמי"
          value={equity}
          onCommit={commitEquity}
          hint={
            propertyValue > 0
              ? `נדרש לפחות ${formatShekel(propertyValue - maxMortgage)}`
              : undefined
          }
        />
        <EditableAmount
          icon={<Calculator className="h-3.5 w-3.5 text-amber-600" />}
          label="החזר חודשי מקסימלי"
          value={mix.maxMonthlyPayment ?? 0}
          onCommit={(next) => onPatch({ maxMonthlyPayment: next > 0 ? next : undefined })}
          action={
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px] text-blue-600"
              onClick={() => setShowMaxPayment(true)}
            >
              חשב
            </Button>
          }
          hint={
            (mix.maxMonthlyPayment ?? 0) > 0
              ? `בתמהיל הנוכחי ${formatShekel(monthlyPayment)}`
              : 'לחצו על "חשב" לפי נתוני הלקוח'
          }
        />
      </div>

      {pendingAmount !== null && (
        <div className="border-t border-red-200 bg-red-50 p-3 space-y-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-bold text-red-900">עליך להגדיל את ההון העצמי</p>
              <p className="text-[11px] text-red-800 leading-relaxed">
                משכנתא של {formatShekel(pendingAmount)} חורגת מתקרת המימון — ב{DEAL_TYPES[dealType]}{' '}
                מותר עד {ltvLimit}% משווי הנכס, כלומר {formatShekel(maxMortgage)} לנכס הנוכחי. כדי
                לקחת את הסכום הזה נדרש הון עצמי של {formatShekel(requiredEquity)} לפחות, ועלות הנכס
                תעודכן בהתאם.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-red-900">הון עצמי (₪)</Label>
              <FormattedNumberValueInput
                className="h-9 w-40 bg-white"
                autoFocus
                value={draftEquity || ''}
                onValueChange={setDraftEquity}
              />
            </div>
            <Button
              size="sm"
              className="h-9 text-xs"
              disabled={draftEquity < requiredEquity - 1}
              onClick={applyPendingWithEquity}
            >
              אשר משכנתא של {formatShekel(pendingAmount)}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 text-xs text-red-700"
              onClick={() => setPendingAmount(null)}
            >
              בטל
            </Button>
            {draftEquity >= requiredEquity - 1 && (
              <span className="text-[11px] text-red-800">
                עלות הנכס תתעדכן ל{formatShekel(pendingAmount + draftEquity)}
              </span>
            )}
          </div>
        </div>
      )}

      {overFinanced && pendingAmount === null && (
        <div className="flex flex-wrap items-center gap-2 border-t border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="min-w-0 flex-1 text-[11px] text-red-800 leading-relaxed">
            אחוז המימון ({ltv.toFixed(1)}%) גבוה מהתקרה של בנק ישראל ל{DEAL_TYPES[dealType]} (
            {ltvLimit}%). עליך להגדיל את ההון העצמי, או להקטין את המשכנתא עד{' '}
            {formatShekel(maxMortgage)}.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onTotalAmountChange(Math.floor(maxMortgage))}
          >
            התאם לתקרה
          </Button>
        </div>
      )}

      {overPayment && (
        <div className="flex items-start gap-2 border-t border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            ההחזר החודשי בתמהיל ({formatShekel(monthlyPayment)}) גבוה מההחזר המקסימלי שנקבע ללקוח (
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
        onConfirm={(maxMonthlyPayment) => onPatch({ maxMonthlyPayment })}
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
  onCommit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  action?: React.ReactNode;
  emphasized?: boolean;
  onCommit: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

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
        <p className="text-[10px] text-slate-500 flex items-center gap-1">
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

      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
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
