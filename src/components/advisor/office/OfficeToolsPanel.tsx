'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Globe, Loader2, Lock, Save } from 'lucide-react';
import {
  MAX_PUBLIC_TOOLS,
  TOOL_MODES,
  TOOL_MODULES,
  TOOL_PRESETS,
  presetMatching,
  type OfficeTools,
  type ToolMode,
  type ToolModuleId,
} from '@/lib/office';
import { TOOL_ICONS } from '@/components/office/toolIcons';
import { SectionCard } from '../ui';
import type { OfficeUpdate } from './useAdvisorOffice';

/**
 * אילו כלים של משכלנתא הלקוחות של המשרד רואים. הליבה — התהליך, תיק המסמכים,
 * ההודעות והפגישות — תמיד מוצגת, ולכן לא מופיעה כאן.
 */
export function OfficeToolsPanel({
  tools,
  save,
}: {
  tools: OfficeTools;
  save: (update: OfficeUpdate) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<OfficeTools>(tools);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(tools), [tools]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(tools);
  const preset = useMemo(() => presetMatching(draft.modes), [draft.modes]);

  const update = (next: OfficeTools) => {
    setSaved(false);
    setDraft(next);
  };

  const setMode = (id: ToolModuleId, mode: ToolMode) => update({ ...draft, modes: { ...draft.modes, [id]: mode } });

  const togglePublic = (id: ToolModuleId) => {
    const on = draft.publicTools.includes(id);
    if (!on && draft.publicTools.length >= MAX_PUBLIC_TOOLS) return;
    update({
      ...draft,
      publicTools: on ? draft.publicTools.filter((item) => item !== id) : [...draft.publicTools, id],
    });
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const failure = await save({ tools: draft });
    setBusy(false);
    if (failure) setError(failure);
    else setSaved(true);
  };

  return (
    <div className="start-aligned space-y-4">
      <SectionCard title="ערכה מוכנה">
        <p className="mb-3 text-sm text-slate-600">
          בוחרים איך אתם עובדים, ומשנים כלי בודד למטה אם צריך. התהליך, תיק המסמכים, ההודעות והפגישות תמיד פתוחים ללקוח.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {TOOL_PRESETS.map((item) => {
            const active = preset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => update({ ...draft, modes: item.modes })}
                aria-pressed={active}
                className={`rounded-2xl border-2 p-4 text-right transition-colors ${
                  active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-base font-black text-slate-900">{item.label}</span>
                  {active && <CheckCircle2 className="h-5 w-5 text-blue-600" aria-hidden />}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-600">{item.description}</span>
              </button>
            );
          })}
        </div>
        {!preset && <p className="mt-2 text-xs font-semibold text-slate-500">הגדרה מותאמת אישית</p>}
      </SectionCard>

      <SectionCard title="כלי אחר כלי">
        <ul className="divide-y divide-slate-100">
          {TOOL_MODULES.map((tool) => {
            const Icon = TOOL_ICONS[tool.id];
            return (
              <li key={tool.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <span className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                      {tool.label}
                      {tool.paid && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-500">
                          <Lock className="h-3 w-3" aria-hidden />
                          אחרי תשלום
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500">{tool.hint}</span>
                  </span>
                </span>
                <span
                  className="inline-flex shrink-0 rounded-xl bg-slate-100 p-1"
                  role="radiogroup"
                  aria-label={tool.label}
                >
                  {TOOL_MODES.map((mode) => {
                    const active = draft.modes[tool.id] === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={mode.hint}
                        onClick={() => setMode(tool.id, mode.id)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                          active
                            ? mode.id === 'hidden'
                              ? 'bg-white text-slate-500 shadow-sm'
                              : 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          &quot;רק למי שאפתח&quot; — פותחים ללקוח מסוים בדף הלקוח, בלשונית &quot;תשלום והרשאה&quot;.
        </p>
      </SectionCard>

      <SectionCard title="כלים חינמיים בדף המשרד" icon={<Globe className="h-4 w-4 text-blue-600" />}>
        <p className="mb-3 text-sm text-slate-600">
          עד {MAX_PUBLIC_TOOLS} כלים שגולשים יכולים לנסות בלי הרשמה. מי שמשתמש בהם ונרשם — משויך למשרד שלכם.
        </p>
        <div className="flex flex-wrap gap-2">
          {TOOL_MODULES.filter((tool) => tool.publicHref).map((tool) => {
            const on = draft.publicTools.includes(tool.id);
            const full = !on && draft.publicTools.length >= MAX_PUBLIC_TOOLS;
            const Icon = TOOL_ICONS[tool.id];
            return (
              <button
                key={tool.id}
                type="button"
                disabled={full}
                aria-pressed={on}
                onClick={() => togglePublic(tool.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-40 ${
                  on
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {tool.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => void submit()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          שמירת הכלים
        </button>
        {dirty && !busy && (
          <button
            type="button"
            onClick={() => setDraft(tools)}
            className="text-sm font-bold text-slate-500 hover:text-slate-800"
          >
            ביטול
          </button>
        )}
        {saved && !dirty && (
          <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            נשמר. הלקוחות רואים את השינוי בכניסה הבאה.
          </span>
        )}
        {error && (
          <span className="text-sm font-semibold text-red-600" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
