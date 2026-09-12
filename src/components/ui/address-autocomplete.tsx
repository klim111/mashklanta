'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  label: string;
  city: string;
  street?: string;
  houseNumber?: string;
  source: 'registry' | 'map';
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  /** נקרא כשנבחרה הצעה מהרשימה, בנוסף ל-onChange */
  onSelect?: (suggestion: AddressSuggestion) => void;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

/**
 * שדה כתובת עם השלמה אוטומטית מנתוני הכתובות האמיתיים בישראל. תוך ההקלדה
 * מוצעות התאמות של רחוב ועיר, ואפשר גם להזין כתובת חופשית שאינה ברשימה.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onBlur,
  onKeyDown,
  placeholder,
  className,
  autoFocus,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** בחירה מהרשימה לא אמורה להפעיל חיפוש חדש על הטקסט שנבחר */
  const skipNextQuery = useRef(false);

  const closeList = useCallback(() => {
    setOpen(false);
    setHighlighted(-1);
  }, []);

  // סגירה בלחיצה מחוץ לשדה
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) closeList();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, closeList]);

  useEffect(() => {
    if (skipNextQuery.current) {
      skipNextQuery.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setSuggestions([]);
      setLoading(false);
      closeList();
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const response = await fetch(`/api/addresses?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('lookup failed');
        const data = (await response.json()) as { suggestions?: AddressSuggestion[] };
        const items = data.suggestions ?? [];
        setSuggestions(items);
        setHighlighted(-1);
        setOpen(items.length > 0);
      } catch {
        // הזנה חופשית תמיד אפשרית, ולכן כשל בשירות לא מוצג כשגיאה
        if (!controller.signal.aborted) {
          setSuggestions([]);
          closeList();
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [value, closeList]);

  const choose = (suggestion: AddressSuggestion) => {
    skipNextQuery.current = true;
    onChange(suggestion.label);
    onSelect?.(suggestion);
    setSuggestions([]);
    closeList();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlighted((index) => (index + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlighted((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
        return;
      }
      if (event.key === 'Enter' && highlighted >= 0) {
        event.preventDefault();
        choose(suggestions[highlighted]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeList();
        return;
      }
    }
    onKeyDown?.(event);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        className={className}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(suggestions.length > 0)}
        // הבחירה מהרשימה נעשית ב-mousedown, ולכן אפשר לדווח על יציאה מהשדה מיד
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
      />

      {loading && (
        <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
      )}

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.label}-${index}`} role="option" aria-selected={index === highlighted}>
              <button
                type="button"
                // mousedown ולא click, כדי שהבחירה תקרה לפני שהשדה מאבד פוקוס
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(suggestion);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  'flex w-full items-center gap-2 px-2.5 py-1.5 text-right transition-colors',
                  index === highlighted ? 'bg-blue-50' : 'hover:bg-slate-50'
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-slate-800">
                    {suggestion.street
                      ? `${suggestion.street}${suggestion.houseNumber ? ` ${suggestion.houseNumber}` : ''}`
                      : suggestion.city}
                  </span>
                  {suggestion.street && (
                    <span className="block truncate text-[10px] text-slate-500">
                      {suggestion.city}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
