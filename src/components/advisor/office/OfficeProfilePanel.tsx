'use client';

/* eslint-disable @next/next/no-img-element -- תמונות שהיועץ העלה, מוגשות מ-/api/site-images */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  Plus,
  Power,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { MAX_SERVICES, OFFICE_COLORS, OFFICE_PATH_PREFIX, normalizeSlug, type OfficeProfile } from '@/lib/office';
import { officeStyle } from '@/components/office/officeTheme';
import { OfficeAvatar, OfficeLogo } from '@/components/office/OfficeAvatar';
import { SectionCard } from '../ui';
import { uploadOfficeImage, type AdvisorOfficeView, type OfficeUpdate } from './useAdvisorOffice';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15';

interface Draft {
  name: string;
  slug: string;
  profile: OfficeProfile;
}

function draftOf(office: AdvisorOfficeView): Draft {
  return { name: office.name, slug: office.slug, profile: office.profile };
}

function sameDraft(a: Draft, b: Draft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * "המשרד שלי": הפרטים והמיתוג של דף המשרד, והפעלה שלו. מימין הטופס, משמאל
 * תצוגה חיה של הדף כפי שהלקוח יראה אותו.
 */
export function OfficeProfilePanel({
  office,
  publicUrl,
  save,
}: {
  office: AdvisorOfficeView;
  publicUrl: string;
  save: (update: OfficeUpdate) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(office));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const stored = useMemo(() => draftOf(office), [office]);
  const dirty = !sameDraft(draft, stored);

  // אחרי שמירה — מה שהשרת החזיר (מנורמל) הוא הטיוטה החדשה
  useEffect(() => setDraft(draftOf(office)), [office]);

  const setProfile = <K extends keyof OfficeProfile>(key: K, value: OfficeProfile[K]) => {
    setSaved(false);
    setDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  };

  // הכתובת המלאה מהשרת — בכתובת הציבורית של האתר, גם כשהיועץ עובד מכתובת היועצים
  const link = publicUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}${office.path}`;

  const submit = async (extra: OfficeUpdate = {}) => {
    setBusy(true);
    setError(null);
    const failure = await save({ name: draft.name, slug: normalizeSlug(draft.slug), profile: draft.profile, ...extra });
    setBusy(false);
    if (failure) setError(failure);
    else setSaved(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('העתיקו את הקישור:', link);
    }
  };

  return (
    <div className="start-aligned grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
        {/* מצב המשרד והקישור */}
        <section
          className={`rounded-2xl border p-4 shadow-sm ${
            office.published ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-base font-black text-slate-900">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${office.published ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  aria-hidden
                />
                {office.published ? 'המשרד פעיל' : 'המשרד עוד לא פעיל'}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {office.published
                  ? 'הדף פתוח לכולם, ולקוחות שנרשמים דרכו משויכים אליכם. האזור האישי שלהם מוצג במיתוג שלכם.'
                  : 'רק אתם רואים את הדף. כשתפעילו, הלקוחות יראו את השם, הלוגו והצבע שלכם באזור האישי.'}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit({ published: !office.published })}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-black shadow-sm transition-colors disabled:opacity-60 ${
                office.published
                  ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <Power className="h-4 w-4" aria-hidden />
              {office.published ? 'השבתת המשרד' : dirty ? 'שמירה והפעלה' : 'הפעלת המשרד'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              dir="ltr"
              className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700"
            >
              {link}
            </span>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {copied ? 'הועתק' : 'העתקה'}
            </button>
            <a
              href={`${OFFICE_PATH_PREFIX}${office.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              צפייה בדף
            </a>
          </div>
        </section>

        <SectionCard title="שם המשרד והקישור">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">שם המשרד</span>
              <input
                value={draft.name}
                onChange={(event) => {
                  setSaved(false);
                  setDraft((current) => ({ ...current, name: event.target.value }));
                }}
                maxLength={60}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">הקישור לדף</span>
              <span
                dir="ltr"
                className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-500"
              >
                <span className="shrink-0 px-2 text-xs text-slate-400">{OFFICE_PATH_PREFIX}</span>
                <input
                  value={draft.slug}
                  onChange={(event) => {
                    setSaved(false);
                    // בזמן ההקלדה רק מסננים תווים; הניקוי המלא (מקפים בקצוות) בשמירה
                    const slug = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setDraft((current) => ({ ...current, slug }));
                  }}
                  maxLength={30}
                  className="min-w-0 flex-1 bg-white px-2 py-2 text-left text-sm text-slate-900 outline-none"
                />
              </span>
              <span className="mt-1 block text-2xs text-slate-500">
                אותיות באנגלית, ספרות ומקפים. שינוי הקישור מבטל את הקישור הקודם.
              </span>
            </label>
          </div>
        </SectionCard>

        <SectionCard title="מי אתם">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">השם שמוצג ללקוחות</span>
              <input
                value={draft.profile.advisorName}
                onChange={(event) => setProfile('advisorName', event.target.value)}
                maxLength={60}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">תואר</span>
              <input
                value={draft.profile.advisorTitle}
                onChange={(event) => setProfile('advisorTitle', event.target.value)}
                maxLength={60}
                placeholder="יועץ משכנתאות"
                className={inputClass}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-slate-700">משפט הפתיחה בדף</span>
              <input
                value={draft.profile.headline}
                onChange={(event) => setProfile('headline', event.target.value)}
                maxLength={140}
                className={inputClass}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-slate-700">
                קצת עליכם <span className="font-normal text-slate-400">(רשות)</span>
              </span>
              <textarea
                value={draft.profile.about}
                onChange={(event) => setProfile('about', event.target.value)}
                maxLength={900}
                rows={4}
                placeholder="ניסיון, גישה, למי אתם מתאימים במיוחד"
                className={inputClass}
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard title="השירותים שלכם">
          <div className="space-y-2">
            {draft.profile.services.map((service, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={service}
                  onChange={(event) =>
                    setProfile(
                      'services',
                      draft.profile.services.map((item, at) => (at === index ? event.target.value : item)),
                    )
                  }
                  maxLength={80}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    setProfile(
                      'services',
                      draft.profile.services.filter((_, at) => at !== index),
                    )
                  }
                  aria-label="הסרת השירות"
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {draft.profile.services.length < MAX_SERVICES && (
              <button
                type="button"
                onClick={() => setProfile('services', [...draft.profile.services, ''])}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                הוספת שירות
              </button>
            )}
          </div>
        </SectionCard>

        <SectionCard title="פרטי קשר">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">טלפון</span>
              <input
                value={draft.profile.phone}
                onChange={(event) => setProfile('phone', event.target.value)}
                dir="ltr"
                inputMode="tel"
                className={`${inputClass} text-right`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">וואטסאפ</span>
              <input
                value={draft.profile.whatsapp}
                onChange={(event) => setProfile('whatsapp', event.target.value)}
                dir="ltr"
                inputMode="tel"
                className={`${inputClass} text-right`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">מייל</span>
              <input
                value={draft.profile.email}
                onChange={(event) => setProfile('email', event.target.value)}
                dir="ltr"
                type="email"
                className={`${inputClass} text-right`}
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard title="מיתוג">
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageField
              label="לוגו"
              hint="PNG עם רקע שקוף נראה הכי טוב. עד 2MB."
              value={draft.profile.logoUrl}
              onChange={(url) => setProfile('logoUrl', url)}
              preview={(url) => <img src={url} alt="לוגו" className="h-12 w-auto max-w-[10rem] object-contain" />}
            />
            <ImageField
              label="תמונה שלכם"
              hint="תמונת פנים ריבועית. עד 2MB."
              value={draft.profile.photoUrl}
              onChange={(url) => setProfile('photoUrl', url)}
              preview={(url) => <img src={url} alt="תמונה" className="h-12 w-12 rounded-full object-cover" />}
            />
          </div>
          <p className="mb-2 mt-4 text-xs font-bold text-slate-700">הצבע של המשרד</p>
          <div className="flex flex-wrap gap-2">
            {OFFICE_COLORS.map((color) => {
              const active = draft.profile.color === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setProfile('color', color.id)}
                  title={color.label}
                  aria-label={color.label}
                  aria-pressed={active}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 transition-shadow ${
                    active ? 'ring-2 ring-slate-900' : 'hover:ring-2 hover:ring-slate-300'
                  }`}
                  style={{ backgroundColor: color.main }}
                >
                  {active && <Check className="h-4 w-4 text-white" aria-hidden />}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* שמירה — צמודה לתחתית המסך כשיש שינויים */}
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            שמירת השינויים
          </button>
          {dirty && !busy && (
            <button
              type="button"
              onClick={() => {
                setDraft(stored);
                setError(null);
              }}
              className="text-sm font-bold text-slate-500 hover:text-slate-800"
            >
              ביטול
            </button>
          )}
          {saved && !dirty && (
            <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              נשמר
            </span>
          )}
          {error && (
            <span className="text-sm font-semibold text-red-600" role="alert">
              {error}
            </span>
          )}
        </div>
      </div>

      <OfficePreview draft={draft} />
    </div>
  );
}

