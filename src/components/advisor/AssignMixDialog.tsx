'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, UserPlus } from 'lucide-react';
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
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';

/**
 * שיוך תמהיל מתיק התמהילים ללקוח מרשימת הלקוחות. השיוך גם מציג את התמהיל
 * ללקוח: מי שיש לו גישה בתשלום רואה אותו בשלב בניית התמהיל כתמהיל ברירת
 * המחדל, מסומן כתמהיל שבנה היועץ.
 */
export function AssignMixDialog({
  item,
  clients,
  onOpenChange,
  onAssign,
}: {
  item: SavedMix | null;
  clients: Array<{ id: string; name: string }>;
  onOpenChange: (open: boolean) => void;
  onAssign: (clientId: string) => Promise<boolean>;
}) {
  const [query, setQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setQuery('');
    setClientId(item.clientId ?? '');
    setError(null);
  }, [item]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? clients.filter((client) => client.name.toLowerCase().includes(term)) : clients;
  }, [clients, query]);

  const submit = async () => {
    if (!clientId) {
      setError('בחרו לקוח מהרשימה.');
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await onAssign(clientId).catch(() => false);
    setBusy(false);
    if (ok) onOpenChange(false);
    else setError('השיוך לא נשמר. נסו שוב.');
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md text-right">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-right">
            <UserPlus className="h-5 w-5 text-blue-600" />
            שיוך {item?.mix.name || 'התמהיל'} ללקוח
          </DialogTitle>
          <DialogDescription className="text-right">
            התמהיל יופיע אצל הלקוח בשלב בניית התמהיל כתמהיל ברירת המחדל, מסומן כתמהיל שבנה היועץ. לקוח
            בלי גישה בתשלום יראה אותו כשהגישה תיפתח.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש לקוח"
            className="h-9 pr-9 text-sm"
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {clients.length === 0 ? 'עדיין אין לקוחות ברשימה.' : 'אין לקוח בשם הזה.'}
            </p>
          ) : (
            shown.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setClientId(client.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  clientId === client.id
                    ? 'bg-blue-600 font-bold text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {client.name}
                {item?.clientId === client.id && (
                  <span className={`text-[11px] ${clientId === client.id ? 'text-white/80' : 'text-slate-400'}`}>
                    משויך עכשיו
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {error && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={() => void submit()} disabled={busy || !clientId} className="h-9 text-xs">
            {busy ? 'משייך...' : 'שייך ללקוח'}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-9 text-xs">
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
