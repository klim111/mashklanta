'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Accessibility,
  Contrast,
  Droplet,
  FileText,
  Link2,
  Minus,
  MousePointer2,
  PauseCircle,
  Plus,
  RotateCcw,
  SunMoon,
  Type,
  WrapText,
  X,
  type LucideIcon,
} from 'lucide-react';
import { DEFAULT_PREFS, MAX_TEXT_SCALE, type A11yPrefs } from './a11yConfig';
import { setA11yPrefs, useA11yPrefs } from './a11yStore';

type Toggle = {
  key: Exclude<keyof A11yPrefs, 'textScale'>;
  label: string;
  icon: LucideIcon;
};

const TOGGLES: Toggle[] = [
  { key: 'contrast', label: 'ניגודיות גבוהה', icon: Contrast },
  { key: 'invert', label: 'ניגודיות הפוכה', icon: SunMoon },
  { key: 'grayscale', label: 'גווני אפור', icon: Droplet },
  { key: 'links', label: 'הדגשת קישורים', icon: Link2 },
  { key: 'readableFont', label: 'גופן קריא', icon: Type },
  { key: 'spacing', label: 'ריווח טקסט', icon: WrapText },
  { key: 'stopMotion', label: 'עצירת אנימציות', icon: PauseCircle },
  { key: 'bigCursor', label: 'סמן עכבר גדול', icon: MousePointer2 },
];

const TEXT_SCALE_LABELS = ['רגיל', '112%', '125%', '150%'];

/** מיקומים אפשריים לאמצע הלשונית, כשבר מגובה המסך, לפי סדר העדפה */
const TAB_SPOTS = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74];
const INTERACTIVE = 'a,button,input,select,textarea,label,[role="button"],[role="tab"],[tabindex]:not([tabindex="-1"])';

/**
 * מוצא לשונית מקום פנוי: הגובה הראשון ברשימה שאין מתחת ללשונית שום רכיב
 * לחיץ. בטלפון כפתורים ברוחב מלא מגיעים עד קצה המסך, ולכן הלשונית זזה
 * מעליהם או מתחתם במקום לכסות אותם.
 */
function findFreeTop(tab: HTMLElement): number {
  const height = window.innerHeight;
  // הלשונית גדלה יחד עם הגדלת הטקסט, ולכן המידות נמדדות בכל פעם
  const { height: TAB_HEIGHT, width: TAB_WIDTH } = tab.getBoundingClientRect();
  for (const spot of TAB_SPOTS) {
    const center = Math.round(height * spot);
    const top = center - TAB_HEIGHT / 2;
    let blocked = false;
    for (const y of [top + 2, center, top + TAB_HEIGHT - 2]) {
      for (const x of [1, TAB_WIDTH / 2, TAB_WIDTH + 4]) {
        // כרטיס לחיץ גדול לא נחשב חסימה: הלשונית נוגעת רק בשוליים שלו
        const hit = document.elementsFromPoint(x, y).find((el) => {
          if (tab.contains(el) || el.closest('[data-a11y-ui]')) return false;
          const target = el.closest(INTERACTIVE);
          return Boolean(target && target.getBoundingClientRect().height < 120);
        });
        if (hit) blocked = true;
      }
    }
    if (!blocked) return center;
  }
  return Math.round(height * TAB_SPOTS[0]);
}

/**
 * דילוג לתוכן הראשי — הקישור הראשון שמקבל פוקוס במקלדת בכל עמוד.
 * מסכים שונים בנויים אחרת, ולכן היעד הוא ה-main של המסך, ואם אין — הכותרת הראשית.
 */
function SkipLink() {
  const skip = (event: React.MouseEvent) => {
    event.preventDefault();
    const target =
      document.querySelector<HTMLElement>('main') ?? document.querySelector<HTMLElement>('h1');
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus();
    target.scrollIntoView({ block: 'start' });
  };

  return (
    <a
      href="#main"
      onClick={skip}
      className="fixed right-3 top-3 z-[100] -translate-y-24 rounded-xl bg-blue-600 px-4 py-2.5 text-button font-bold text-white shadow-lg transition-transform focus:translate-y-0 print:hidden"
    >
      דילוג לתוכן הראשי
    </a>
  );
}

