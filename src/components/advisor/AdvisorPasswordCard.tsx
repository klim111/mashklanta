'use client';

import { useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordField } from '@/components/auth/PasswordField';
import { passwordProblem } from '@/lib/password-policy';
import { SectionCard } from './ui';

/**
 * סיסמת הכניסה לאזור היועץ. היא נדרשת בכל כניסה, אחרי הקישור שנשלח למייל.
 * שינוי של סיסמה קיימת דורש את הסיסמה הנוכחית.
 */
export function AdvisorPasswordCard() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/advisor/password', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body) setHasPassword(Boolean(body.hasPassword));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const problem = passwordProblem(next);
    if (problem) return setError(problem);
    if (next !== confirm) return setError('הסיסמאות אינן זהות.');
    setBusy(true);
    try {
      const response = await fetch('/api/advisor/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'השמירה נכשלה. נסה שוב.');
        return;
      }
      setHasPassword(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      setSaved(true);
    } catch {
      setError('השמירה נכשלה. בדוק את החיבור ונסה שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="סיסמת כניסה" icon={<KeyRound className="h-4 w-4 text-blue-600" />}>
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        הכניסה לאזור היועץ לא נשמרת בדפדפן. כל כניסה מתחילה בקישור שנשלח למייל, ואחריו נדרשת
        הסיסמה הזו.
      </p>
      {hasPassword === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {hasPassword && (
            <label className="block sm:col-span-2 sm:max-w-sm">
              <span className="mb-1 block text-xs font-bold text-slate-700">הסיסמה הנוכחית</span>
              <Input
                type="password"
                autoComplete="current-password"
                dir="ltr"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                required
                className="h-9 text-sm"
              />
            </label>
          )}
          <div>
            <span className="mb-1 block text-xs font-bold text-slate-700">
              {hasPassword ? 'סיסמה חדשה' : 'סיסמה'}
            </span>
            <PasswordField value={next} onChange={setNext} onUseSuggestion={setConfirm} required placeholder="סיסמה חדשה" />
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">אימות הסיסמה</span>
            <Input
              type="password"
              autoComplete="new-password"
              dir="ltr"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
              className="h-9 text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button type="submit" size="sm" className="h-9 text-xs" disabled={busy}>
              <Save className="ml-1 h-4 w-4" />
              {busy ? 'שומר...' : hasPassword ? 'שינוי הסיסמה' : 'הגדרת סיסמה'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <Check className="h-4 w-4" />
                הסיסמה נשמרה
              </span>
            )}
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </form>
      )}
    </SectionCard>
  );
}
