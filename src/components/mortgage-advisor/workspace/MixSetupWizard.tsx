'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CalendarClock,
  Check,
  CheckCircle2,
  Home,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  AMORTIZATION_TYPES,
  DEAL_TYPES,
  DEFAULT_INTEREST_RATES,
  MAX_LTV_PERCENT,
  MIN_FIXED_PERCENT,
  isFixedTrackType,
  TRACK_TYPES,
  VARIABLE_PERIODS,
} from '../types';
import type { DealType, MortgageTrack } from '../types';
import {
  computeMix,
  createEmptyMix,
  createTrack,
  DEFAULT_ASSUMPTIONS,
  formatDuration,
  normalizeMix,
} from '../engine';
import type { TrackType, WorkspaceMix } from '../engine';
import {
  COMBINED_LTV_MAX,
  COMBINED_LTV_MIN,
  DEAL_TYPE_KEYS,
  DEFAULT_DEAL_TYPE,
  clampCombinedLtv,
  dealTypeForCombinedLtv,
  fixedAmount,
  maxMortgageFor,
  minFixedAmount,
  mixNameExistsForProperty,
  mortgageForLtvPercent,
} from '../propertyContext';
import { MaxPaymentDialog } from './MaxPaymentDialog';
import { NumericInput } from '@/components/ui/numeric-input';
import { AmountAndPercent, TermMonthsSlider, formatShekel, trackColor } from './primitives';
import { PrimeForwardChart, VariableForwardChart, previewPrimeForwardPoints, previewVariableForwardPoints, CURRENT_RATE_PAYMENT_NOTE, usesForwardPricedRate } from './PrimeForwardChart';
import { InflationForecastChart } from './InflationForecastChart';
import { ForecastDisclaimer } from './ForecastDisclaimer';
import { fallbackPrimeForecast } from '@/lib/prime-forward-curve';
import type { PrimeForecast } from '@/lib/prime-forward-curve';
import { fallbackInflationForecast } from '@/lib/inflation-forecast';
import type { InflationForecast } from '@/lib/inflation-forecast';
import { isIndexLinked } from '../scenarioCalculations';

/** מתחת לשקל אחד נחשב "כוסה במלואו" — שאריות עיגול לא אמורות לחסום את המשך התהליך. */
const COVERED_EPSILON = 1;

/** פרטי הנכס והעסקה שכל תמהיל נבנה עליהם */
export interface PropertySetup {
  propertyValue: number;
  dealType: DealType;
  totalAmount: number;
  maxMonthlyPayment: number;
  propertyAddress: string;
  /** הון עצמי מהפרופיל — ברירת המחדל של סכום המשכנתא היא מחיר הנכס פחות הסכום הזה */
  equity?: number;
}

interface MixSetupWizardProps {
  onComplete: (mix: WorkspaceMix) => void;
  onBack: () => void;
  /** פרטי נכס שהוזנו כבר — לבניית תמהיל נוסף לאותו נכס בלי הזנה חוזרת */
  initialProperty?: Partial<PropertySetup>;
  /** עקום הפריים החי — כשחסר משתמשים בנתוני נפילה */
  primeForecast?: PrimeForecast;
  /** תחזית האינפלציה של בנק ישראל — להצמדה במסלולים צמודים */
  inflationForecast?: InflationForecast;
  /** מתהליך חמשת השלבים: מדלגים על מסך הנכס כי הנתונים כבר הוזנו */
  skipPropertyStep?: boolean;
  /** תמהילים שמורים — לבדיקת שם ייחודי לאותו נכס */
  existingMixes?: Array<{
    mix: Pick<WorkspaceMix, 'id' | 'name' | 'propertyAddress' | 'totalAmount'>;
  }>;
}

interface TrackForm {
  type: TrackType;
  amount: number;
  years: number;
  amortizationType: NonNullable<MortgageTrack['amortizationType']>;
  interestRate: number;
  variablePeriod: number;
  /** ריבית שהיועץ הזין ידנית לא תידרס בהחלפת סוג המסלול */
  rateTouched: boolean;
  /** כל עוד הסכום לא נגזר ידנית הוא עוקב אחרי היתרה שנותרה למימון */
  amountTouched: boolean;
}

