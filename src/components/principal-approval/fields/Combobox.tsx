'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputClass } from './FieldShell';

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

interface ComboboxProps {
  id?: string;
  value: string | null;
  options: ComboboxOption[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  readOnly?: boolean;
  error?: string;
  loading?: boolean;
}

/** Type-ahead single select — used for the bank branch list, which is long. */
export function Combobox({
  id,
  value,
  options,
  onChange,
  placeholder = 'בחר…',
  emptyText = 'לא נמצאו תוצאות',
  readOnly,
  error,
  loading,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 200);
    return options
      .filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q))
      .slice(0, 200);
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        id={id}
        type="button"
        disabled={readOnly}
        onClick={() => !readOnly && setOpen((o) => !o)}
        className={cn(inputClass({ error, readOnly }), 'flex items-center justify-between text-right')}
      >
        <span className={cn('truncate', !selected && 'text-slate-300')}>
          {loading ? 'טוען…' : selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {selected && !readOnly && (
            <X
              className="h-3.5 w-3.5 text-slate-300 hover:text-rose-500"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          )}
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-slate-300" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') setHighlight((h) => Math.min(h + 1, filtered.length - 1));
                if (e.key === 'ArrowUp') setHighlight((h) => Math.max(h - 1, 0));
                if (e.key === 'Enter' && filtered[highlight]) {
                  e.preventDefault();
                  choose(filtered[highlight]);
                }
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="חיפוש לפי שם או מספר…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-300"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-xs text-slate-400">{emptyText}</li>}
            {filtered.map((option, index) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-sm transition-colors',
                    index === highlight ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700',
                  )}
                >
                  <span className="truncate">
                    {option.label}
                    {option.hint && <span className="mr-2 text-[11px] text-slate-400">{option.hint}</span>}
                  </span>
                  {option.value === value && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface MultiComboboxProps extends Omit<ComboboxProps, 'value' | 'onChange'> {
  value: string[];
  onChange: (value: string[]) => void;
}

/** Multi select with chips — countries of foreign citizenship, account owners. */
export function MultiCombobox({
  id,
  value,
  options,
  onChange,
  placeholder = 'בחר…',
  emptyText = 'לא נמצאו תוצאות',
  readOnly,
  error,
}: MultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(value ?? []), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 200);
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)).slice(0, 200);
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const toggle = (optionValue: string) => {
    const next = new Set(selectedSet);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    onChange(Array.from(next));
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        id={id}
        type="button"
        disabled={readOnly}
        onClick={() => !readOnly && setOpen((o) => !o)}
        className={cn(
          inputClass({ error, readOnly }),
          'flex h-auto min-h-10 flex-wrap items-center gap-1 py-1.5 text-right',
        )}
      >
        {(value ?? []).length === 0 && <span className="text-slate-300">{placeholder}</span>}
        {(value ?? []).map((v) => {
          const option = options.find((o) => o.value === v);
          return (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
            >
              {option?.label ?? v}
              {!readOnly && (
                <X
                  className="h-3 w-3 hover:text-rose-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange((value ?? []).filter((x) => x !== v));
                  }}
                />
              )}
            </span>
          );
        })}
        <ChevronDown className={cn('mr-auto h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-slate-300" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-300"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-xs text-slate-400">{emptyText}</li>}
            {filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-sm text-slate-700 hover:bg-indigo-50"
                >
                  <span className="truncate">{option.label}</span>
                  {selectedSet.has(option.value) && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
