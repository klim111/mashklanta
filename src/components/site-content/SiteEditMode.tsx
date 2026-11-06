'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Loader2, MousePointerClick, Navigation, PenLine, RotateCcw, X } from 'lucide-react';
import {
  ALL_PAGES,
  normalizeSiteContent,
  normalizeText,
  pageKeyForPath,
  sitePageTitle,
  type SiteContent,
} from '@/lib/site-content';
import { originalTextOf, SKIP_SELECTOR } from './SiteContentRuntime';

interface Target {
  node: Text;
  original: string;
  rect: DOMRect;
}

/** צומת הטקסט שמתחת לסמן. בכפתורים ובשדות הדפדפן מחזיר את האלמנט — אז לוקחים את הטקסט שבו */
function textNodeAt(x: number, y: number): Text | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
  };
  let node: Node | null = null;
  if (doc.caretPositionFromPoint) node = doc.caretPositionFromPoint(x, y)?.offsetNode ?? null;
  else if (document.caretRangeFromPoint) node = document.caretRangeFromPoint(x, y)?.startContainer ?? null;

  const element = document.elementFromPoint(x, y);
  if (!element || element.closest(SKIP_SELECTOR)) return null;
  if (node?.nodeType === Node.TEXT_NODE && (node.nodeValue ?? '').trim() && element.contains(node)) return node as Text;

  // הטקסט הראשון בתוך האלמנט שמתחת לסמן (כפתור, תווית)
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if ((text.nodeValue ?? '').trim()) return text as Text;
  }
  return null;
}

function rectOf(node: Text): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

/**
 * "עריכה על הדף": היועץ מסתובב באתר, לוחץ על כל טקסט ומחליף אותו — בעמוד הזה
 * או בכל האתר. השמירה מתעדכנת מיד לכל הגולשים. מצב "ניווט" מאפשר ללחוץ על
 * קישורים וכפתורים כרגיל כדי להגיע למסך אחר.
 */
