'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  FileText,
  Landmark,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react';
import {
  EMPLOYMENT_LABELS,
  PLAN_BANKS,
  REPAYMENT_RATIO_LIMIT,
  UNIFORM_BASKETS,
  analyzeProfile,
  basketIsFilled,
  basketRate,
  emptyBasket,
  preApprovalAmount,
  preApprovalDocumentGroups,
  preApprovalDocuments,
  preApprovalRequirements,
} from '@/lib/mortgage-plan';
import type {
  DocumentGroup,
  PlanData,
  PreApprovalBasket,
  PreApprovalData,
  UniformBasket,
} from '@/lib/mortgage-plan';
import { DEAL_TYPES, MAX_LTV_PERCENT, TRACK_TYPES } from '@/components/mortgage-advisor/types';
import { computeMix, createTrack, createWorkspaceMix } from '@/components/mortgage-advisor/engine';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import {
  DateField,
  EmptyHint,
  Metric,
  NumberField,
  Panel,
  TextField,
  formatPercent,
  formatShekel,
} from '../ui';

function basketOf(value: PreApprovalData, basketId: string): PreApprovalBasket {
  return value.baskets.find((basket) => basket.basketId === basketId) ?? emptyBasket(basketId);
}

/**
 * התמהיל שנגזר מסל אחיד: אותו הרכב מסלולים בדיוק, עם הריביות שהבנק נקב
 * באישור העקרוני. מזהה התמהיל נשמר בסל, כך ששמירה חוזרת מעדכנת את אותה רשומה
 * ולא יוצרת כפילות ברשימת התמהילים.
 */
function basketMix(
  uniform: UniformBasket,
  basket: PreApprovalBasket,
  data: PlanData
): WorkspaceMix | null {
  const amount = preApprovalAmount(data) ?? 0;
  if (amount <= 0) return null;

  const profile = data.ANALYSIS;
  const tracks = uniform.tracks.map((track) =>
    createTrack({
      type: track.type,
      amount: amount * track.share,
      years: profile.years,
      interestRate: basketRate(basket, track),
      variablePeriod: track.variablePeriod,
    })
  );

  const bank = data.APPLICATIONS.bank;
  return createWorkspaceMix({
    ...(basket.mixKey ? { id: basket.mixKey } : {}),
    name: bank ? `${uniform.shortName} · אישור עקרוני ${bank}` : uniform.shortName,
    totalAmount: amount,
    tracks,
    notes: uniform.description,
    propertyValue: profile.propertyValue ?? undefined,
    propertyAddress: profile.propertyAddress.trim() || undefined,
    dealType: profile.dealType ?? undefined,
  });
}

/**
 * המספרים של הסל מחושבים בכל שינוי ריבית ונשמרים בשלב, כדי ששלב המכרז יוכל
 * להשוות כל הצעה מול מה שהבנק כבר נתן — גם לפני שהסלים נשמרו כתמהילים.
 */
function priced(
  uniform: UniformBasket,
  basket: PreApprovalBasket,
  data: PlanData
): PreApprovalBasket {
  const mix = basketIsFilled(basket, uniform) ? basketMix(uniform, basket, data) : null;
  if (!mix) return { ...basket, monthlyPayment: null, averageRate: null, totalPaid: null };

  const summary = computeMix(mix).summary;
  return {
    ...basket,
    monthlyPayment: summary.monthlyPayment,
    averageRate: summary.averageRate,
    totalPaid: summary.totalPaid,
  };
}

