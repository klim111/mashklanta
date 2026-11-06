'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ImagePlus,
  Loader2,
  Megaphone,
  PenLine,
  Plus,
  Save,
  Search,
  Trash2,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ALL_PAGES,
  BANNER_PLACEMENTS,
  BANNER_TONES,
  SITE_PAGES,
  emptyBanner,
  newId,
  normalizeSiteContent,
  normalizeText,
  sitePageTitle,
  type SiteBanner,
  type SiteContent,
  type SitePageDef,
} from '@/lib/site-content';
import { SiteBannerView } from '@/components/site-content/SiteBanners';
import { writeEditFlag } from '@/components/site-content/editFlag';
import { SectionCard } from './ui';

const textareaClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const selectClass =
  'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400';

const PAGE_GROUPS = SITE_PAGES.reduce<Array<{ group: string; pages: SitePageDef[] }>>((groups, page) => {
  const last = groups[groups.length - 1];
  if (last && last.group === page.group) last.pages.push(page);
  else groups.push({ group: page.group, pages: [page] });
  return groups;
}, []);

/** הכתובת שנפתחת לעריכה על הדף. עמוד של לקוח או תשלום מסוים אי אפשר לפתוח ישירות */
function openablePath(page: SitePageDef | undefined): string | null {
  if (!page) return null;
  if (page.editPath) return page.editPath;
  if (page.path === ALL_PAGES) return '/';
  return page.path.includes('*') ? null : page.path;
}

