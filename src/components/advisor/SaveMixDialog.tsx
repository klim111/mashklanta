'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Home, Save, Tag, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SaveTarget } from '@/components/mortgage-advisor/savedMixes';
import { useClientProcess, useMixCategories } from './useAdvisorCrm';

interface SaveMixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mixName: string;
  clients: Array<{ id: string; name: string }>;
  /** הלקוח שהכלי נפתח עבורו. אז השמירה מתבצעת עליו ואין מה לבחור */
  lockedClientId?: string | null;
  onSave: (target: SaveTarget) => Promise<void>;
}

/**
 * שמירת תמהיל מצד היועץ.
 *
 * שתי דרכים לשמור, ולכל אחת מקום משלה: לשמור ללקוח — ואז התמהיל מופיע גם אצלו
 * באזור האישי כתמהיל שהיועץ הציע, ומשויך לנכס שהוא הזין; או לשמור בלי לקוח —
 * ואז הוא נכנס לתמהילים השמורים תחת הקטגוריה שנבחרה.
 */
export function SaveMixDialog({
  open,
  onOpenChange,
  mixName,
  clients,
  lockedClientId,
  onSave,
}: SaveMixDialogProps) {
  const [clientId, setClientId] = useState<string>(lockedClientId ?? '');
  const [planId, setPlanId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [newCategory, setNewCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { categories, add } = useMixCategories(open);
  const { process } = useClientProcess(clientId);

  useEffect(() => {
    if (!open) return;
    setClientId(lockedClientId ?? '');
    setPlanId('');
    setCategoryId('');
    setNewCategory('');
    setError(null);
  }, [open, lockedClientId]);

  // הנכס נבחר מראש כשללקוח יש תהליך אחד — אין מה לשאול כשאין ממה לבחור
  useEffect(() => {
    if (!process) return;
    setPlanId((current) => current || (process.plans.length === 1 ? process.plans[0].id : ''));
  }, [process]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      let category = categoryId || null;
      if (!clientId && newCategory.trim()) {
        const created = await add(newCategory.trim());
        category = created?.id ?? null;
      }

      await onSave(
        clientId
          ? { clientId, planId: planId || null, categoryId: null }
          : { clientId: null, planId: null, categoryId: category }
      );
      onOpenChange(false);
    } catch {
      setError('התמהיל לא נשמר. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  const plans = process?.plans ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg text-right">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-right">
            <Save className="h-5 w-5 text-blue-600" />
            שמירת {mixName || 'התמהיל'}
          </DialogTitle>
          <DialogDescription className="text-right">
            בחרו למי התמהיל נשמר. תמהיל ששמור ללקוח יופיע גם אצלו באזור האישי, כתמהיל שהצעתם לו.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <UserRound className="h-3.5 w-3.5 text-blue-600" />
              שיוך ללקוח
            </span>
            <select
              value={clientId}
              disabled={Boolean(lockedClientId)}
              onChange={(event) => {
                setClientId(event.target.value);
                setPlanId('');
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"
            >
              <option value="">בלי שיוך ללקוח — לתמהילים השמורים שלי</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          {clientId ? (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Home className="h-3.5 w-3.5 text-blue-600" />
                הנכס של הלקוח
              </span>
              <select
                value={planId}
                onChange={(event) => setPlanId(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">ללא שיוך לנכס</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.propertyAddress || plan.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-slate-500">
                {plans.length === 0
                  ? 'הלקוח עדיין לא פתח תהליך עם נכס. התמהיל יישמר אצלו כתמהיל שאינו משויך לנכס.'
                  : 'התמהיל יופיע אצל הלקוח תחת הנכס שנבחר.'}
              </span>
            </label>
          ) : (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Tag className="h-3.5 w-3.5 text-blue-600" />
                  קטגוריה
                </span>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">ללא קטגוריה</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              {!categoryId && (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-700">
                    או קטגוריה חדשה
                  </span>
                  <Input
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    placeholder="למשל: תמהילים לדוגמה, מחזורים, זוגות צעירים"
                    className="h-9 text-sm"
                  />
                </label>
              )}
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={busy} className="h-9 text-xs">
              <Building2 className="ml-1 h-4 w-4" />
              {busy ? 'שומר...' : 'שמור תמהיל'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-9 text-xs"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
