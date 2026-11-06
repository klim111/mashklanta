'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { bannersForPath, type BannerPlacement, type BannerTone, type SiteBanner, type SiteContent } from '@/lib/site-content';

const TONES: Record<BannerTone, { box: string; button: string; muted: string }> = {
  blue: { box: 'bg-blue-600 text-white', button: 'bg-white text-blue-700 hover:bg-blue-50', muted: 'text-blue-100' },
  emerald: {
    box: 'bg-emerald-600 text-white',
    button: 'bg-white text-emerald-700 hover:bg-emerald-50',
    muted: 'text-emerald-50',
  },
  amber: { box: 'bg-amber-400 text-slate-900', button: 'bg-slate-900 text-white hover:bg-slate-800', muted: 'text-slate-800' },
  rose: { box: 'bg-rose-600 text-white', button: 'bg-white text-rose-700 hover:bg-rose-50', muted: 'text-rose-50' },
  slate: {
    box: 'bg-slate-100 text-slate-900 border-y border-slate-200',
    button: 'bg-blue-600 text-white hover:bg-blue-700',
    muted: 'text-slate-600',
  },
  dark: { box: 'bg-slate-900 text-white', button: 'bg-white text-slate-900 hover:bg-slate-100', muted: 'text-slate-300' },
};

const DISMISSED_KEY = 'mashkalanta:dismissed-banners';

function readDismissed(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function BannerLink({ banner, className }: { banner: SiteBanner; className: string }) {
  if (!banner.linkUrl || !banner.linkLabel) return null;
  if (banner.linkUrl.startsWith('/')) {
    return (
      <Link href={banner.linkUrl} className={className}>
        {banner.linkLabel}
      </Link>
    );
  }
  return (
    <a href={banner.linkUrl} target="_blank" rel="noopener sponsored" className={className}>
      {banner.linkLabel}
    </a>
  );
}

/** תמונה בלבד, בלי טקסט וכפתור — כל הבאנר הוא הקישור */
function ImageOnly({ banner, className }: { banner: SiteBanner; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  const image = <img src={banner.imageUrl} alt={banner.name || 'פרסומת'} className={className} />;
  if (!banner.linkUrl) return image;
  if (banner.linkUrl.startsWith('/')) return <Link href={banner.linkUrl}>{image}</Link>;
  return (
    <a href={banner.linkUrl} target="_blank" rel="noopener sponsored">
      {image}
    </a>
  );
}

/** באנר אחד. משמש גם את התצוגה המקדימה בעורך */
export function SiteBannerView({ banner, onDismiss }: { banner: SiteBanner; onDismiss?: () => void }) {
  const tone = TONES[banner.tone];
  const imageOnly = Boolean(banner.imageUrl) && !banner.title && !banner.text;
  const dismiss = banner.dismissible && onDismiss && (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="סגירת הבאנר"
      className="absolute left-2 top-2 rounded-full bg-black/20 p-1 text-white hover:bg-black/30"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );

  if (banner.placement === 'popup') {
    return (
      <div className={`relative w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl shadow-2xl ${tone.box}`}>
        {banner.imageUrl &&
          (imageOnly ? (
            <ImageOnly banner={banner} className="block max-h-80 w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner.imageUrl} alt="" className="block max-h-44 w-full object-cover" />
          ))}
        {!imageOnly && (
          <div className="space-y-2 p-4 text-right">
            {banner.title && <p className="text-base font-black leading-snug">{banner.title}</p>}
            {banner.text && <p className={`whitespace-pre-line text-sm leading-relaxed ${tone.muted}`}>{banner.text}</p>}
            <BannerLink
              banner={banner}
              className={`mt-1 inline-flex rounded-full px-4 py-2 text-sm font-bold transition-colors ${tone.button}`}
            />
          </div>
        )}
        {dismiss}
      </div>
    );
  }

  return (
    <div className={`relative print:hidden ${tone.box}`}>
      {imageOnly ? (
        <div className="flex justify-center">
          <ImageOnly banner={banner} className="block max-h-40 w-auto max-w-full object-contain" />
        </div>
      ) : (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-10 py-2.5 text-center">
          {banner.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner.imageUrl} alt="" className="h-10 w-auto rounded-md object-contain" />
          )}
          <div className="min-w-0">
            {banner.title && <span className="text-sm font-black">{banner.title}</span>}
            {banner.title && banner.text && ' '}
            {banner.text && <span className={`text-sm ${tone.muted}`}>{banner.text}</span>}
          </div>
          <BannerLink
            banner={banner}
            className={`inline-flex shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${tone.button}`}
          />
        </div>
      )}
      {dismiss}
    </div>
  );
}

/**
 * הבאנרים של "תוכן האתר" שמוגדרים לעמוד הנוכחי, במיקום אחד: פס בראש העמוד, פס
 * בתחתיתו, או חלונית צפה. באנר שהגולש סגר לא חוזר אצלו.
 */
export function SiteBanners({ content, placement }: { content: SiteContent; placement: BannerPlacement }) {
  const pathname = usePathname() ?? '/';
  const [dismissed, setDismissed] = useState<string[] | null>(null);

  useEffect(() => setDismissed(readDismissed()), []);

  // חלונית צפה מוצגת רק אחרי שידוע אם נסגרה בעבר
  if (placement === 'popup' && dismissed === null) return null;
  const banners = bannersForPath(content, pathname, placement).filter((banner) => !dismissed?.includes(banner.id));
  if (banners.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...(dismissed ?? []), id];
    setDismissed(next);
    try {
      window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next.slice(-100)));
    } catch {
      /* אחסון חסום — הבאנר ייסגר עד הרענון הבא */
    }
  };

  if (placement === 'popup') {
    const [banner] = banners;
    return (
      <div dir="rtl" className="fixed bottom-24 right-5 z-40 print:hidden">
        <SiteBannerView banner={banner} onDismiss={() => dismiss(banner.id)} />
      </div>
    );
  }

  return (
    <div dir="rtl">
      {banners.map((banner) => (
        <SiteBannerView key={banner.id} banner={banner} onDismiss={() => dismiss(banner.id)} />
      ))}
    </div>
  );
}