function emptyForm(type: TrackType = 'fixed_unlinked'): TrackForm {
  return {
    type,
    amount: 0,
    years: 25,
    amortizationType: 'spitzer',
    interestRate: DEFAULT_INTEREST_RATES[type],
    variablePeriod: 5,
    rateTouched: false,
    amountTouched: false,
  };
}

/** ברירת מחדל: מחיר הנכס פחות ההון העצמי, בתוך תקרת סוג העסקה */
function mortgageFromEquity(
  propertyValue: number,
  equity: number | null | undefined,
  dealType: DealType
): number {
  if (propertyValue <= 0) return 0;
  const max = maxMortgageFor(propertyValue, dealType);
  if (equity == null) return 0;
  return Math.min(max, Math.max(0, Math.round(propertyValue - equity)));
}

/**
 * הקמת תמהיל בשלבים: קודם הנכס והעסקה (עלות הנכס, סכום המשכנתא ותקרת ההחזר),
 * אחר כך מסלול אחרי מסלול עד שכל הסכום מכוסה, ולבסוף שם התמהיל. כל שלב נחשף
 * רק אחרי שהקודם הושלם.
 */
export function MixSetupWizard({
  onComplete,
  onBack,
  initialProperty,
  primeForecast,
  inflationForecast,
  skipPropertyStep = false,
  existingMixes = [],
}: MixSetupWizardProps) {
  const seedEquity = initialProperty?.equity ?? null;
  const forecast = primeForecast ?? fallbackPrimeForecast();
  const cpiForecast = inflationForecast ?? fallbackInflationForecast();
  const mixAssumptions = { ...DEFAULT_ASSUMPTIONS, primeForecast: forecast, inflationForecast: cpiForecast };
  const [property, setProperty] = useState<PropertySetup>(() => {
    const propertyValue = initialProperty?.propertyValue ?? 0;
    const dealType = initialProperty?.dealType ?? DEFAULT_DEAL_TYPE;
    const fromEquity = mortgageFromEquity(propertyValue, initialProperty?.equity, dealType);
    return {
      propertyValue,
      dealType,
      totalAmount:
        fromEquity > 0 ? fromEquity : initialProperty?.totalAmount ?? 0,
      maxMonthlyPayment: initialProperty?.maxMonthlyPayment ?? 0,
      propertyAddress: initialProperty?.propertyAddress ?? '',
    };
  });
  const [amountTouched, setAmountTouched] = useState(false);
  /** אחוז מימון ידני במצב משולב — null כשנבחרה תקרת סוג עסקה */
  const [combinedLtv, setCombinedLtv] = useState<number | null>(null);
  /** מתהליך חמשת השלבים הנתונים כבר הוזנו — לא מחזירים את טופס הנכס */
  const [propertyConfirmed, setPropertyConfirmed] = useState(skipPropertyStep);
  const [showMaxPayment, setShowMaxPayment] = useState(false);

  useEffect(() => {
    const cap = initialProperty?.maxMonthlyPayment;
    if (!cap || cap <= 0) return;
    setProperty((current) =>
      current.maxMonthlyPayment > 0 ? current : { ...current, maxMonthlyPayment: cap }
    );
  }, [initialProperty?.maxMonthlyPayment]);

  const [tracks, setTracks] = useState<MortgageTrack[]>([]);
  const [form, setForm] = useState<TrackForm>(() => emptyForm());
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  /** מסלול שנפתח מחדש לעריכה — מוצא מהרשימה השמורה עד לשמירה */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  const totalAmount = property.totalAmount;
  const maxMortgage = maxMortgageFor(property.propertyValue, property.dealType);
  const ltvLimit = MAX_LTV_PERCENT[property.dealType];
  const equity = Math.max(0, property.propertyValue - totalAmount);
  const overFinanced = property.propertyValue > 0 && totalAmount > maxMortgage + 1;

  const propertyReady =
    property.propertyValue > 0 &&
    totalAmount > 0 &&
    !overFinanced &&
    property.maxMonthlyPayment > 0;

  const committedTracks = useMemo(
    () => (editingId ? tracks.filter((track) => track.id !== editingId) : tracks),
    [tracks, editingId]
  );
  const allocated = useMemo(
    () => committedTracks.reduce((sum, t) => sum + t.amount, 0),
    [committedTracks]
  );
  const remaining = Math.max(0, totalAmount - allocated);
  const covered = propertyConfirmed && tracks.length > 0 && remaining <= COVERED_EPSILON && !editingId;

  const formAmount = form.amountTouched ? Math.min(form.amount, remaining) : remaining;

  /**
   * כמה עוד חסר בריבית קבועה כדי להשלים את השליש שבנק ישראל דורש, אחרי המסלולים
   * שכבר נוספו. זו התרעה בלבד: הדרישה היא על סך הריבית הקבועה בתמהיל — צמודה
   * ולא צמודה יחד — ולכן כל מסלול קבוע בודד רשאי להיות קטן משליש.
   */
  const missingFixed = useMemo(() => {
    const required = minFixedAmount(totalAmount) - fixedAmount(committedTracks);
    return required > 1 ? Math.min(remaining, required) : 0;
  }, [totalAmount, committedTracks, remaining]);

  const canAddTrack = formAmount > 0 && form.years > 0;
  const fixedShareOk = fixedAmount(tracks) >= minFixedAmount(totalAmount) - 1;

  /** ההחזר החודשי של רשימת מסלולים נתונה, לבדיקה מול תקרת ההחזר של הלקוח */
  const paymentOf = (list: MortgageTrack[]) =>
    list.length === 0
      ? 0
      : computeMix(
          normalizeMix(createEmptyMix({ totalAmount, tracks: list, assumptions: mixAssumptions }))
        ).summary.monthlyPayment;

  const monthlyPayment = useMemo(() => paymentOf(tracks), [tracks, totalAmount, forecast, cpiForecast]);

  const primePreviewPoints = useMemo(
    () =>
      form.type === 'prime' ? previewPrimeForwardPoints(form.interestRate, form.years, forecast) : [],
    [form.type, form.interestRate, form.years, forecast]
  );

  const variablePreviewPoints = useMemo(
    () =>
      form.type === 'variable_unlinked'
        ? previewVariableForwardPoints(form.interestRate, form.years, form.variablePeriod, forecast)
        : [],
    [form.type, form.interestRate, form.years, form.variablePeriod, forecast]
  );
  const overPayment =
    property.maxMonthlyPayment > 0 && monthlyPayment > property.maxMonthlyPayment + 1;

  const patchProperty = (patch: Partial<PropertySetup>) =>
    setProperty((prev) => ({ ...prev, ...patch }));

  const patchForm = (patch: Partial<TrackForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const changeType = (type: TrackType) => {
    setNotice(null);
    patchForm({
      type,
      interestRate: form.rateTouched ? form.interestRate : DEFAULT_INTEREST_RATES[type],
    });
  };

  /**
   * הסכום במסלול חופשי עד למה שנותר מסכום המשכנתא. אין כאן רצפה: מסלול קבוע
   * קטן משליש תקין כל עוד מסלולי הקבועה יחד משלימים את השליש.
   */
  const commitAmount = (value: number) => {
    setNotice(null);
    patchForm({ amount: Math.min(value, remaining), amountTouched: true });
  };

  /**
   * שינוי סכום המשכנתא אחרי שנוספו מסלולים מאפס את החלוקה, כדי שלא תישאר חלוקה
   * שאינה תקפה לסכום החדש.
   */
  const setTotalAmount = (value: number, dealType?: DealType) => {
    setAmountTouched(true);
    patchProperty({ totalAmount: value, ...(dealType ? { dealType } : {}) });
    if (tracks.length > 0 && Math.round(value) !== Math.round(totalAmount)) {
      setTracks([]);
      setForm(emptyForm());
      setEditingId(null);
      setNotice(null);
    }
  };

  /** בחירת מימון מקסימלי קובעת גם את סוג העסקה וגם את סכום המשכנתא הנגזר ממנו */
  const applyMaxFinancing = (dealType: DealType) => {
    setCombinedLtv(null);
    setTotalAmount(Math.round(maxMortgageFor(property.propertyValue, dealType)), dealType);
  };

  /** מצב משולב: אחוז מימון חופשי בין 1 ל-75, וכל הסכומים נגזרים ממנו */
  const applyCombinedLtv = (raw: number | null) => {
    if (raw === null || raw <= 0) {
      setCombinedLtv(null);
      return;
    }
    const percent = clampCombinedLtv(raw);
    const dealType = dealTypeForCombinedLtv(percent, property.dealType);
    setCombinedLtv(percent);
    setTotalAmount(mortgageForLtvPercent(property.propertyValue, percent, dealType), dealType);
  };

  const addTrack = () => {
    if (!canAddTrack) return;

    const nextTrack = createTrack({
      ...(editingId ? { id: editingId } : {}),
      type: form.type,
      amount: formAmount,
      years: form.years,
      amortizationType: form.amortizationType,
      interestRate: form.interestRate,
      variablePeriod: form.type.includes('variable') ? form.variablePeriod : undefined,
    });
    const candidate = editingId
      ? tracks.map((track) => (track.id === editingId ? nextTrack : track))
      : [...tracks, nextTrack];

    // מסלול שמעלה את ההחזר מעל התקרה שנקבעה ללקוח אינו נוסף לתמהיל
    const cap = property.maxMonthlyPayment;
    const payment = paymentOf(candidate);
    if (cap > 0 && payment > cap + 1) {
      setNotice(
        `המסלול הזה מעלה את ההחזר החודשי ל-${formatShekel(payment)} וחורג מתקרת ההחזר שנקבעה — ` +
          `${formatShekel(cap)}. פרסו את המסלול לתקופה ארוכה יותר או הקטינו את הסכום שבו.`
      );
      return;
    }

    setTracks(candidate);
    setNotice(null);
    setEditingId(null);
    setJustSavedId(nextTrack.id);
    window.setTimeout(
      () => setJustSavedId((current) => (current === nextTrack.id ? null : current)),
      1400
    );
    setForm(emptyForm(form.type === 'fixed_unlinked' ? 'prime' : 'fixed_unlinked'));
  };

  const beginEdit = (track: MortgageTrack) => {
    setNotice(null);
    setEditingId(track.id);
    setForm({
      type: track.type,
      amount: track.amount,
      years: track.years,
      amortizationType: track.amortizationType || 'spitzer',
      interestRate: track.interestRate,
      variablePeriod: track.variablePeriod ?? 5,
      rateTouched: true,
      amountTouched: true,
    });
  };

  const cancelEdit = () => {
    setNotice(null);
    setEditingId(null);
    setForm(emptyForm(form.type === 'fixed_unlinked' ? 'prime' : 'fixed_unlinked'));
  };

  const removeTrack = (id: string) => {
    setNotice(null);
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm());
    }
    setTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const complete = () => {
    const trimmed = name.trim();
    if (!trimmed || !covered || !fixedShareOk || overPayment) return;
    if (
      mixNameExistsForProperty(
        trimmed,
        { propertyAddress: property.propertyAddress, totalAmount },
        existingMixes
      )
    ) {
      setNameError('כבר קיים תמהיל בשם הזה לנכס זה. בחרו שם ייחודי כדי להמשיך.');
      return;
    }
    setNameError(null);
    onComplete(
      normalizeMix(
        createEmptyMix({
          name: trimmed,
          totalAmount,
          tracks,
          propertyValue: property.propertyValue,
          dealType: property.dealType,
          propertyAddress: property.propertyAddress.trim() || undefined,
          maxMonthlyPayment: property.maxMonthlyPayment || undefined,
          assumptions: mixAssumptions,
        })
      )
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onBack}>
          <ArrowRight className="h-4 w-4 ml-1" />
          חזרה
        </Button>
        <h1 className="text-lg font-bold text-slate-900">תמהיל חדש</h1>
      </div>

      {/* שלב 1 — הנכס והעסקה. בכלי עצמו נשאר; מתהליך חמשת השלבים מדלגים כי הנתונים כבר הוזנו */}
      {!skipPropertyStep && (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          {propertyConfirmed ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <Check className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">
                  {DEAL_TYPES[property.dealType]}
                  {property.propertyAddress.trim() && ` · ${property.propertyAddress.trim()}`}
                </p>
                <p className="text-sm font-bold text-slate-900 break-words">
                  משכנתא {formatShekel(totalAmount)} · נכס {formatShekel(property.propertyValue)} · הון
                  עצמי {formatShekel(equity)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPropertyConfirmed(false)}
              >
                <Pencil className="h-3.5 w-3.5 ml-1" />
                שנה
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                  1
                </span>
                <Label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Home className="h-4 w-4 text-blue-600" />
                  הנכס והעסקה
                </Label>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  עלות הנכס (₪) <span className="text-red-500">*</span>
                </Label>
                <FormattedNumberValueInput
                  className="h-10 text-base font-semibold w-full sm:w-56"
                  autoFocus
                  placeholder="לדוגמה 2,000,000"
                  value={property.propertyValue || ''}
                  onValueChange={(propertyValue) => {
                    const next: Partial<PropertySetup> = { propertyValue };
                    if (combinedLtv !== null) {
                      const dealType = dealTypeForCombinedLtv(combinedLtv, property.dealType);
                      next.dealType = dealType;
                      next.totalAmount = mortgageForLtvPercent(propertyValue, combinedLtv, dealType);
                      setAmountTouched(true);
                    } else if (!amountTouched) {
                      next.totalAmount = mortgageFromEquity(
                        propertyValue,
                        seedEquity,
                        property.dealType
                      );
                    }
                    patchProperty(next);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  גובה המשכנתא (₪) <span className="text-red-500">*</span>
                </Label>
                <FormattedNumberValueInput
                  className="h-10 text-base font-semibold w-full sm:w-56"
                  placeholder="לדוגמה 1,200,000"
                  value={totalAmount || ''}
                  onValueChange={(value) => {
                    setCombinedLtv(null);
                    setTotalAmount(value);
                  }}
                />
                <p className="text-[11px] text-slate-500">
                  מימון מקסימלי לפי מגבלות בנק ישראל — לחיצה קובעת את סוג העסקה ואת הסכום:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DEAL_TYPE_KEYS.map((key) => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={combinedLtv === null && property.dealType === key ? 'default' : 'outline'}
                      className="h-8 text-[11px]"
                      disabled={property.propertyValue <= 0}
                      onClick={() => applyMaxFinancing(key)}
                    >
                      {DEAL_TYPES[key]} · {MAX_LTV_PERCENT[key]}%
                    </Button>
                  ))}
                </div>
                <div
                  className={`rounded-xl border p-3 space-y-2 ${
                    combinedLtv !== null ? 'border-blue-400 bg-blue-50/70' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <Label className="text-xs font-semibold text-slate-800">מצב משולב — אחוז מימון ידני</Label>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    הזינו כל אחוז בין {COMBINED_LTV_MIN} ל-{COMBINED_LTV_MAX}. סכום המשכנתא, ההון העצמי
                    ואחוז המימון יחושבו לפי האחוז שהוזן, בתוך מגבלות בנק ישראל.
                  </p>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold"
                      integer
                      max={COMBINED_LTV_MAX}
                      value={combinedLtv}
                      onChange={applyCombinedLtv}
                      placeholder="60"
                    />
                    <span className="text-sm font-bold text-slate-600">%</span>
                    {combinedLtv !== null && property.propertyValue > 0 && (
                      <span className="text-[11px] text-slate-600">
                        משכנתא {formatShekel(totalAmount)} · הון עצמי {formatShekel(equity)}
                      </span>
                    )}
                  </div>
                </div>

                {property.propertyValue > 0 && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <MiniStat label="הון עצמי" value={formatShekel(equity)} />
                    <MiniStat
                      label="אחוז מימון"
                      value={`${((totalAmount / property.propertyValue) * 100 || 0).toFixed(1)}%`}
                      tone={overFinanced ? 'danger' : 'default'}
                    />
                    <MiniStat
                      label={`מקסימום ל${DEAL_TYPES[property.dealType]}`}
                      value={formatShekel(maxMortgage)}
                    />
                  </div>
                )}

                {overFinanced && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-800 leading-relaxed">
                      המימון המקסימלי ל{DEAL_TYPES[property.dealType]} הוא {ltvLimit}% משווי הנכס —
                      עד {formatShekel(maxMortgage)}. עליך להגדיל את ההון העצמי או להקטין את
                      המשכנתא.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  החזר חודשי מקסימלי (₪) <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  <FormattedNumberValueInput
                    className="h-10 w-full sm:w-56"
                    placeholder="לדוגמה 7,500"
                    value={property.maxMonthlyPayment || ''}
                    onValueChange={(maxMonthlyPayment) => patchProperty({ maxMonthlyPayment })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={() => setShowMaxPayment(true)}
                  >
                    <Calculator className="h-4 w-4 ml-1" />
                    חשב החזר מקסימלי
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {initialProperty?.maxMonthlyPayment
                    ? 'מחושב אוטומטית כ-40% מההכנסה הפנויה של היחיד או מסכום ההכנסות הפנויות של הזוג. אפשר לערוך.'
                    : 'החישוב נעשה לפי נתוני הלקוח — הכנסות, גיל וניתוח ההלוואות הקיימות.'}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  כתובת הנכס (אופציונלי)
                </Label>
                <div className="w-full sm:w-80">
                  <AddressAutocomplete
                    className="h-10"
                    placeholder="התחילו להקליד רחוב או עיר"
                    value={property.propertyAddress}
                    onChange={(propertyAddress) => patchProperty({ propertyAddress })}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  ההשלמה מתבססת על מרשם הכתובות בישראל. תמהילים שיוזנו לאותה כתובת יוצגו ויושוו
                  יחד; בלי כתובת, התמהילים מקובצים לפי סכום המשכנתא.
                </p>
              </div>

              <Button
                className="h-10"
                disabled={!propertyReady}
                onClick={() => setPropertyConfirmed(true)}
              >
                המשך למסלולים
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* שלב 2 — מסלולים, אחד אחרי השני, עד שכל הסכום מכוסה */}
      {propertyConfirmed && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {skipPropertyStep && (
              <p className="text-xs text-slate-500">
                {DEAL_TYPES[property.dealType]}
                {property.propertyAddress.trim() && ` · ${property.propertyAddress.trim()}`}
                {' · '}
                משכנתא {formatShekel(totalAmount)} · נכס {formatShekel(property.propertyValue)}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                {skipPropertyStep ? 1 : 2}
              </span>
              <Label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-600" />
                מסלולי התמהיל
              </Label>
            </div>

            {tracks.length > 0 && (
              <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                <p className="text-[11px] font-semibold text-emerald-800">מסלולים שנשמרו לתמהיל</p>
                <AnimatePresence initial={false}>
                  {tracks.map((track, index) => {
                    const editing = track.id === editingId;
                    const justSaved = track.id === justSavedId;
                    return (
                      <motion.div
                        key={track.id}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{
                          opacity: editing ? 0.55 : 1,
                          y: 0,
                          scale: justSaved ? 1.02 : 1,
                        }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                          editing
                            ? 'border-dashed border-blue-300 bg-blue-50/80'
                            : justSaved
                              ? 'border-emerald-400 bg-white shadow-md ring-2 ring-emerald-200'
                              : 'border-emerald-100 bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => beginEdit(track)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-right"
                          title="לחצו לעריכת המסלול"
                        >
                          <span
                            className="h-8 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: trackColor(track.type) }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-800">
                              מסלול {index + 1} · {TRACK_TYPES[track.type]}
                              {editing && (
                                <span className="mr-1.5 text-[10px] font-medium text-blue-700">
                                  בעריכה
                                </span>
                              )}
                              {justSaved && !editing && (
                                <span className="mr-1.5 text-[10px] font-medium text-emerald-700">
                                  נשמר
                                </span>
                              )}
                            </p>
                            <p className="truncate text-[10px] text-slate-500">
                              {formatShekel(track.amount)} ·{' '}
                              {totalAmount > 0 ? ((track.amount / totalAmount) * 100).toFixed(1) : '0'}
                              % · {formatDuration(Math.round(track.years * 12))} ·{' '}
                              {track.interestRate.toFixed(2)}% ·{' '}
                              {AMORTIZATION_TYPES[track.amortizationType || 'spitzer']}
                            </p>
                          </div>
                          <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTrack(track.id)}
                          title="מחיקת מסלול — הסכום הפנוי יתעדכן"
                          className="shrink-0 text-slate-400 transition-colors hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {tracks.length > 0 && monthlyPayment > 0 && (
              <p className="text-[11px] text-slate-500 leading-snug">
                החזר חודשי {formatShekel(monthlyPayment)}
                {tracks.some((t) => usesForwardPricedRate(t.type)) ? ` · ${CURRENT_RATE_PAYMENT_NOTE}` : ''}
              </p>
            )}
            {tracks.length > 0 && <ForecastDisclaimer mix={{ tracks }} compact />}

            {covered ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-[11px] text-emerald-800">
                    כל סכום המשכנתא מחולק בין {tracks.length} מסלולים. אפשר לתת שם לתמהיל, או ללחוץ
                    על מסלול כדי לערוך אותו.
                  </p>
                </div>
                {!fixedShareOk && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      דרישת בנק ישראל: לפחות {MIN_FIXED_PERCENT}% מהמשכנתא בריבית קבועה —{' '}
                      {formatShekel(minFixedAmount(totalAmount))}. הקבועה הצמודה והלא צמודה
                      נספרות יחד. חסרים עוד{' '}
                      <strong>{formatShekel(minFixedAmount(totalAmount) - fixedAmount(tracks))}</strong>{' '}
                      — הוסיפו או הגדילו מסלול קבוע כדי להשלים.
                    </p>
                  </div>
                )}
                {overPayment && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-800 leading-relaxed">
                      ההחזר החודשי של התמהיל הוא {formatShekel(monthlyPayment)} וחורג מתקרת ההחזר
                      שנקבעה ללקוח — {formatShekel(property.maxMonthlyPayment)}. הסירו מסלול ופרסו
                      אותו לתקופה ארוכה יותר כדי להמשיך.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <span className="text-[11px] text-amber-800">
                    {editingId ? 'סכום זמין למסלול זה' : 'נותר למימון'}
                  </span>
                  <span className="text-sm font-bold text-amber-900">{formatShekel(remaining)}</span>
                </div>

                <div className="rounded-xl border-2 border-blue-400 bg-white p-3 space-y-3 shadow-md ring-2 ring-blue-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-blue-900">
                      {editingId ? 'עריכת מסלול שמור' : `מסלול ${tracks.length + 1} — בעריכה`}
                    </p>
                    {editingId && (
                      <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={cancelEdit}>
                        ביטול עריכה
                      </Button>
                    )}
                  </div>
                  {editingId && (
                    <p className="text-[11px] text-blue-700">
                      המסלול הקודם נשמר. השינויים כאן יחליפו אותו, והסכום שנותר למימון מתעדכן לפי
                      העריכה.
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">לוח סילוקין</Label>
                      <Select
                        value={form.amortizationType}
                        onValueChange={(value) =>
                          patchForm({ amortizationType: value as TrackForm['amortizationType'] })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(AMORTIZATION_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">סוג הריבית</Label>
                      <Select value={form.type} onValueChange={(value) => changeType(value as TrackType)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRACK_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">סכום במסלול</Label>
                      <AmountAndPercent
                        amount={formAmount}
                        totalAmount={totalAmount}
                        onChange={commitAmount}
                      />
                      {isFixedTrackType(form.type) && missingFixed > 0 && (
                        <p className="text-[11px] text-amber-700">
                          חסרים {formatShekel(missingFixed)} בריבית קבועה כדי להגיע ל-
                          {MIN_FIXED_PERCENT}% שבנק ישראל דורש. אפשר להשלים במסלול הזה או במסלול
                          קבוע נוסף — צמוד או לא צמוד.
                        </p>
                      )}
                      {notice && (
                        <p className="flex items-start gap-1.5 text-[11px] text-red-700">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          {notice}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <TermMonthsSlider
                        label="תקופה"
                        icon={<CalendarClock className="h-3.5 w-3.5 text-violet-600" />}
                        years={form.years}
                        onChange={(years) => patchForm({ years })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">ריבית שנתית (%)</Label>
                      <NumericInput
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        value={form.interestRate}
                        onChange={(interestRate) =>
                          patchForm({
                            interestRate: interestRate ?? 0,
                            rateTouched: true,
                          })
                        }
                      />
                    </div>

                    {form.type.includes('variable') && (
                      <div className="space-y-1">
                        <Label className="text-xs">תחנת יציאה / עדכון ריבית</Label>
                        <Select
                          value={String(form.variablePeriod)}
                          onValueChange={(value) => patchForm({ variablePeriod: Number(value) })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(VARIABLE_PERIODS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>כל {label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {form.type === 'prime' && primePreviewPoints.length >= 2 && (
                      <div className="sm:col-span-2">
                        <PrimeForwardChart
                          previewPoints={primePreviewPoints}
                          quotedRate={form.interestRate}
                          height={180}
                        />
                      </div>
                    )}

                    {form.type === 'variable_unlinked' && variablePreviewPoints.length >= 2 && (
                      <div className="sm:col-span-2">
                        <VariableForwardChart
                          previewPoints={variablePreviewPoints}
                          quotedRate={form.interestRate}
                          height={180}
                        />
                      </div>
                    )}

                    {isIndexLinked(form.type) && (
                      <div className="sm:col-span-2">
                        <InflationForecastChart
                          assumptions={mixAssumptions}
                          years={form.years}
                          height={180}
                        />
                      </div>
                    )}
                  </div>

                  <Button className="h-9 w-full sm:w-auto" disabled={!canAddTrack} onClick={addTrack}>
                    <Plus className="h-4 w-4 ml-1" />
                    {editingId ? 'שמור שינויים במסלול' : 'הוסף מסלול'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* שלב 3 — שם התמהיל */}
      {covered && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                {skipPropertyStep ? 2 : 3}
              </span>
              <Label className="text-sm font-semibold text-slate-800">שם התמהיל</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                className="h-10 w-full sm:w-72"
                autoFocus
                placeholder="לדוגמה: תמהיל מאוזן 30/30/40"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') complete();
                }}
              />
              <Button
                className="h-10"
                disabled={!name.trim() || !fixedShareOk || overPayment}
                onClick={complete}
              >
                <Check className="h-4 w-4 ml-1" />
                צור תמהיל
              </Button>
            </div>
            {nameError && (
              <p className="flex items-start gap-1.5 text-[11px] text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {nameError}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <MaxPaymentDialog
        open={showMaxPayment}
        dealType={property.dealType}
        equity={equity}
        onClose={() => setShowMaxPayment(false)}
        onConfirm={(maxMonthlyPayment) => patchProperty({ maxMonthlyPayment })}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <p className="text-[10px] text-slate-400 flex items-center gap-1">
        <Wallet className="h-3 w-3" />
        {label}
      </p>
      <p className={`text-xs font-bold ${tone === 'danger' ? 'text-red-600' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  );
}