/**
 * תפריט הנגישות של האתר: לשונית קטנה בקצה השמאלי של המסך, באמצע הגובה.
 *
 * הפינות התחתונות תפוסות בכל המסכים (פנייה ליועץ והצ׳אט משמאל, כפתורי הפעולות
 * וחזרה לדף הבית מימין), והחלק העליון הוא הכותרת — לכן הלשונית צמודה לקצה
 * באמצע, צרה מספיק כדי לא לעלות על תוכן, ונפתחת לחלונית מעל הכול.
 */
export function AccessibilityMenu() {
  const prefs = useA11yPrefs();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [tabTop, setTabTop] = useState<number | null>(null);

  // הלשונית מחפשת מקום פנוי כשהגלילה נעצרת, כשהמסך משנה גודל ובמעבר בין מסכים
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const place = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (triggerRef.current) setTabTop(findFreeTop(triggerRef.current));
      }, 150);
    };
    place();
    const observer = new MutationObserver(place);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', place, { passive: true, capture: true });
    window.addEventListener('resize', place);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('scroll', place, { capture: true });
      window.removeEventListener('resize', place);
    };
  }, []);

  const update = (patch: Partial<A11yPrefs>) => setA11yPrefs({ ...prefs, ...patch });

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // פתיחה מעבירה פוקוס לחלונית; Escape ולחיצה מחוץ לה סוגרות
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, close]);

  const changed = JSON.stringify(prefs) !== JSON.stringify(DEFAULT_PREFS);

  return (
    <>
      <SkipLink />

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="תפריט נגישות"
        title="תפריט נגישות"
        data-a11y-ui
        style={tabTop === null ? undefined : { top: tabTop }}
        className="fixed left-0 top-1/2 z-[45] flex h-12 w-7 -translate-y-1/2 items-center justify-center rounded-r-xl bg-blue-700 text-white shadow-lg shadow-blue-900/25 transition-[top] duration-300 print:hidden"
      >
        <Accessibility className="h-5 w-5" aria-hidden="true" />
        {changed && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-300" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          role="dialog"
          aria-labelledby={titleId}
          dir="rtl"
          data-a11y-ui
          className="fixed left-2 top-1/2 z-[70] flex max-h-[calc(100dvh-1.5rem)] w-[min(20rem,calc(100vw-1rem))] -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-right shadow-2xl print:hidden"
        >
          <div className="flex items-center justify-between gap-3 bg-blue-700 px-4 py-3 text-white">
            <h2 id={titleId} className="flex items-center gap-2 text-cta font-black">
              <Accessibility className="h-5 w-5" aria-hidden="true" />
              תפריט נגישות
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="סגירת תפריט הנגישות"
              className="rounded-full p-1.5 transition-colors hover:bg-white/15"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto p-4">
            {/* גודל טקסט */}
            <div className="rounded-2xl border border-slate-200 p-3">
              <p id={`${titleId}-size`} className="text-info font-bold text-slate-900">
                גודל טקסט
              </p>
              <div className="mt-2 flex items-center justify-between gap-2" role="group" aria-labelledby={`${titleId}-size`}>
                <button
                  type="button"
                  onClick={() => update({ textScale: Math.min(MAX_TEXT_SCALE, prefs.textScale + 1) })}
                  disabled={prefs.textScale >= MAX_TEXT_SCALE}
                  aria-label="הגדלת טקסט"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 transition-colors hover:bg-slate-200 disabled:opacity-40"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="text-info font-bold text-slate-700" aria-live="polite">
                  {TEXT_SCALE_LABELS[prefs.textScale]}
                </span>
                <button
                  type="button"
                  onClick={() => update({ textScale: Math.max(0, prefs.textScale - 1) })}
                  disabled={prefs.textScale <= 0}
                  aria-label="הקטנת טקסט"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 transition-colors hover:bg-slate-200 disabled:opacity-40"
                >
                  <Minus className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {TOGGLES.map(({ key, label, icon: Icon }) => {
                const on = prefs[key];
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      update(
                        // שני מצבי הניגודיות סותרים זה את זה
                        key === 'contrast' && !on
                          ? { contrast: true, invert: false }
                          : key === 'invert' && !on
                            ? { invert: true, contrast: false }
                            : { [key]: !on },
                      )
                    }
                    className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center text-2xs font-bold transition-colors ${
                      on
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setA11yPrefs(DEFAULT_PREFS)}
              disabled={!changed}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-button font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              איפוס הגדרות הנגישות
            </button>

            <Link
              href="/accessibility"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 text-button font-bold text-blue-700 underline-offset-4 hover:underline"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              הצהרת נגישות
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
