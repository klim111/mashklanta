'use client';

import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Combobox, type ComboboxOption } from './Combobox';
import { inputClass } from './FieldShell';
import { digitsOnly } from '@/lib/principal-approval/format';

interface BranchSelectProps {
  id?: string;
  bankCode: string | null;
  value: string | null;
  onChange: (value: string | null) => void;
  readOnly?: boolean;
  error?: string;
}

interface BranchPayload {
  branches: { branchCode: string; branchName: string; city?: string | null; label: string }[];
  synced: boolean;
}

const cache = new Map<string, BranchPayload>();

/**
 * Branch picker for a chosen bank: shows "code — name (city)" for every branch
 * in the catalogue. When the catalogue has not been imported yet the field
 * degrades to manual entry of the branch number rather than blocking the user.
 */
export function BranchSelect({ id, bankCode, value, onChange, readOnly, error }: BranchSelectProps) {
  const [payload, setPayload] = useState<BranchPayload | null>(bankCode ? cache.get(bankCode) ?? null : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!bankCode) {
      setPayload(null);
      return;
    }
    const cached = cache.get(bankCode);
    if (cached) {
      setPayload(cached);
      return;
    }
    setLoading(true);
    fetch(`/api/banks/branches?bankCode=${encodeURIComponent(bankCode)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const next: BranchPayload = { branches: json.branches ?? [], synced: Boolean(json.branches?.length) };
        cache.set(bankCode, next);
        setPayload(next);
      })
      .catch(() => {
        if (!cancelled) setPayload({ branches: [], synced: false });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bankCode]);

  if (!bankCode) {
    return (
      <div className={`${inputClass({ readOnly: true })} flex items-center text-slate-400`}>
        יש לבחור בנק תחילה
      </div>
    );
  }

  if (payload && !payload.synced) {
    return (
      <div className="space-y-1">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          dir="ltr"
          className={`${inputClass({ error, readOnly })} text-right`}
          value={value ?? ''}
          placeholder="מספר סניף"
          readOnly={readOnly}
          onChange={(e) => onChange(digitsOnly(e.target.value, 4) || null)}
        />
        <p className="flex items-center gap-1 text-[11px] text-amber-600">
          <Info className="h-3 w-3 shrink-0" />
          רשימת הסניפים של בנק זה טרם יובאה — יש להזין את מספר הסניף ידנית (npm run sync:bank-branches)
        </p>
      </div>
    );
  }

  const options: ComboboxOption[] = (payload?.branches ?? []).map((b) => ({
    value: b.branchCode,
    label: b.label,
  }));

  return (
    <Combobox
      id={id}
      value={value}
      options={options}
      onChange={onChange}
      loading={loading}
      readOnly={readOnly}
      error={error}
      placeholder="בחר סניף…"
      emptyText="לא נמצא סניף מתאים"
    />
  );
}
