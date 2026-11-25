'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Loader2, Plus, Save, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MAX_TRACKS,
  normalizePricing,
  trackPriceLabel,
  type PricingConfig,
  type TrackBilling,
  type TrackConfig,
} from '@/lib/pricing-config';
import { SectionCard } from './ui';

const BILLING_LABELS: Record<TrackBilling, string> = {
  ONE_TIME: 'תשלום חד־פעמי',
  MONTHLY: 'לחודש',
  QUOTE: 'לפי הצעת מחיר',
};

const KIND_LABELS: Record<TrackConfig['kind'], string> = {
  PLATFORM: 'מובנה · הגישה לפלטפורמה',
  ADVISORY: 'מובנה · ליווי לפי שלבים',
  CUSTOM: 'מסלול שהוספת',
};

const textareaClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

function newTrack(): TrackConfig {
  return {
    id: `t${Date.now().toString(36)}`,
    kind: 'CUSTOM',
    name: '',
    tagline: '',
    price: null,
    billing: 'ONE_TIME',
    priceNote: '',
    features: [],
    bestFor: '',
    ctaLabel: 'לפרטים ולהזמנה',
    popular: false,
    visible: true,
  };
}

/**
 * "תמחור ומסלולים" בלוח היועץ: מחיר הגישה החודשית (שנגבה ב-HYP) והמסלולים
 * שמוצגים בעמודי התמחור. השמירה חלה מיד על כל האתר ועל התשלום הבא.
 */