function PageSelect({
  value,
  onChange,
  extra,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  extra?: React.ReactNode;
  className?: string;
}) {
  const known = SITE_PAGES.some((page) => page.path === value);
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={`${selectClass} ${className}`}>
      {extra}
      {!known && value && <option value={value}>{value}</option>}
      {PAGE_GROUPS.map((group) => (
        <optgroup key={group.group} label={group.group}>
          {group.pages.map((page) => (
            <option key={page.path} value={page.path}>
              {page.title}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/** תמונה גדולה מוקטנת בדפדפן לפני ההעלאה. GIF נשאר כמו שהוא, כדי לא לאבד את האנימציה */
async function prepareImage(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width);
  if (scale === 1 && file.size <= 1024 * 1024) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('resize'))), 'image/webp', 0.85)
  );
}

function BannerEditor({ banner, onChange }: { banner: SiteBanner; onChange: (banner: SiteBanner) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customPage, setCustomPage] = useState('');
  const set = <K extends keyof SiteBanner>(key: K, value: SiteBanner[K]) => onChange({ ...banner, [key]: value });

  const togglePage = (path: string) =>
    set('pages', banner.pages.includes(path) ? banner.pages.filter((page) => page !== path) : [...banner.pages, path]);

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await prepareImage(file);
      const response = await fetch('/api/advisor/site-content/images', {
        method: 'POST',
        headers: { 'Content-Type': blob.type || file.type },
        body: blob,
      });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || 'ההעלאה נכשלה');
      set('imageUrl', body.url);
    } catch (error) {
      setUploadError(error instanceof Error && error.message !== 'resize' ? error.message : 'ההעלאה נכשלה. נסו שוב.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-bold text-slate-600">
          שם פנימי (רק אתם רואים)
          <Input className="mt-1" value={banner.name} onChange={(event) => set('name', event.target.value)} />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          כותרת
          <Input className="mt-1" value={banner.title} onChange={(event) => set('title', event.target.value)} />
        </label>
        <label className="block text-xs font-bold text-slate-600 md:col-span-2">
          טקסט
          <textarea
            value={banner.text}
            onChange={(event) => set('text', event.target.value)}
            rows={2}
            className={`mt-1 ${textareaClass}`}
          />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          קישור (נתיב באתר כמו /pricing, או כתובת מלאה)
          <Input
            className="mt-1"
            dir="ltr"
            value={banner.linkUrl}
            onChange={(event) => set('linkUrl', event.target.value)}
            placeholder="https://"
          />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          טקסט הכפתור
          <Input className="mt-1" value={banner.linkLabel} onChange={(event) => set('linkLabel', event.target.value)} />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-600">תמונה (לא חובה). באנר עם תמונה בלבד, בלי כותרת וטקסט, מוצג כתמונה שלמה</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            העלאת תמונה
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void upload(file);
              }}
            />
          </label>
          <Input
            dir="ltr"
            className="max-w-sm flex-1"
            value={banner.imageUrl}
            onChange={(event) => set('imageUrl', event.target.value)}
            placeholder="או כתובת של תמונה"
          />
          {banner.imageUrl && (
            <button type="button" onClick={() => set('imageUrl', '')} className="text-xs font-bold text-rose-600">
              הסרת התמונה
            </button>
          )}
        </div>
        {uploadError && <p className="text-xs font-bold text-rose-700">{uploadError}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="block text-xs font-bold text-slate-600">
          מיקום
          <select
            value={banner.placement}
            onChange={(event) => set('placement', event.target.value as SiteBanner['placement'])}
            className={`mt-1 w-full ${selectClass}`}
          >
            {BANNER_PLACEMENTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-600">
          צבע
          <select
            value={banner.tone}
            onChange={(event) => set('tone', event.target.value as SiteBanner['tone'])}
            className={`mt-1 w-full ${selectClass}`}
          >
            {BANNER_TONES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-600">
          מתאריך
          <Input className="mt-1" type="date" value={banner.startsOn} onChange={(event) => set('startsOn', event.target.value)} />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          עד תאריך (כולל)
          <Input className="mt-1" type="date" value={banner.endsOn} onChange={(event) => set('endsOn', event.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={banner.active} onChange={(event) => set('active', event.target.checked)} />
          פעיל
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={banner.dismissible}
            onChange={(event) => set('dismissible', event.target.checked)}
          />
          הגולש יכול לסגור אותו
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-slate-600">באילו עמודים להציג</p>
        <div className="grid max-h-72 gap-3 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAGE_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="mb-1 text-2xs font-black text-slate-400">{group.group}</p>
              {group.pages.map((page) => (
                <label key={page.path} className="flex items-center gap-2 py-0.5 text-sm text-slate-700">
                  <input type="checkbox" checked={banner.pages.includes(page.path)} onChange={() => togglePage(page.path)} />
                  {page.title}
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {banner.pages
            .filter((path) => !SITE_PAGES.some((page) => page.path === path))
            .map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => togglePage(path)}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700"
                dir="ltr"
              >
                {path} ×
              </button>
            ))}
          <Input
            dir="ltr"
            className="max-w-[14rem]"
            value={customPage}
            onChange={(event) => setCustomPage(event.target.value)}
            placeholder="/נתיב-אחר"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const path = customPage.trim();
              if (path.startsWith('/') && !banner.pages.includes(path)) set('pages', [...banner.pages, path]);
              setCustomPage('');
            }}
          >
            הוספת נתיב
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-slate-600">תצוגה מקדימה</p>
        <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          {banner.title || banner.text || banner.imageUrl ? (
            <SiteBannerView banner={banner} onDismiss={() => undefined} />
          ) : (
            <p className="text-center text-xs text-slate-400">הוסיפו כותרת, טקסט או תמונה</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * "תוכן האתר" בלוח היועץ: כל הטקסטים והכותרות בכל עמוד ומסך בפלטפורמה, ובאנרים
 * של פרסומת לפי עמוד. הטקסטים נערכים ישירות על הדף ("פתיחת העמוד לעריכה") או
 * ברשימה כאן; השמירה מתעדכנת באתר מיד.
 */
export function SiteContentEditorPanel() {
  const router = useRouter();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [view, setView] = useState<'texts' | 'banners'>('texts');
  const [page, setPage] = useState<string>('/');
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');
  const [openBanner, setOpenBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/advisor/site-content', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((body: unknown) => setContent(normalizeSiteContent(body)))
      .catch(() => setError('לא הצלחנו לטעון את תוכן האתר. רעננו את הדף.'));
  }, []);

  useEffect(load, [load]);

  // עריכות שנעשו על הדף בלשונית אחרת מופיעות כשחוזרים לכאן, כל עוד אין כאן שינויים שלא נשמרו
  useEffect(() => {
    const onFocus = () => !dirty && load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dirty, load]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    content?.texts.forEach((rule) => map.set(rule.page, (map.get(rule.page) ?? 0) + 1));
    return map;
  }, [content]);

  if (!content) {
    return (
      <SectionCard title="תוכן האתר" icon={<PenLine className="h-4 w-4" />}>
        {error ? (
          <p className="text-sm font-bold text-rose-700">{error}</p>
        ) : (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
        )}
      </SectionCard>
    );
  }

  const update = (next: SiteContent) => {
    setContent(next);
    setSaved(false);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/advisor/site-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      if (!response.ok) throw new Error(String(response.status));
      setContent(normalizeSiteContent(await response.json()));
      setSaved(true);
      setDirty(false);
    } catch {
      setError('השמירה נכשלה. נסו שוב.');
    } finally {
      setSaving(false);
    }
  };

  const selectedPage = SITE_PAGES.find((item) => item.path === page);
  const openPath = openablePath(selectedPage);
  const query = normalizeText(search).toLowerCase();
  const rules = content.texts.filter(
    (rule) =>
      (!filter || rule.page === filter) &&
      (!query || rule.from.toLowerCase().includes(query) || rule.to.toLowerCase().includes(query))
  );

  const setRule = (id: string, patch: Partial<{ page: string; to: string }>) =>
    update({ ...content, texts: content.texts.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)) });

  const addRule = () => {
    const from = normalizeText(newFrom);
    if (!from || !newTo.trim()) return;
    const scope = filter || ALL_PAGES;
    update({
      ...content,
      texts: [
        ...content.texts.filter((rule) => !(rule.page === scope && rule.from === from)),
        { id: newId(), page: scope, from, to: newTo.trim() },
      ],
    });
    setNewFrom('');
    setNewTo('');
  };

  const setBanner = (banner: SiteBanner) =>
    update({ ...content, banners: content.banners.map((item) => (item.id === banner.id ? banner : item)) });

  return (
    <div className="space-y-4" dir="rtl" data-site-content-skip>
      <SectionCard title="תוכן האתר" icon={<PenLine className="h-4 w-4" />}>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          כאן משנים כל טקסט וכותרת בכל עמוד ומסך בפלטפורמה, ומוסיפים באנרים של פרסומת לפי עמוד. השינויים מופיעים באתר
          מיד אחרי השמירה. את דפי הנחיתה אפשר לערוך גם שדה אחר שדה בלשונית &quot;דפי נחיתה&quot;.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'texts' as const, label: `טקסטים וכותרות (${content.texts.length})`, icon: Type },
            { id: 'banners' as const, label: `באנרים (${content.banners.length})`, icon: Megaphone },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors ${
                view === item.id
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {view === 'texts' && (
        <>
          <SectionCard title="עריכה ישירה על הדף">
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              בוחרים עמוד ופותחים אותו. בעמוד מופיע סרגל עריכה: לוחצים על כל טקסט, כותרת או כפתור, כותבים את הנוסח
              החדש ובוחרים אם להחליף רק בעמוד הזה או בכל האתר. במצב &quot;ניווט באתר&quot; הלחיצות עובדות כרגיל, כדי
              להגיע לחלונות ולמסכים פנימיים. מסכי אזור הלקוח נפתחים בהדגמה, עם אותו ממשק על נתונים בדויים: לוחצים
              שם &quot;נסו בעצמכם&quot; כדי שההדגמה לא תסתיר את המסך. בסיום חוזרים לכאן מכפתור &quot;חזרה ללוח
              הבקרה&quot; שבסרגל.
            </p>
            {dirty && (
              <p className="mb-2 text-xs font-bold text-amber-700">שמרו את השינויים שכאן לפני שפותחים עמוד לעריכה.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <PageSelect value={page} onChange={setPage} className="min-w-[16rem]" />
              <Button
                type="button"
                disabled={!openPath || dirty}
                onClick={() => {
                  if (!openPath) return;
                  // באותה לשונית: לשונית חדשה מנתקת את היועץ
                  writeEditFlag(true);
                  router.push(openPath);
                }}
              >
                <ExternalLink className="ml-1 h-4 w-4" />
                פתיחת העמוד לעריכה
              </Button>
              {counts.get(page) ? (
                <button
                  type="button"
                  onClick={() => setFilter(page)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900"
                >
                  {counts.get(page)} שינויים בעמוד הזה
                </button>
              ) : null}
            </div>
            {!openPath && (
              <p className="mt-2 text-xs text-amber-700">
                העמוד הזה שייך ללקוח או לתשלום מסוים. פתחו עמוד אחר לעריכה, עברו ל&quot;ניווט באתר&quot; והגיעו אליו
                משם: סרגל העריכה נשאר פעיל.
              </p>
            )}
          </SectionCard>

          <SectionCard title="השינויים שנשמרו">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <PageSelect
                value={filter}
                onChange={setFilter}
                extra={<option value="">כל העמודים</option>}
                className="min-w-[14rem]"
              />
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="חיפוש טקסט"
                  className="pr-9"
                />
              </div>
            </div>

            {rules.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                {content.texts.length === 0 ? 'עוד לא שונו טקסטים. פתחו עמוד לעריכה כדי להתחיל.' : 'אין שינויים שמתאימים לסינון.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <div key={rule.id} className="grid gap-2 py-3 md:grid-cols-[12rem_1fr_1fr_auto] md:items-start">
                    <PageSelect value={rule.page} onChange={(value) => setRule(rule.id, { page: value })} />
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      <span className="block text-2xs font-bold text-slate-400">במקום</span>
                      {rule.from}
                    </div>
                    <label className="block">
                      <span className="sr-only">הטקסט החדש</span>
                      <textarea
                        value={rule.to}
                        onChange={(event) => setRule(rule.id, { to: event.target.value })}
                        rows={Math.min(5, Math.max(2, Math.ceil(rule.to.length / 50)))}
                        className={textareaClass}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => update({ ...content, texts: content.texts.filter((item) => item.id !== rule.id) })}
                      className="inline-flex items-center gap-1 self-center rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      החזרת המקור
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3">
              <p className="mb-2 text-xs font-bold text-slate-600">
                הוספה ידנית ({filter ? sitePageTitle(filter) : 'בכל האתר'}): מעתיקים את הטקסט כפי שהוא מופיע באתר
              </p>
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <Input value={newFrom} onChange={(event) => setNewFrom(event.target.value)} placeholder="הטקסט שמופיע היום" />
                <Input value={newTo} onChange={(event) => setNewTo(event.target.value)} placeholder="הטקסט החדש" />
                <Button type="button" variant="outline" onClick={addRule} disabled={!newFrom.trim() || !newTo.trim()}>
                  <Plus className="ml-1 h-4 w-4" />
                  הוספה
                </Button>
              </div>
            </div>
          </SectionCard>
        </>
      )}

      {view === 'banners' && (
        <SectionCard
          title="באנרים של פרסומת"
          icon={<Megaphone className="h-4 w-4" />}
          action={
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const banner = emptyBanner();
                update({ ...content, banners: [...content.banners, banner] });
                setOpenBanner(banner.id);
              }}
            >
              <Plus className="ml-1 h-4 w-4" />
              באנר חדש
            </Button>
          }
        >
          {content.banners.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              אין באנרים. באנר מוצג כפס בראש העמוד או בתחתיתו, או כחלונית צפה, בעמודים ובתאריכים שבוחרים.
            </p>
          ) : (
            <div className="space-y-3">
              {content.banners.map((banner) => {
                const open = openBanner === banner.id;
                return (
                  <div key={banner.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setOpenBanner(open ? null : banner.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-right"
                      >
                        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                        <span className="truncate text-sm font-black text-slate-900">
                          {banner.name || banner.title || 'באנר בלי שם'}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {BANNER_PLACEMENTS.find((option) => option.id === banner.placement)?.label} ·{' '}
                          {banner.pages.length === 0
                            ? 'לא נבחרו עמודים'
                            : banner.pages.length === 1
                              ? sitePageTitle(banner.pages[0])
                              : `${banner.pages.length} עמודים`}
                          {banner.startsOn && ` · מ-${banner.startsOn}`}
                          {banner.endsOn && ` · עד ${banner.endsOn}`}
                        </span>
                      </button>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={banner.active}
                          onChange={(event) => setBanner({ ...banner, active: event.target.checked })}
                        />
                        פעיל
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('למחוק את הבאנר?')) {
                            update({ ...content, banners: content.banners.filter((item) => item.id !== banner.id) });
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        מחיקה
                      </button>
                    </div>
                    {open && <BannerEditor banner={banner} onChange={setBanner} />}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="button" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Save className="ml-1 h-4 w-4" />}
          שמירת תוכן האתר
        </Button>
        {error && <span className="text-sm font-bold text-rose-700">{error}</span>}
        {dirty && !saving && <span className="text-sm font-bold text-amber-700">יש שינויים שלא נשמרו</span>}
        {saved && (
          <span className="flex items-center gap-1 text-sm font-bold text-emerald-700">
            <Check className="h-4 w-4" />
            נשמר. האתר מעודכן
          </span>
        )}
      </div>
    </div>
  );
}
