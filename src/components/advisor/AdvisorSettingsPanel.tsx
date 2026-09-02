'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Check, Loader2, Percent, Save, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AMORTIZATION_TYPES,
  DEFAULT_INTEREST_RATES,
  MORTGAGE_BANKS,
  TRACK_TYPES,
} from '@/components/mortgage-advisor/types';
import { rateKey } from '@/lib/advisor-crm';
import { SectionCard } from './ui';
import { useAdvisorSettings } from './useAdvisorCrm';

type TrackType = keyof typeof TRACK_TYPES;
type AmortizationType = keyof typeof AMORTIZATION_TYPES;

const TRACK_KEYS = Object.keys(TRACK_TYPES) as TrackType[];
const AMORTIZATION_KEYS = Object.keys(AMORTIZATION_TYPES) as AmortizationType[];

/**
 * הגדרות היועץ.
 *
 * ריביות ברירת המחדל נשמרות לכל צירוף של בנק ולוח סילוקין. מהרגע שהן שמורות,
 * כל מסלול חדש בכלי בניית התמהיל נפתח עם הריבית הזו — ועדיין ניתן לשנות אותה
 * בעת היצירה, בלי שהשינוי ייגע בהגדרות.
 */
export function AdvisorSettingsPanel({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const { settings, ready, saveRates, addCategory, removeCategory } = useAdvisorSettings();

  const [bank, setBank] = useState<string>(MORTGAGE_BANKS[0]);
  const [amortization, setAmortization] = useState<AmortizationType>('spitzer');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');

  /**
   * הפרופיל נטען במלואו לפני שמירת השם, כי מסלול הפרופיל שומר את האובייקט
   * כולו — שליחת השם לבדו הייתה מאפסת את שאר הפרופיל.
   */
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [profileName, setProfileName] = useState(name);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        setProfile(body);
        if (typeof body.name === 'string' && body.name) setProfileName(body.name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = async () => {
    if (!profile) return;
    setProfileSaved(false);
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, name: profileName.trim() || name }),
    });
    if (response.ok) setProfileSaved(true);
  };

  const savedRates = useMemo(() => {
    const map = new Map<string, number>();
    settings.rates.forEach((item) =>
      map.set(rateKey(item.bank, item.amortizationType, item.trackType), item.rate)
    );
    return map;
  }, [settings.rates]);

  // מעבר בין בנקים או לוחות סילוקין טוען את הערכים השמורים לצירוף שנבחר
  useEffect(() => {
    const next: Record<string, string> = {};
    TRACK_KEYS.forEach((track) => {
      const stored = savedRates.get(rateKey(bank, amortization, track));
      next[track] = stored === undefined ? '' : String(stored);
    });
    setDraft(next);
    setSaved(false);
  }, [bank, amortization, savedRates]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const failure = await saveRates(
      TRACK_KEYS.map((track) => {
        const raw = draft[track]?.trim() ?? '';
        return {
          bank,
          amortizationType: amortization,
          trackType: track,
          rate: raw === '' ? null : Number(raw),
        };
      })
    );
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setSaved(true);
  };

  const filledForBank = settings.rates.filter((item) => item.bank === bank).length;

  return (
    <div className="space-y-4">
      <SectionCard title="פרטים אישיים" icon={<Building2 className="h-4 w-4 text-blue-600" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">שם מלא</span>
            <Input
              value={profileName}
              onChange={(event) => {
                setProfileName(event.target.value);
                setProfileSaved(false);
              }}
              className="h-9 text-sm"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              זה השם שמופיע ללקוחות לצד ההערות והפגישות שלכם.
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">כתובת מייל</span>
            <Input defaultValue={email} disabled className="h-9 bg-slate-50 text-sm" />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!profile}
            onClick={() => void saveProfile()}
          >
            <Save className="ml-1 h-3.5 w-3.5" />
            שמור שם
          </Button>
          {profileSaved && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              <Check className="h-4 w-4" />
              נשמר
            </span>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="ריביות ברירת מחדל"
        icon={<Percent className="h-4 w-4 text-blue-600" />}
        action={
          <span className="text-[11px] text-slate-500">
            {filledForBank > 0 ? `${filledForBank} ריביות שמורות ל${bank}` : 'טרם הוגדרו ריביות'}
          </span>
        }
      >
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          הזינו פעם אחת את הריביות שאתם עובדים איתן מול כל בנק ולכל לוח סילוקין. בכל יצירת תמהיל
          המסלולים ייפתחו עם הערכים האלה, ותוכלו לשנות אותם בעת היצירה בלי שההגדרות ישתנו.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-700">בנק</span>
            <select
              value={bank}
              onChange={(event) => setBank(event.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            >
              {MORTGAGE_BANKS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-700">לוח סילוקין</span>
            <select
              value={amortization}
              onChange={(event) => setAmortization(event.target.value as AmortizationType)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            >
              {AMORTIZATION_KEYS.map((item) => (
                <option key={item} value={item}>
                  {AMORTIZATION_TYPES[item]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!ready ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TRACK_KEYS.map((track) => (
              <label
                key={track}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                  {TRACK_TYPES[track]}
                </span>
                <div className="relative w-24">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="25"
                    value={draft[track] ?? ''}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, [track]: event.target.value }));
                      setSaved(false);
                    }}
                    placeholder={String(DEFAULT_INTEREST_RATES[track])}
                    className="h-8 pl-6 text-left text-xs"
                  />
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    %
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" className="h-9 text-xs" onClick={submit} disabled={saving}>
            <Save className="ml-1 h-4 w-4" />
            {saving ? 'שומר...' : `שמור ריביות ל${bank}`}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              <Check className="h-4 w-4" />
              נשמר
            </span>
          )}
          {error && <span className="text-xs text-red-600">{error}</span>}
          <span className="text-[11px] text-slate-400">
            שדה ריק מחזיר את המסלול לריבית הכללית של המערכת
          </span>
        </div>
      </SectionCard>

      <SectionCard title="קטגוריות לתמהילים" icon={<Tag className="h-4 w-4 text-blue-600" />}>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          תמהיל שנשמר בלי שיוך ללקוח מסודר לפי הקטגוריה שתבחרו בשמירה. כאן מגדירים אילו קטגוריות
          יוצעו לכם.
        </p>

        <div className="space-y-2">
          {settings.categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5"
            >
              <Tag className="h-3.5 w-3.5 text-blue-600" />
              <span className="flex-1 text-sm font-semibold text-slate-800">{category.name}</span>
              <span className="text-[11px] text-slate-500">{category.mixCount} תמהילים</span>
              <button
                type="button"
                onClick={() => void removeCategory(category.id)}
                aria-label="מחיקת קטגוריה"
                className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!newCategory.trim()) return;
              await addCategory(newCategory.trim());
              setNewCategory('');
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="שם קטגוריה חדשה — למשל: תמהילים לדוגמה, מחזורים"
              className="h-9 text-sm"
            />
            <Button type="submit" size="sm" variant="outline" className="h-9 text-xs">
              הוסף
            </Button>
          </form>
        </div>
      </SectionCard>
    </div>
  );
}