export function PricingEditorPanel() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [priceText, setPriceText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/advisor/pricing', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((body: PricingConfig) => {
        setConfig(body);
        setPriceText(String(body.platformPrice));
      })
      .catch(() => setError('לא הצלחנו לטעון את המחירים. רעננו את הדף.'));
  }, []);

  if (!config) {
    return (
      <SectionCard title="תמחור ומסלולים" icon={<Tag className="h-4 w-4" />}>
        {error ? (
          <p className="text-sm font-bold text-rose-700">{error}</p>
        ) : (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
        )}
      </SectionCard>
    );
  }

  const update = (next: PricingConfig) => {
    setConfig(next);
    setSaved(false);
  };
  const updateTrack = (id: string, patch: Partial<TrackConfig>) =>
    update({ ...config, tracks: config.tracks.map((track) => (track.id === id ? { ...track, ...patch } : track)) });
  const move = (index: number, delta: number) => {
    const tracks = [...config.tracks];
    const target = index + delta;
    if (target < 0 || target >= tracks.length) return;
    [tracks[index], tracks[target]] = [tracks[target], tracks[index]];
    update({ ...config, tracks });
  };
  const customCount = config.tracks.filter((track) => track.kind === 'CUSTOM').length;

  const save = async () => {
    const price = Number(priceText.replace(/[,\s₪]/g, ''));
    if (!Number.isFinite(price) || price < 1) {
      setError('מחיר הגישה אינו תקין');
      return;
    }
    const nameless = config.tracks.find((track) => !track.name.trim());
    if (nameless) {
      setError('לכל מסלול צריך שם');
      return;
    }
    const priceless = config.tracks.find(
      (track) => track.kind === 'CUSTOM' && track.billing !== 'QUOTE' && !track.price
    );
    if (priceless) {
      setError(`חסר מחיר במסלול "${priceless.name}". אפשר גם לבחור "לפי הצעת מחיר"`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/advisor/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, platformPrice: Math.round(price) }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = normalizePricing(await response.json());
      setConfig(body);
      setPriceText(String(body.platformPrice));
      setSaved(true);
    } catch {
      setError('השמירה נכשלה. נסו שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <SectionCard title="מחיר הגישה לפלטפורמה" icon={<Tag className="h-4 w-4" />}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold text-slate-600">
            מחיר לחודש (₪)
            <Input
              value={priceText}
              onChange={(event) => {
                setPriceText(event.target.value.replace(/[^\d]/g, '').slice(0, 6));
                setSaved(false);
              }}
              inputMode="numeric"
              dir="ltr"
              className="mt-1 w-32 text-lg font-black"
            />
          </label>
          <p className="max-w-xl text-xs leading-relaxed text-slate-500">
            זה הסכום שנגבה ב-HYP על כל חודש גישה, ומה שמופיע בעמוד התמחור, בעמוד הבית, במסך התשלום ובמייל התזכורת.
            שינוי חל על תשלומים חדשים בלבד: מי שכבר שילם לא מחויב בהפרש.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="המסלולים בעמודי התמחור"
        icon={<Tag className="h-4 w-4" />}
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={customCount >= MAX_TRACKS}
            onClick={() => update({ ...config, tracks: [...config.tracks, newTrack()] })}
          >
            <Plus className="ml-1 h-4 w-4" />
            מסלול חדש
          </Button>
        }
      >
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          הסדר כאן הוא הסדר בעמוד התמחור. מסלול שהוספת מוביל לטופס "היוועצו איתנו" עם שם המסלול, ואת התשלום עליו גובים
          בקישור תשלום מהלשונית "קישורי תשלום".
        </p>
        <div className="space-y-4">
          {config.tracks.map((track, index) => (
            <div
              key={track.id}
              className={`rounded-2xl border p-4 ${track.visible ? 'border-slate-200 bg-white' : 'border-dashed border-slate-300 bg-slate-50'}`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900">{track.name || 'מסלול חדש'}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-500">
                    {KIND_LABELS[track.kind]}
                  </span>
                  <span className="text-xs font-bold text-blue-700">
                    {trackPriceLabel(track, Number(priceText) || config.platformPrice)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton label="למעלה" onClick={() => move(index, -1)} disabled={index === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="למטה" onClick={() => move(index, 1)} disabled={index === config.tracks.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </IconButton>
                  {track.kind !== 'PLATFORM' && (
                    <IconButton
                      label={track.visible ? 'הסתרה מעמודי התמחור' : 'הצגה בעמודי התמחור'}
                      onClick={() => updateTrack(track.id, { visible: !track.visible })}
                    >
                      {track.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </IconButton>
                  )}
                  {track.kind === 'CUSTOM' && (
                    <IconButton
                      label="מחיקה"
                      onClick={() => update({ ...config, tracks: config.tracks.filter((item) => item.id !== track.id) })}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </IconButton>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="שם המסלול">
                  <Input value={track.name} maxLength={60} onChange={(e) => updateTrack(track.id, { name: e.target.value })} />
                </Field>
                <Field label="משפט פתיחה">
                  <Input
                    value={track.tagline}
                    maxLength={200}
                    onChange={(e) => updateTrack(track.id, { tagline: e.target.value })}
                  />
                </Field>

                {track.kind === 'CUSTOM' && (
                  <>
                    <Field label="סוג התשלום">
                      <select
                        value={track.billing}
                        onChange={(e) => updateTrack(track.id, { billing: e.target.value as TrackBilling })}
                        className={textareaClass}
                      >
                        {(Object.keys(BILLING_LABELS) as TrackBilling[]).map((billing) => (
                          <option key={billing} value={billing}>
                            {BILLING_LABELS[billing]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {track.billing !== 'QUOTE' && (
                      <Field label="מחיר (₪)">
                        <Input
                          value={track.price ?? ''}
                          inputMode="numeric"
                          dir="ltr"
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                            updateTrack(track.id, { price: digits ? Number(digits) : null });
                          }}
                        />
                      </Field>
                    )}
                  </>
                )}

                <Field label="שורה מתחת למחיר">
                  <Input
                    value={track.priceNote}
                    maxLength={160}
                    placeholder={track.billing === 'ONE_TIME' ? 'תשלום חד־פעמי' : ''}
                    onChange={(e) => updateTrack(track.id, { priceNote: e.target.value })}
                  />
                </Field>
                <Field label="למי זה מתאים">
                  <Input
                    value={track.bestFor}
                    maxLength={200}
                    onChange={(e) => updateTrack(track.id, { bestFor: e.target.value })}
                  />
                </Field>
                <Field label="מה כלול (שורה לכל סעיף)" wide>
                  <textarea
                    rows={4}
                    value={track.features.join('\n')}
                    onChange={(e) => updateTrack(track.id, { features: e.target.value.split('\n') })}
                    className={textareaClass}
                  />
                </Field>
                <Field label="טקסט הכפתור">
                  <Input
                    value={track.ctaLabel}
                    maxLength={40}
                    onChange={(e) => updateTrack(track.id, { ctaLabel: e.target.value })}
                  />
                </Field>
                <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={track.popular}
                    onChange={(e) => updateTrack(track.id, { popular: e.target.checked })}
                  />
                  תווית "הכי נבחר"
                </label>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* השמירה בצד ימין — בצד שמאל צף כפתור ההתכתבות */}
      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Save className="ml-1 h-4 w-4" />}
          שמירת המחירים והמסלולים
        </Button>
        {error && <span className="text-sm font-bold text-rose-700">{error}</span>}
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

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block text-xs font-bold text-slate-600 ${wide ? 'md:col-span-2' : ''}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function IconButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