/** רשימת מסמכים של לווה אחד או של משק הבית, עם סימון מה כבר נאסף */
function DocumentList({
  group,
  collectedKeys,
  onToggle,
  twoColumns = false,
}: {
  group: DocumentGroup;
  collectedKeys: Record<string, boolean>;
  onToggle: (key: string) => void;
  twoColumns?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {group.id === 'shared' ? (
          <FileText className="h-4 w-4 text-slate-400" />
        ) : (
          <Briefcase className="h-4 w-4 text-blue-500" />
        )}
        <h4 className="text-sm font-black text-slate-900">{group.title}</h4>
        {group.subtitle && (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-black text-blue-700">
            {group.subtitle}
          </span>
        )}
      </div>

      {group.documents.length === 0 ? (
        <EmptyHint>בחרו בשלב הפרופיל אם הלווה שכיר או עצמאי — הרשימה תיבנה בהתאם.</EmptyHint>
      ) : (
        <div className={`grid gap-2 ${twoColumns ? 'md:grid-cols-2' : ''}`}>
          {group.documents.map((doc) => {
            const done = Boolean(collectedKeys[doc.key]);
            return (
              <button
                key={doc.key}
                type="button"
                onClick={() => onToggle(doc.key)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-right transition-all ${
                  done
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                  }`}
                >
                  {done && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-semibold ${
                      done ? 'text-emerald-900' : 'text-slate-800'
                    }`}
                  >
                    {doc.name}
                  </span>
                  {doc.required === false && (
                    <span className="text-[10px] font-bold text-slate-400">
                      נדרש רק בחלק מהמקרים
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** שורת נתון מהפרופיל. ערך חסר מסומן, כי בלעדיו הבנק לא יקלוט את הבקשה */
function Row({ label, value, missing }: { label: string; value: ReactNode; missing?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      {missing ? (
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-black text-amber-700">
          חסר
        </span>
      ) : (
        <span className="text-sm font-black tabular-nums text-slate-900">{value}</span>
      )}
    </div>
  );
}

export function PreApprovalStage({
  data,
  onChange,
  onGoToProfile,
}: {
  data: PlanData;
  onChange: (next: PreApprovalData) => void;
  onGoToProfile: () => void;
}) {
  const value = data.APPLICATIONS;
  const profile = data.ANALYSIS;
  const analysis = analyzeProfile(profile);
  const { save } = useSavedMixes();
  const [saving, setSaving] = useState(false);

  const couple = profile.household === 'COUPLE';
  const requirements = preApprovalRequirements(data);
  const missing = new Set(requirements.filter((item) => !item.ok).map((item) => item.key));

  const documentGroups = preApprovalDocumentGroups(data);
  const sharedGroup = documentGroups.find((group) => group.id === 'shared');
  const personalGroups = documentGroups.filter((group) => group.id !== 'shared');
  const allDocuments = preApprovalDocuments(data);
  const collected = allDocuments.filter((doc) => value.documents[doc.key]).length;
  const requiredOpen = allDocuments.filter(
    (doc) => doc.required !== false && !value.documents[doc.key]
  ).length;

  const amount = preApprovalAmount(data);
  const maxLtv = MAX_LTV_PERCENT[profile.dealType ?? 'first_home'];

  const update = (patch: Partial<PreApprovalData>) => {
    const next = { ...value, ...patch };
    const withPatch: PlanData = { ...data, APPLICATIONS: next };
    onChange({
      ...next,
      baskets: UNIFORM_BASKETS.map((uniform) =>
        priced(uniform, basketOf(next, uniform.id), withPatch)
      ),
    });
  };

  const setRate = (uniform: UniformBasket, trackType: string, rate: number | null) => {
    const current = basketOf(value, uniform.id);
    const rates = { ...current.rates };
    if (rate === null) delete rates[trackType];
    else rates[trackType] = rate;

    const next = priced(uniform, { ...current, rates }, data);
    onChange({
      ...value,
      baskets: UNIFORM_BASKETS.map((entry) =>
        entry.id === uniform.id ? next : basketOf(value, entry.id)
      ),
    });
  };

  const toggleDocument = (key: string) => {
    const documents = { ...value.documents };
    if (documents[key]) delete documents[key];
    else documents[key] = true;
    onChange({ ...value, documents });
  };

  /** שמירת הסלים כתמהילים, כדי שיחכו מוכנים בשלב בניית התמהיל */
  const saveBaskets = async () => {
    setSaving(true);
    try {
      const stored: PreApprovalBasket[] = [];
      for (const uniform of UNIFORM_BASKETS) {
        const basket = priced(uniform, basketOf(value, uniform.id), data);
        const mix = basketIsFilled(basket, uniform) ? basketMix(uniform, basket, data) : null;
        if (!mix) {
          stored.push(basket);
          continue;
        }
        const saved = await save(mix);
        stored.push({ ...basket, mixKey: saved.mix.id, mixRecordId: saved.recordId ?? null });
      }
      onChange({ ...value, baskets: stored });
    } finally {
      setSaving(false);
    }
  };

  const filledBaskets = UNIFORM_BASKETS.filter((uniform) =>
    basketIsFilled(basketOf(value, uniform.id), uniform)
  ).length;
  const savedBaskets = UNIFORM_BASKETS.filter((uniform) => basketOf(value, uniform.id).mixKey).length;

  const goToProfile = (
    <button
      type="button"
      onClick={onGoToProfile}
      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black text-white transition-colors hover:bg-slate-700"
    >
      עריכה בפרופיל
      <ArrowLeft className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="space-y-5">
      <Panel
        title="פרופיל הלקוח"
        description="הנתונים שהזנתם בשלב הפרופיל הפיננסי, כפי שהם יוגשו לבנק. כל שינוי נעשה שם ומתעדכן כאן."
        action={goToProfile}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <h4 className="text-sm font-black text-slate-900">{couple ? 'לווה 1' : 'הלווה'}</h4>
            </div>
            <Row label="גיל" value={profile.age} missing={missing.has('age')} />
            <Row
              label="הכנסה חודשית נטו"
              value={formatShekel(profile.income)}
              missing={missing.has('income')}
            />
            <Row
              label="אופן העסקה"
              value={profile.employmentType ? EMPLOYMENT_LABELS[profile.employmentType] : '—'}
              missing={missing.has('employmentType')}
            />
          </div>

          {couple && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-black text-slate-900">לווה 2</h4>
              </div>
              <Row label="גיל" value={profile.partnerAge} missing={missing.has('partnerAge')} />
              <Row
                label="הכנסה חודשית נטו"
                value={formatShekel(profile.partnerIncome)}
                missing={missing.has('partnerIncome')}
              />
              <Row
                label="אופן העסקה"
                value={
                  profile.partnerEmploymentType
                    ? EMPLOYMENT_LABELS[profile.partnerEmploymentType]
                    : '—'
                }
                missing={missing.has('partnerEmploymentType')}
              />
            </div>
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Metric label="הכנסה חודשית כוללת" value={formatShekel(analysis.totalIncome)} />
          <Metric
            label="החזר על הלוואות קיימות"
            value={formatShekel(profile.existingLoans ?? 0)}
            tone={(profile.existingLoans ?? 0) > 0 ? 'warn' : 'good'}
          />
          <Metric
            label="יחס החזר משוער"
            value={formatPercent(analysis.repaymentRatio)}
            note={`הגבול של הבנקים: ${REPAYMENT_RATIO_LIMIT}%`}
            tone={analysis.ratioOk ? 'good' : 'bad'}
          />
        </div>

        {(profile.futureLumpSums.length > 0 || profile.futureMonthlyIncrease) && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <h4 className="mb-2 text-xs font-black text-slate-700">הכנסות עתידיות שהצהרתם עליהן</h4>
            {profile.futureLumpSums.map((item) => (
              <Row
                key={item.id}
                label={item.label || 'הכנסה חד-פעמית'}
                value={`${formatShekel(item.amount)}${item.inYears ? ` · בעוד ${item.inYears} שנים` : ''}`}
              />
            ))}
            {profile.futureMonthlyIncrease ? (
              <Row
                label="תוספת חודשית צפויה להכנסה הפנויה"
                value={`${formatShekel(profile.futureMonthlyIncrease)}${
                  profile.futureMonthlyIncreaseInYears
                    ? ` · בעוד ${profile.futureMonthlyIncreaseInYears} שנים`
                    : ''
                }`}
              />
            ) : null}
          </div>
        )}
      </Panel>

      <Panel
        title="פרופיל העסקה"
        description="הנכס וסכום המשכנתא כפי שהוזנו בשלב הפרופיל. זה הבסיס לבקשה ולחישוב הסלים האחידים."
        action={goToProfile}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Row
              label="סוג העסקה"
              value={profile.dealType ? DEAL_TYPES[profile.dealType] : '—'}
              missing={missing.has('dealType')}
            />
            <Row
              label="מחיר הנכס"
              value={formatShekel(profile.propertyValue)}
              missing={missing.has('propertyValue')}
            />
            <Row label="כתובת הנכס" value={profile.propertyAddress.trim() || 'טרם נבחר נכס'} />
            <Row
              label="הון עצמי"
              value={formatShekel(profile.equity)}
              missing={missing.has('equity')}
            />
            <Row label="תקופה מבוקשת" value={`${profile.years} שנים`} />
          </div>

          <div className="grid content-start gap-3">
            <Metric
              label="סכום המשכנתא המבוקש"
              value={formatShekel(amount)}
              note={
                value.approvedAmount
                  ? 'לפי הסכום שאושר בפועל'
                  : profile.mortgageAmount
                    ? 'כפי שביקשתם בפרופיל'
                    : 'מחיר הנכס בניכוי ההון העצמי'
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric
                label="אחוז מימון"
                value={formatPercent(analysis.ltv)}
                note={`תקרה: ${maxLtv}%`}
                tone={analysis.ltvOk ? 'good' : 'bad'}
              />
              <Metric
                label="החזר חודשי משוער"
                value={formatShekel(analysis.estimatedMonthlyPayment || null)}
              />
            </div>
          </div>
        </div>

        {analysis.equityGap > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            חסרים {formatShekel(analysis.equityGap)} בהון העצמי כדי לעמוד בתקרת המימון של {maxLtv}%.
            הבנק לא יאשר את הבקשה בסכום הזה לפני שהפער נסגר.
          </p>
        )}
      </Panel>

      <Panel
        title="תיק המסמכים לאישור עקרוני"
        description="הרשימה נבנית לפי אופן ההעסקה של כל לווה. סמנו מה כבר אספתם — מסמך חסר הוא הסיבה הנפוצה ביותר לעיכוב בבקשה."
        action={
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
            {collected} / {allDocuments.length}
          </span>
        }
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-500"
              animate={{
                width: `${allDocuments.length > 0 ? (collected / allDocuments.length) * 100 : 0}%`,
              }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
          <span
            className={`shrink-0 text-[11px] font-bold ${
              requiredOpen > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {requiredOpen > 0 ? `${requiredOpen} מסמכי חובה חסרים` : 'כל מסמכי החובה נאספו'}
          </span>
        </div>

        <div className="space-y-5">
          {sharedGroup && (
            <DocumentList
              group={sharedGroup}
              collectedKeys={value.documents}
              onToggle={toggleDocument}
              twoColumns
            />
          )}

          <div className={`grid gap-5 ${personalGroups.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {personalGroups.map((group) => (
              <DocumentList
                key={group.id}
                group={group}
                collectedKeys={value.documents}
                onToggle={toggleDocument}
              />
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title="הבנק שאליו מוגשת הבקשה"
        description="הבקשה לאישור עקרוני מוגשת לבנק אחד. הריביות שתקבלו ממנו הן נקודת הפתיחה למכרז מול שאר הבנקים."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {PLAN_BANKS.map((bank) => {
            const selected = value.bank === bank;
            return (
              <button
                key={bank}
                type="button"
                onClick={() => update({ bank: selected ? null : bank })}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                  selected
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-emerald-400 hover:text-emerald-700 hover:shadow-sm'
                }`}
              >
                {selected ? <Check className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                {bank}
              </button>
            );
          })}
        </div>

        {value.bank ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField
              label="תאריך ההגשה"
              value={value.submittedAt}
              onChange={(next) => onChange({ ...value, submittedAt: next })}
            />
            <TextField
              label="הבנקאי שמטפל בבקשה"
              value={value.note}
              onChange={(next) => onChange({ ...value, note: next })}
              placeholder="שם, סניף, טלפון…"
            />
          </div>
        ) : (
          <EmptyHint>בחרו את הבנק שאליו תגישו את הבקשה לאישור עקרוני.</EmptyHint>
        )}
      </Panel>

      <Panel
        title="האישור העקרוני"
        description="השלב נסגר כשהאישור בידכם. מכאן ואילך יש לכם סכום מאושר ותוקף — ואפשר לצאת להתמחרות."
      >
        <button
          type="button"
          onClick={() => update({ approved: !value.approved })}
          className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-right transition-all ${
            value.approved
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-200 bg-white hover:border-emerald-300'
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              value.approved ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-slate-900">
              {value.approved ? 'האישור העקרוני התקבל' : 'קיבלתי אישור עקרוני'}
            </span>
            <span className="block text-xs text-slate-500">
              {value.approved
                ? 'הזינו את הריביות שקיבלתם לשלושת הסלים האחידים למטה'
                : 'סמנו כאן ברגע שהבנק אישר את הבקשה'}
            </span>
          </span>
        </button>

        {value.approved && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberField
              label="הסכום שאושר"
              hint="אם הבנק אישר סכום אחר מהמבוקש — הסלים האחידים יחושבו לפי מה שאושר."
              value={value.approvedAmount}
              onChange={(next) => update({ approvedAmount: next })}
              suffix="₪"
            />
            <DateField
              label="תוקף האישור"
              value={value.validUntil}
              onChange={(next) => onChange({ ...value, validUntil: next })}
            />
          </div>
        )}

        {value.approved &&
          value.approvedAmount !== null &&
          value.approvedAmount < analysis.requiredLoan && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              הבנק אישר {formatShekel(value.approvedAmount)} מתוך{' '}
              {formatShekel(analysis.requiredLoan)} שנדרשים לעסקה. כדאי לבדוק מה חוסם — הון עצמי,
              יחס החזר או הלוואות קיימות — לפני שממשיכים.
            </p>
          )}
      </Panel>

      {value.approved && (
        <Panel
          title="הריביות שקיבלתם לסלים האחידים"
          description="שלושת הסלים האחידים הם ההרכב שכל בנק מחויב להציע. הזינו לכל מסלול את הריבית שנקובה באישור העקרוני — משם הם ממשיכים כתמהילים שמורים לשלב בניית התמהיל."
          action={
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
              {filledBaskets} / {UNIFORM_BASKETS.length}
            </span>
          }
        >
          {(amount ?? 0) <= 0 ? (
            <EmptyHint>
              בלי מחיר נכס והון עצמי בפרופיל אין סכום משכנתא — ולכן אי אפשר לחשב את הסלים.
            </EmptyHint>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                {UNIFORM_BASKETS.map((uniform) => {
                  const basket = basketOf(value, uniform.id);
                  const filled = basketIsFilled(basket, uniform);

                  return (
                    <div
                      key={uniform.id}
                      className={`rounded-2xl border-2 p-4 transition-colors ${
                        filled ? 'border-violet-300 bg-violet-50/40' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-violet-500" />
                        <h4 className="text-sm font-black text-slate-900">{uniform.name}</h4>
                      </div>
                      <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                        {uniform.description}
                      </p>

                      <div className="space-y-2.5">
                        {uniform.tracks.map((track) => (
                          <label key={track.type} className="block">
                            <span className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                              <span>{TRACK_TYPES[track.type]}</span>
                              <span className="tabular-nums text-slate-400">
                                {formatShekel((amount ?? 0) * track.share)}
                              </span>
                            </span>
                            <div className="relative">
                              <input
                                dir="ltr"
                                inputMode="decimal"
                                placeholder={String(basketRate(null, track))}
                                value={
                                  basket.rates[track.type] === undefined
                                    ? ''
                                    : String(basket.rates[track.type])
                                }
                                onChange={(event) => {
                                  const clean = event.target.value.replace(/[^\d.]/g, '');
                                  setRate(uniform, track.type, clean === '' ? null : Number(clean));
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pl-7 text-right text-sm font-semibold text-slate-900 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                              />
                              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                %
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400">החזר חודשי</div>
                          <div className="text-sm font-black tabular-nums text-slate-900">
                            {formatShekel(basket.monthlyPayment)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400">סך התשלומים</div>
                          <div className="text-sm font-black tabular-nums text-slate-900">
                            {formatShekel(basket.totalPaid)}
                          </div>
                        </div>
                      </div>

                      {basket.mixKey && (
                        <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <Check className="h-3 w-3" />
                          שמור כתמהיל
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {savedBaskets > 0
                    ? `${savedBaskets} סלים שמורים כתמהילים ויחכו לכם בשלב בניית התמהיל.`
                    : 'שמירת הסלים מעבירה אותם לרשימת התמהילים שלכם, עם כל פרטי העסקה.'}
                </p>
                <button
                  type="button"
                  disabled={filledBaskets === 0 || saving}
                  onClick={() => void saveBaskets()}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  שמרו את הסלים כתמהילים
                </button>
              </div>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