export function SiteEditMode({
  content,
  onContentChange,
  onExit,
}: {
  content: SiteContent;
  onContentChange: (content: SiteContent) => void;
  onExit: () => void;
}) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const page = pageKeyForPath(pathname);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [picking, setPicking] = useState(true);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [draft, setDraft] = useState('');
  const [scope, setScope] = useState<string>(page);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // רק יועץ מחובר רואה את סרגל העריכה
  useEffect(() => {
    fetch('/api/advisor/site-content', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((body: unknown) => {
        onContentChange(normalizeSiteContent(body));
        setAllowed(true);
      })
      .catch(() => {
        setAllowed(false);
        onExit();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!allowed || !picking) {
      setHover(null);
      return;
    }
    // כל עוד העריכה פעילה, לחיצה בעמוד לא מפעילה קישורים וכפתורים — היא בוחרת טקסט
    const onMove = (event: MouseEvent) => {
      const node = textNodeAt(event.clientX, event.clientY);
      setHover(node ? rectOf(node) : null);
    };
    const block = (event: Event) => {
      if ((event.target as Element | null)?.closest?.('[data-site-content-skip]')) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.('[data-site-content-skip]')) return;
      event.preventDefault();
      event.stopPropagation();
      const node = textNodeAt(event.clientX, event.clientY);
      if (!node) return;
      const original = normalizeText(originalTextOf(node));
      const pageRule = content.texts.find((rule) => rule.page === page && rule.from === original);
      const globalRule = content.texts.find((rule) => rule.page === ALL_PAGES && rule.from === original);
      setTarget({ node, original, rect: rectOf(node) });
      setDraft(normalizeText(node.nodeValue ?? ''));
      setScope(pageRule || !globalRule ? page : ALL_PAGES);
      setMessage(null);
    };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mousedown', block, true);
    document.addEventListener('pointerdown', block, true);
    document.addEventListener('submit', block, true);
    const onScroll = () => setTarget((current) => (current ? { ...current, rect: rectOf(current.node) } : current));
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('mousedown', block, true);
      document.removeEventListener('pointerdown', block, true);
      document.removeEventListener('submit', block, true);
    };
  }, [allowed, picking, content, page]);

  useEffect(() => {
    if (target) textareaRef.current?.focus();
  }, [target]);

  if (!allowed) return null;

  const save = async (to: string) => {
    if (!target) return;
    setSaving(true);
    try {
      // שינוי היקף: ההחלפה בהיקף הקודם נמחקת, כדי שלא יישארו שתיים
      const otherScope = scope === ALL_PAGES ? page : ALL_PAGES;
      const send = (pageKey: string, value: string) =>
        fetch('/api/advisor/site-content', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: pageKey, from: target.original, to: value }),
        }).then((response) => (response.ok ? response.json() : Promise.reject(response.status)));
      let saved: unknown = await send(scope, to);
      if (content.texts.some((rule) => rule.page === otherScope && rule.from === target.original)) {
        saved = await send(otherScope, '');
      }
      onContentChange(normalizeSiteContent(saved));
      setTarget(null);
      setMessage(to.trim() ? 'נשמר. השינוי מופיע באתר' : 'הטקסט המקורי הוחזר');
    } catch {
      setMessage('השמירה נכשלה. נסו שוב.');
    } finally {
      setSaving(false);
    }
  };

  const changesHere = content.texts.filter((rule) => rule.page === page).length;

  // חלון העריכה ליד הטקסט, בתוך גבולות המסך
  const popoverTop = target ? Math.min(Math.max(target.rect.bottom + 8, 72), window.innerHeight - 300) : 0;
  const popoverLeft = target
    ? Math.min(Math.max(target.rect.left + target.rect.width / 2 - 180, 8), window.innerWidth - 368)
    : 0;

  return (
    <div data-site-content-skip dir="rtl" className="print:hidden">
      {hover && !target && (
        <div
          className="pointer-events-none fixed z-[89] rounded-md outline outline-2 outline-offset-2 outline-fuchsia-500"
          style={{ top: hover.top, left: hover.left, width: hover.width, height: hover.height }}
        />
      )}
      {target && (
        <div
          className="pointer-events-none fixed z-[89] rounded-md bg-fuchsia-500/10 outline outline-2 outline-offset-2 outline-fuchsia-600"
          style={{ top: target.rect.top, left: target.rect.left, width: target.rect.width, height: target.rect.height }}
        />
      )}

      <div className="fixed left-1/2 top-3 z-[90] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm text-white shadow-2xl">
        <PenLine className="h-4 w-4 text-fuchsia-300" />
        <span className="font-black">עריכת תוכן</span>
        <span className="text-xs text-slate-300">
          {sitePageTitle(page)}
          {changesHere > 0 && ` · ${changesHere} שינויים בעמוד`}
        </span>
        <div className="flex overflow-hidden rounded-full border border-slate-600 text-xs font-bold">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className={`flex items-center gap-1 px-2.5 py-1 ${picking ? 'bg-fuchsia-500 text-white' : 'text-slate-300'}`}
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            לחיצה עורכת טקסט
          </button>
          <button
            type="button"
            onClick={() => {
              setPicking(false);
              setTarget(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 ${!picking ? 'bg-fuchsia-500 text-white' : 'text-slate-300'}`}
          >
            <Navigation className="h-3.5 w-3.5" />
            ניווט באתר
          </button>
        </div>
        {message && <span className="text-xs font-bold text-emerald-300">{message}</span>}
        {!pathname.startsWith('/advisor-dashboard') && (
          <button
            type="button"
            onClick={() => {
              onExit();
              router.push('/advisor-dashboard');
            }}
            className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold hover:bg-white/20"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            חזרה ללוח הבקרה
          </button>
        )}
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold hover:bg-white/20"
        >
          <X className="h-3.5 w-3.5" />
          יציאה מהעריכה
        </button>
      </div>

      {target && (
        <div
          role="dialog"
          aria-label="עריכת טקסט"
          className="fixed z-[91] w-[22.5rem] max-w-[calc(100vw-1rem)] space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-right text-slate-900 shadow-2xl"
          style={{ top: popoverTop, left: popoverLeft }}
        >
          <div>
            <p className="text-2xs font-bold text-slate-500">הטקסט המקורי</p>
            <p className="mt-0.5 max-h-20 overflow-y-auto text-xs leading-relaxed text-slate-600">{target.original}</p>
          </div>
          <label className="block text-xs font-bold text-slate-600">
            הטקסט החדש
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={Math.min(6, Math.max(2, Math.ceil(draft.length / 40)))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100"
            />
          </label>
          <fieldset className="space-y-1 text-xs">
            <legend className="mb-1 font-bold text-slate-600">איפה להחליף</legend>
            <label className="flex items-center gap-2">
              <input type="radio" checked={scope === page} onChange={() => setScope(page)} />
              רק בעמוד הזה ({sitePageTitle(page)})
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={scope === ALL_PAGES} onChange={() => setScope(ALL_PAGES)} />
              בכל האתר, בכל מקום שהטקסט הזה מופיע
            </label>
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => save(draft)}
              className="inline-flex items-center gap-1 rounded-xl bg-fuchsia-600 px-3 py-2 text-sm font-bold text-white hover:bg-fuchsia-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              שמירה
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save('')}
              className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              החזרת המקור
            </button>
            <button
              type="button"
              onClick={() => setTarget(null)}
              className="mr-auto rounded-xl px-2 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