/** העלאת לוגו או תמונה, עם תצוגה והסרה */
function ImageField({
  label,
  hint,
  value,
  onChange,
  preview,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (url: string | null) => void;
  preview: (url: string) => React.ReactNode;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await uploadOfficeImage(file);
    setBusy(false);
    if ('error' in result) setError(result.error);
    else onChange(result.url);
  };

  return (
    <div>
      <p className="mb-1 text-xs font-bold text-slate-700">{label}</p>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3">
        {value ? preview(value) : <span className="text-xs text-slate-400">עדיין לא הועלה</span>}
        <div className="mr-auto flex items-center gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
            )}
            {value ? 'החלפה' : 'העלאה'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={`הסרת ה${label}`}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      <p className={`mt-1 text-2xs ${error ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{error ?? hint}</p>
    </div>
  );
}

/** תצוגה חיה, מוקטנת, של ראש דף המשרד */
function OfficePreview({ draft }: { draft: Draft }) {
  const { profile } = draft;
  const advisor = profile.advisorName || draft.name;
  const services = profile.services.filter((service) => service.trim());
  return (
    <aside className="xl:sticky xl:top-20 xl:self-start">
      <p className="mb-2 text-xs font-bold text-slate-500">כך ייראה הדף</p>
      <div
        style={officeStyle(profile.color)}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <OfficeLogo
            name={draft.name}
            logoUrl={profile.logoUrl}
            className="h-6"
            textClassName="truncate text-sm font-black text-slate-900"
          />
          <span className="shrink-0 rounded-full bg-[var(--office)] px-2.5 py-1 text-2xs font-bold text-white">
            פתיחת תיק
          </span>
        </div>
        <div className="bg-[var(--office-soft)] px-4 py-5">
          <div className="flex items-center gap-2">
            <OfficeAvatar name={advisor} photoUrl={profile.photoUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{advisor || 'השם שלכם'}</p>
              <p className="truncate text-2xs text-slate-600">{profile.advisorTitle}</p>
            </div>
          </div>
          <p className="mt-3 text-base font-black leading-snug text-slate-900">{profile.headline}</p>
          <span className="mt-3 inline-flex rounded-lg bg-[var(--office)] px-3 py-1.5 text-xs font-bold text-white">
            פתיחת תיק אישי
          </span>
          {services.length > 0 && (
            <ul className="mt-3 space-y-1">
              {services.slice(0, 4).map((service) => (
                <li key={service} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--office)]" aria-hidden />
                  <span className="truncate">{service}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
