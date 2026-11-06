'use client';

import React, { useEffect, useState } from 'react';
import { Check, FileSignature, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { emptyAdvisorDetails, missingAdvisorDetails } from '@/lib/authorization-forms';
import type { AdvisorFormDetails } from '@/lib/authorization-forms';
import { SectionCard } from './ui';

const FIELDS: Array<{ key: keyof AdvisorFormDetails; label: string; hint?: string; ltr?: boolean }> = [
  { key: 'name', label: 'שם מלא, כפי שיופיע בטפסים' },
  { key: 'idNumber', label: 'מספר ת"ז', ltr: true },
  { key: 'phone', label: 'טלפון', ltr: true },
  { key: 'companyName', label: 'חברת הייעוץ', hint: 'אם אתם עובדים דרך חברה' },
  { key: 'companyNumber', label: 'ח"פ של החברה', ltr: true },
];

/**
 * פרטי היועץ לטפסי כתבי ההסמכה של הבנקים. הלקוח ממלא את הטפסים אצלו, והפרטים
 * האלה נכתבים בהם אוטומטית בשדות "מסמיכים את".
 */
export function AdvisorFormDetailsCard() {
  const [details, setDetails] = useState<AdvisorFormDetails>(emptyAdvisorDetails());
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/advisor/form-details', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body) setDetails(body as AdvisorFormDetails);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch('/api/advisor/form-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      if (!response.ok) throw new Error(String(response.status));
      setDetails((await response.json()) as AdvisorFormDetails);
      setSaved(true);
    } catch {
      setError('השמירה נכשלה. נסו שוב.');
    } finally {
      setSaving(false);
    }
  };

  const missing = missingAdvisorDetails(details);

  return (
    <SectionCard title="פרטים לכתבי ההסמכה" icon={<FileSignature className="h-4 w-4 text-violet-600" />}>
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        הפרטים נכתבים אוטומטית בטפסי כתבי ההסמכה שהלקוחות שלכם ממלאים וחותמים עליהם, בשדות של היועץ המוסמך.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label, hint, ltr }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">{label}</span>
            <Input
              value={details[key]}
              dir={ltr ? 'ltr' : 'rtl'}
              disabled={!ready}
              onChange={(event) => {
                setDetails((current) => ({ ...current, [key]: event.target.value }));
                setSaved(false);
              }}
              className="h-9 text-sm"
            />
            {hint && <span className="mt-1 block text-2xs text-slate-500">{hint}</span>}
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!ready || saving} onClick={() => void save()}>
          <Save className="ml-1 h-3.5 w-3.5" />
          שמור פרטים
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <Check className="h-4 w-4" />
            נשמר
          </span>
        )}
        {error && <span className="text-xs font-bold text-rose-600">{error}</span>}
        {ready && !saved && missing.length > 0 && (
          <span className="text-xs text-amber-700">חסר: {missing.join(', ')}</span>
        )}
      </div>
    </SectionCard>
  );
}
