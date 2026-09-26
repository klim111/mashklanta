'use client';

import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Lock, RefreshCw, X } from 'lucide-react';
import { PASSWORD_RULES, generatePassword } from '@/lib/password-policy';
import { cn } from '@/lib/utils';

interface PasswordFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  /** נקרא כשהלקוח בוחר בסיסמה המוצעת — למשל כדי למלא גם את שדה האימות */
  onUseSuggestion?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  /** בהגדרות החשבון השדה ריק כברירת מחדל, ואז לא מציגים את הכללים באדום */
  optional?: boolean;
  inputClassName?: string;
}

/**
 * שדה סיסמה חדשה: מציע סיסמה חזקה שנוצרת אוטומטית, ומראה ליד השדה אילו
 * מהכללים (8 תווים, אות, ספרה, סימן) הסיסמה שהוקלדה כבר מקיימת.
 */
export function PasswordField({
  id,
  name,
  value,
  onChange,
  onUseSuggestion,
  placeholder = 'בחרו סיסמה או השתמשו בהצעה',
  required,
  optional,
  inputClassName,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  // נוצרת רק בדפדפן, כדי שלא תישלח מהשרת ולא תשתנה בין הרינדורים
  const [suggestion, setSuggestion] = useState('');
  useEffect(() => setSuggestion(generatePassword()), []);

  const typed = value.length > 0;
  const useSuggestion = () => {
    onChange(suggestion);
    onUseSuggestion?.(suggestion);
    setVisible(true);
  };

  return (
    <div>
      <div className="relative">
        <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          autoComplete="new-password"
          dir="ltr"
          placeholder={placeholder}
          className={cn(
            'w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-9 text-right text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
            inputClassName
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={visible ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {suggestion && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <span className="font-bold">הצעה לסיסמה חזקה:</span>
          <code dir="ltr" className="rounded-md bg-white px-2 py-0.5 font-mono text-sm text-slate-900">
            {suggestion}
          </code>
          <span className="ms-auto flex items-center gap-1">
            <button
              type="button"
              onClick={useSuggestion}
              className="rounded-lg bg-blue-600 px-2.5 py-1 font-bold text-white hover:bg-blue-700"
            >
              השתמשו בה
            </button>
            <button
              type="button"
              onClick={() => setSuggestion(generatePassword())}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-700 hover:bg-blue-100"
              aria-label="הצעה אחרת"
              title="הצעה אחרת"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}

      <ul className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2" aria-live="polite">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          const failed = typed && !ok;
          return (
            <li
              key={rule.id}
              className={cn(
                'flex items-center gap-1.5 text-xs',
                ok ? 'text-emerald-700' : failed ? 'text-rose-600' : 'text-slate-500'
              )}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : failed ? (
                <X className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
              )}
              {rule.label}
              <span className="sr-only">{ok ? ' — מתקיים' : ' — לא מתקיים'}</span>
            </li>
          );
        })}
      </ul>
      {optional && !typed && (
        <p className="mt-1 text-2xs text-slate-400">השאירו ריק כדי לא לשנות את הסיסמה</p>
      )}
    </div>
  );
}
