'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, LayoutTemplate, Loader2, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DEFAULT_LANDING_CONTENT,
  LANDING_PAGES,
  normalizeLandingContent,
  type LandingContent,
  type LandingField,
  type LandingPageId,
} from '@/lib/landing-content';
import { platformUrl } from '@/components/landing/landingTools';
import { SectionCard } from './ui';

const textareaClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

/**
 * "דפי נחיתה" בלוח היועץ: כל הטקסטים של חמשת דפי הנחיתה — כותרות, תיאורים,
 * נקודות, כפתורים, והכותרת והתיאור שמופיעים בגוגל ובשיתוף. בוחרים דף, עורכים,
 * ושומרים; הדף באתר מתעדכן מיד. שדה שמרוקן חוזר לטקסט המקורי.
 */
export function LandingContentEditorPanel() {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [pageId, setPageId] = useState<LandingPageId>('office');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/advisor/landing-content', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((body: unknown) => setContent(normalizeLandingContent(body)))
      .catch(() => setError('לא הצלחנו לטעון את הטקסטים. רעננו את הדף.'));
  }, []);

  const page = LANDING_PAGES.find((item) => item.id === pageId)!;

  // השדות של הדף לפי הקבוצות שלהם, בסדר ההופעה בדף
  const groups = useMemo(() => {
    const result: Array<{ title: string; fields: LandingField[] }> = [];
    for (const field of page.fields) {
      const last = result[result.length - 1];
      if (last && last.title === field.group) last.fields.push(field);
      else result.push({ title: field.group, fields: [field] });
    }
    return result;
  }, [page]);

  if (!content) {
    return (
      <SectionCard title="דפי נחיתה" icon={<LayoutTemplate className="h-4 w-4" />}>
        {error ? (
          <p className="text-sm font-bold text-rose-700">{error}</p>
        ) : (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
        )}
      </SectionCard>
    );
  }

  const setField = (key: string, value: string) => {
    setContent({ ...content, [pageId]: { ...content[pageId], [key]: value } });
    setSaved(false);
    setDirty(true);
  };

  const resetPage = () => {
    setContent({ ...content, [pageId]: { ...DEFAULT_LANDING_CONTENT[pageId] } });
    setSaved(false);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/advisor/landing-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      if (!response.ok) throw new Error(String(response.status));
      setContent(normalizeLandingContent(await response.json()));
      setSaved(true);
      setDirty(false);
    } catch {
      setError('השמירה נכשלה. נסו שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <SectionCard title="דפי נחיתה" icon={<LayoutTemplate className="h-4 w-4" />}>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          בוחרים דף ועורכים את הטקסטים שלו. השמירה מעדכנת את הדף באתר מיד. שדה שמרוקן חוזר לטקסט המקורי.
        </p>
        <div className="flex flex-wrap gap-2">
          {LANDING_PAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPageId(item.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors ${
                item.id === pageId
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <a
            href={platformUrl(page.path)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span dir="ltr">{page.path}</span>
          </a>
          <button
            type="button"
            onClick={resetPage}
            className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            החזרת הטקסטים המקוריים של הדף
          </button>
        </div>
      </SectionCard>

      {groups.map((group) => (
        <SectionCard key={group.title} title={group.title}>
          <div className="grid gap-3 md:grid-cols-2">
            {group.fields.map((field) => {
              const value = content[pageId][field.key] ?? '';
              const wide = field.kind !== 'line';
              return (
                <label
                  key={field.key}
                  className={`block text-xs font-bold text-slate-600 ${wide ? 'md:col-span-2' : ''}`}
                >
                  {field.label}
                  <div className="mt-1">
                    {field.kind === 'line' ? (
                      <Input value={value} onChange={(event) => setField(field.key, event.target.value)} />
                    ) : (
                      <textarea
                        value={value}
                        onChange={(event) => setField(field.key, event.target.value)}
                        rows={field.kind === 'list' ? 4 : 3}
                        className={textareaClass}
                      />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </SectionCard>
      ))}

      {/* השמירה בצד ימין — בצד שמאל צף כפתור ההתכתבות */}
      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Save className="ml-1 h-4 w-4" />}
          שמירת הטקסטים
        </Button>
        {error && <span className="text-sm font-bold text-rose-700">{error}</span>}
        {dirty && !saving && <span className="text-sm font-bold text-amber-700">יש שינויים שלא נשמרו</span>}
        {saved && (
          <span className="flex items-center gap-1 text-sm font-bold text-emerald-700">
            <Check className="h-4 w-4" />
            נשמר. דפי הנחיתה מעודכנים
          </span>
        )}
      </div>
    </div>
  );
}
