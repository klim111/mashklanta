'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Eye, EyeOff, LayoutGrid, Loader2 } from 'lucide-react';
import {
  TOOL_MODES,
  TOOL_MODULES,
  type ClientToolAccess,
  type ToolModes,
  type ToolModuleId,
  type ToolOverride,
  type ToolOverrides,
} from '@/lib/office';
import { TOOL_ICONS } from '@/components/office/toolIcons';
import { SectionCard } from '../ui';

interface Settings {
  modes: ToolModes;
  overrides: ToolOverrides;
  access: ClientToolAccess;
}

type Choice = 'office' | ToolOverride;

const CHOICES: Array<{ id: Choice; label: string }> = [
  { id: 'office', label: 'לפי המשרד' },
  { id: 'on', label: 'פתוח' },
  { id: 'off', label: 'סגור' },
];

/**
 * הכלים שהלקוח הזה רואה באזור האישי: לכל כלי — לפי הגדרת המשרד, או פתוח או
 * סגור במיוחד בשבילו. כלי שהוסתר במשרד מוסתר מכולם, ואי אפשר לפתוח אותו כאן.
 * כל שינוי נשמר מיד.
 */
export function ClientToolAccessCard({ clientId }: { clientId: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [failed, setFailed] = useState(false);
  const [busyTool, setBusyTool] = useState<ToolModuleId | null>(null);
  const [savedTool, setSavedTool] = useState<ToolModuleId | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/tools`, { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      setSettings(await response.json());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (id: ToolModuleId, choice: Choice) => {
    if (!settings) return;
    const overrides: ToolOverrides = { ...settings.overrides };
    if (choice === 'office') delete overrides[id];
    else overrides[id] = choice;
    setBusyTool(id);
    setSavedTool(null);
    try {
      const response = await fetch(`/api/clients/${clientId}/tools`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setSettings(await response.json());
      setSavedTool(id);
    } catch {
      window.alert('השינוי לא נשמר. נסו שוב.');
    } finally {
      setBusyTool(null);
    }
  };

  return (
    <SectionCard
      className="start-aligned"
      title="הכלים שהלקוח רואה"
      icon={<LayoutGrid className="h-4 w-4 text-blue-600" />}
      action={
        <Link
          href="/advisor-dashboard?section=office&view=client-tools"
          className="text-xs font-bold text-blue-700 hover:underline"
        >
          הגדרת הכלים של המשרד
        </Link>
      }
    >
      {!settings && !failed && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden />
        </div>
      )}
      {failed && <p className="text-sm text-red-600">לא הצלחנו לטעון את הכלים של הלקוח.</p>}
      {settings && (
        <>
          <p className="mb-2 text-xs text-slate-500">
            התהליך, תיק המסמכים, ההודעות והפגישות תמיד פתוחים. כאן קובעים את שאר הכלים, ללקוח הזה בלבד.
          </p>
          <ul className="divide-y divide-slate-100">
            {TOOL_MODULES.map((tool) => {
              const Icon = TOOL_ICONS[tool.id];
              const mode = settings.modes[tool.id];
              const hidden = mode === 'hidden';
              const current: Choice = settings.overrides[tool.id] ?? 'office';
              const open = settings.access[tool.id];
              return (
                <li key={tool.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900">{tool.label}</span>
                      <span className="block text-2xs text-slate-500">
                        במשרד: {TOOL_MODES.find((item) => item.id === mode)?.label}
                        {hidden && ' · אפשר לשנות בהגדרות המשרד'}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-2xs font-bold ${open ? 'text-emerald-600' : 'text-slate-400'}`}
                      title={open ? 'הלקוח רואה את הכלי' : 'הלקוח לא רואה את הכלי'}
                    >
                      {open ? (
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {open ? 'רואה' : 'לא רואה'}
                    </span>
                    <span
                      className="inline-flex rounded-lg bg-slate-100 p-0.5"
                      role="radiogroup"
                      aria-label={tool.label}
                    >
                      {CHOICES.map((choice) => {
                        const active = current === choice.id;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={hidden || busyTool !== null}
                            onClick={() => void choose(tool.id, choice.id)}
                            className={`rounded-md px-2 py-1 text-2xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              active ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {choice.label}
                          </button>
                        );
                      })}
                    </span>
                    <span className="w-4">
                      {busyTool === tool.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" aria-hidden />
                      )}
                      {savedTool === tool.id && <Check className="h-3.5 w-3.5 text-emerald-600" aria-label="נשמר" />}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
