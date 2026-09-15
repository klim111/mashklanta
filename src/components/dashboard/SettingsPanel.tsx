'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { MORTGAGE_BANKS } from '@/components/mortgage-advisor/types';
import {
  emptyClientProfile,
  profileToJson,
} from '@/lib/client-profile';
import type { ClientProfile } from '@/lib/client-profile';
import { EMPLOYMENT_LABELS, EMPLOYMENT_TYPES, sumProfileLoans } from '@/lib/mortgage-plan';
import type { EmploymentType, ProfileLoan } from '@/lib/mortgage-plan';
import { NumberField, SegmentedField, TextField } from '@/components/plan/ui';

function newLoan(): ProfileLoan {
  return {
    id: `loan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    monthlyPayment: null,
  };
}

export function SettingsPanel() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [password, setPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/profile', { cache: 'no-store' });
      if (!response.ok) throw new Error('failed');
      setProfile(await response.json());
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את ההגדרות');
      setProfile({
        ...emptyClientProfile(),
        name: '',
        email: '',
        username: '',
      });
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready || !profile) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }

  const couple = profile.household === 'COUPLE';
  const patch = (next: Partial<ClientProfile>) => {
    setProfile((current) => {
      if (!current) return current;
      const merged = { ...current, ...next };
      const borrowerLoans = merged.borrowerLoans;
      const partnerLoans = merged.household === 'COUPLE' ? merged.partnerLoans : [];
      const total = sumProfileLoans(borrowerLoans) + sumProfileLoans(partnerLoans);
      return { ...merged, partnerLoans, existingLoans: total > 0 ? total : null };
    });
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profileToJson(profile),
          name: profile.name,
          username: profile.username,
          ...(password ? { password } : {}),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'failed');
      setProfile(body);
      setPassword('');
      setMessage('ההגדרות נשמרו בחשבון. הן ייטענו אוטומטית במשכנתא חדשה.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-black text-slate-900">הגדרות החשבון והפרופיל</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          כאן נשמרים פרטי הלווים וההון העצמי — בלי פרטי נכס. כל ערך שתשמרו ייטען כברירת מחדל
          בפתיחת משכנתא חדשה, וניתן יהיה לשנות אותו רק לאותה משכנתא.
        </p>

        <section className="mt-8 space-y-4">
          <h3 className="font-black text-slate-900">חשבון</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="שם מלא" value={profile.name} onChange={(name) => patch({ name })} />
            <TextField
              label="שם משתמש"
              value={profile.username}
              onChange={(username) => patch({ username })}
            />
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">כתובת מייל</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">סיסמה חדשה</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="השאירו ריק כדי לא לשנות"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4 border-t border-slate-100 pt-8">
          <h3 className="font-black text-slate-900">פרטי הלווים</h3>
          <div className="max-w-xs">
            <SegmentedField
              name="household"
              label="הרכב הלווים"
              value={profile.household}
              options={[
                { value: 'SINGLE', label: 'לווה יחיד' },
                { value: 'COUPLE', label: 'זוג' },
              ]}
              onChange={(household) => patch({ household })}
            />
          </div>
          {couple && (
            <div className="max-w-sm">
              <SegmentedField
                name="bankAccountMode"
                label="חשבון הבנק"
                value={profile.bankAccountMode ?? 'JOINT'}
                options={[
                  { value: 'JOINT', label: 'משותף' },
                  { value: 'SEPARATE', label: 'נפרד' },
                ]}
                onChange={(bankAccountMode) => patch({ bankAccountMode })}
              />
            </div>
          )}

          <div className={`grid gap-4 ${couple ? 'lg:grid-cols-2' : ''}`}>
            <BorrowerBlock
              title={couple ? 'לווה 1' : 'הפרטים שלי'}
              age={profile.age}
              income={profile.income}
              bank={profile.primaryBank}
              employment={profile.employmentType}
              loans={profile.borrowerLoans}
              onAge={(age) => patch({ age })}
              onIncome={(income) => patch({ income })}
              onBank={(primaryBank) => patch({ primaryBank })}
              onEmployment={(employmentType) => patch({ employmentType })}
              onLoans={(borrowerLoans) => patch({ borrowerLoans })}
            />
            {couple && (
              <BorrowerBlock
                title="לווה 2"
                age={profile.partnerAge}
                income={profile.partnerIncome}
                bank={profile.partnerPrimaryBank}
                employment={profile.partnerEmploymentType}
                loans={profile.partnerLoans}
                onAge={(partnerAge) => patch({ partnerAge })}
                onIncome={(partnerIncome) => patch({ partnerIncome })}
                onBank={(partnerPrimaryBank) => patch({ partnerPrimaryBank })}
                onEmployment={(partnerEmploymentType) => patch({ partnerEmploymentType })}
                onLoans={(partnerLoans) => patch({ partnerLoans })}
              />
            )}
          </div>
        </section>

        <section className="mt-8 space-y-4 border-t border-slate-100 pt-8">
          <h3 className="font-black text-slate-900">הון עצמי ותקופה</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              label="הון עצמי זמין לעסקה"
              value={profile.equity}
              onChange={(equity) => patch({ equity })}
              suffix="₪"
            />
            <NumberField
              label="הוצאות חודשיות"
              value={profile.expenses}
              onChange={(expenses) => patch({ expenses })}
              suffix="₪"
            />
            <NumberField
              label="תקופת משכנתא מבוקשת (שנים)"
              value={profile.years}
              onChange={(years) => patch({ years: years ?? 25 })}
            />
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            שמירת ההגדרות
          </button>
          {message && (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              {message}
            </span>
          )}
          {error && <span className="text-sm font-bold text-rose-600">{error}</span>}
        </div>
      </div>
    </div>
  );
}

function BorrowerBlock({
  title,
  age,
  income,
  bank,
  employment,
  loans,
  onAge,
  onIncome,
  onBank,
  onEmployment,
  onLoans,
}: {
  title: string;
  age: number | null;
  income: number | null;
  bank: string | null;
  employment: EmploymentType | null;
  loans: ProfileLoan[];
  onAge: (value: number | null) => void;
  onIncome: (value: number | null) => void;
  onBank: (value: string | null) => void;
  onEmployment: (value: EmploymentType) => void;
  onLoans: (loans: ProfileLoan[]) => void;
}) {
  const hasLoans = loans.length > 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <h4 className="mb-4 text-sm font-black text-slate-900">{title}</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="הכנסה חודשית נטו" value={income} onChange={onIncome} suffix="₪" />
        <NumberField label="גיל" value={age} onChange={onAge} max={90} />
      </div>
      <div className="mt-4">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">אופן ההעסקה</span>
        <div className="flex gap-2">
          {EMPLOYMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onEmployment(type)}
              className={`flex-1 rounded-xl border-2 px-3 py-2 text-xs font-bold ${
                employment === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {EMPLOYMENT_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">הבנק של החשבון הראשי</span>
        <div className="flex flex-wrap gap-1.5">
          {MORTGAGE_BANKS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onBank(bank === item ? null : item)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                bank === item
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <span className="mb-2 block text-xs font-bold text-slate-600">הלוואות מעל 18 חודשים?</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onLoans(hasLoans ? loans : [newLoan()])}
            className={`flex-1 rounded-xl border-2 py-2 text-xs font-bold ${
              hasLoans ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white'
            }`}
          >
            כן
          </button>
          <button
            type="button"
            onClick={() => onLoans([])}
            className={`flex-1 rounded-xl border-2 py-2 text-xs font-bold ${
              !hasLoans ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white'
            }`}
          >
            לא
          </button>
        </div>
        {hasLoans && (
          <div className="mt-3 space-y-2">
            {loans.map((loan, index) => (
              <NumberField
                key={loan.id}
                label={loans.length > 1 ? `הלוואה ${index + 1}` : 'החזר חודשי'}
                value={loan.monthlyPayment}
                onChange={(monthlyPayment) =>
                  onLoans(loans.map((item) => (item.id === loan.id ? { ...item, monthlyPayment } : item)))
                }
                suffix="₪"
              />
            ))}
            <button
              type="button"
              onClick={() => onLoans([...loans, newLoan()])}
              className="text-xs font-bold text-blue-600"
            >
              הוספת הלוואה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
