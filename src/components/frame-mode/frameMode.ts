'use client';

/**
 * החלונות המיוחדים של הפגישות — מה החלון הזה, ואיך הוא מדבר עם השרת.
 *
 * שלושה סוגים של חלון מציגים את הפלטפורמה כמו שלקוח רשום רואה אותה, בלי
 * לגעת בחשבון של מי שיושב מול המסך:
 *
 * - `visit` — הביקור הווירטואלי של היועץ בשיחת וידאו: הפלטפורמה במצב הדגמה,
 *   על הפרסונה ועל השרת המדומה של ההדגמה (src/demo/sandbox). שום דבר לא נשמר.
 * - `guest` — הכלים שהאורח בפגישה בלינק חד-פעמי פותח מכפתור הפעולות. אותו
 *   ארגז חול: מה שהאורח מזין חי בזיכרון של החלון ונעלם כשהפגישה נגמרת.
 * - `act` — תיק לקוח מתעניין שהיועץ פתח (src/lib/act-as.ts): כל בקשה יוצאת עם
 *   מזהה הכרטיס, השרת עונה כאילו הלקוח מחובר, ומה שהיועץ מזין נשמר תחת הלקוח.
 *
 * הסוג נקבע בשם החלון (`window.name`): ה-iframe שבשיחה מקבל אותו בתכונה
 * `name`, ולשונית נפתחת עם `window.open(url, name)`. השם נשאר לאורך כל
 * הניווט באותו חלון, גם אחרי רענון, ואינו עובר לחלונות אחרים של היועץ.
 *
 * ההתקנה סינכרונית, בזמן טעינת המודול — לפני שספק ה-session שולח את הבקשה
 * הראשונה שלו.
 */

import { useSyncExternalStore } from 'react';
import { ACT_AS_HEADER, ACT_AS_PARAM, validClientId } from '@/lib/act-as-shared';
import { FRAME_HEADER, demoPathFor } from '@/lib/frame-paths';

export type FrameMode = { kind: 'visit' } | { kind: 'guest' } | { kind: 'act'; clientId: string };

export const VISIT_FRAME_NAME = 'mk-visit';
export const GUEST_FRAME_NAME = 'mk-guest';
const ACT_PREFIX = 'mk-act:';

export function actFrameName(clientId: string): string {
  return `${ACT_PREFIX}${clientId}`;
}

/** הכתובת שפותחת את תיק הלקוח המתעניין בחלון משלו */
export function actFrameUrl(clientId: string, path = '/dashboard/client-file'): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${ACT_AS_PARAM}=${encodeURIComponent(clientId)}`;
}

function parseName(name: string): FrameMode | null {
  if (name === VISIT_FRAME_NAME) return { kind: 'visit' };
  if (name === GUEST_FRAME_NAME) return { kind: 'guest' };
  if (name.startsWith(ACT_PREFIX)) {
    const clientId = name.slice(ACT_PREFIX.length);
    if (validClientId(clientId)) return { kind: 'act', clientId };
  }
  return null;
}

let mode: FrameMode | null = null;
let detected = false;

/** סוג החלון הנוכחי, או null בחלון רגיל של האתר */
export function frameMode(): FrameMode | null {
  if (detected || typeof window === 'undefined') return mode;
  detected = true;
  try {
    mode = parseName(window.name || '');
    if (!mode) {
      // הטעינה הראשונה של לשונית שנפתחה בלי שם — הפרמטר בכתובת קובע
      const param = new URLSearchParams(window.location.search).get(ACT_AS_PARAM);
      if (validClientId(param)) {
        window.name = actFrameName(param);
        mode = { kind: 'act', clientId: param };
      }
    }
  } catch {
    mode = null;
  }
  return mode;
}

function resolveUrl(input: RequestInfo | URL): URL | null {
  try {
    if (typeof input === 'string') return new URL(input, window.location.href);
    if (input instanceof URL) return input;
    return new URL(input.url, window.location.href);
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** רישום ביקורים לא יוצא מהחלונות האלה: הם אינם ביקור של לקוח באתר */
function isTracking(url: URL): boolean {
  return url.pathname === '/api/track' || url.pathname.startsWith('/api/track/');
}

function withHeader(input: RequestInfo | URL, init: RequestInit | undefined, name: string, value: string) {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  headers.set(name, value);
  return { ...init, headers };
}

function installMemoryStorage() {
  (['localStorage', 'sessionStorage'] as const).forEach((name) => {
    const map = new Map<string, string>();
    const storage: Storage = {
      get length() {
        return map.size;
      },
      clear: () => map.clear(),
      getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
      key: (index) => Array.from(map.keys())[index] ?? null,
      removeItem: (key) => {
        map.delete(key);
      },
      setItem: (key, value) => {
        map.set(String(key), String(value));
      },
    };
    try {
      Object.defineProperty(window, name, { configurable: true, enumerable: true, get: () => storage });
    } catch {
      /* דפדפן שלא מאפשר להחליף — החלון עובד, בלי הבידוד */
    }
  });
}

/** קישורים רגילים (לא של Next) לאזורים המחוברים — מנותבים בתוך החלון ולא בורחים ממנו */
function installLinkGuard(map: (path: string) => string | null) {
  document.addEventListener(
    'click',
    (event) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || event.defaultPrevented) return;
      const url = resolveUrl(anchor.href);
      if (!url || url.origin !== window.location.origin) return;
      const next = map(url.pathname);
      if (next === null && anchor.target !== '_blank') return;
      event.preventDefault();
      window.location.assign(next ?? `${url.pathname}${url.search}${url.hash}`);
    },
    true
  );
}

function installActAs(clientId: string) {
  installMemoryStorage();
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveUrl(input);
    if (!url || url.origin !== window.location.origin) return originalFetch(input, init);
    if (isTracking(url)) return new Response(null, { status: 204 });
    if (url.pathname === '/api/auth/session') {
      return originalFetch('/api/act-as/session', withHeader('/api/act-as/session', { cache: 'no-store' }, ACT_AS_HEADER, clientId));
    }
    // התנתקות בחלון הזה הייתה מנתקת את היועץ עצמו
    if (url.pathname === '/api/auth/signout') return json({ url: '/' });
    if (url.pathname === '/api/auth/csrf') return originalFetch(input, init);
    return originalFetch(input, withHeader(input, init, ACT_AS_HEADER, clientId));
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const sameOrigin = new WeakSet<XMLHttpRequest>();
  XMLHttpRequest.prototype.open = function open(this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    const resolved = resolveUrl(url);
    if (resolved && resolved.origin === window.location.origin) sameOrigin.add(this);
    return (originalOpen as (this: XMLHttpRequest, ...args: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.send = function send(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    if (sameOrigin.has(this)) {
      try {
        this.setRequestHeader(ACT_AS_HEADER, clientId);
      } catch {
        /* הבקשה כבר נשלחה */
      }
    }
    return originalSend.call(this, body);
  };

  const originalBeacon = navigator.sendBeacon?.bind(navigator);
  if (originalBeacon) {
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const resolved = resolveUrl(url);
      if (resolved && resolved.origin === window.location.origin) return true;
      return originalBeacon(url, data);
    };
  }

  // אזור היועץ לא נפתח בתוך החלון של הלקוח
  installLinkGuard((path) => (path.startsWith('/advisor-dashboard') ? actFrameUrl(clientId, '/dashboard') : null));
}

/** ארגז החול של ההדגמה — נטען בעצלות; בקשות שיוצאות לפני שנטען ממתינות לו */
function installSandbox(kind: 'visit' | 'guest') {
  installMemoryStorage();
  const router = import('@/demo/sandbox/api-router').then((module) => ({
    router: new module.DemoApiRouter({}),
    isPassthrough: module.isPassthrough,
  }));
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveUrl(input);
    if (!url || url.origin !== window.location.origin) return originalFetch(input, init);
    if (isTracking(url)) return new Response(null, { status: 204 });
    if (url.pathname.startsWith('/api/')) {
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const sandbox = await router;
      if (sandbox.isPassthrough(url.pathname, method)) return originalFetch(input, init);
      return sandbox.router.handle(url, init, input);
    }
    // מעבר בין עמודים: המידלוור מנתב את האזורים המחוברים למסכי ההדגמה
    return originalFetch(input, withHeader(input, init, FRAME_HEADER, kind));
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function open(this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    const resolved = resolveUrl(url);
    if (resolved && resolved.origin === window.location.origin && resolved.pathname.startsWith('/api/')) {
      throw new Error('[frame] בקשות XHR ל-API חסומות בחלון ההדגמה');
    }
    return (originalOpen as (this: XMLHttpRequest, ...args: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;

  const originalBeacon = navigator.sendBeacon?.bind(navigator);
  if (originalBeacon) {
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const resolved = resolveUrl(url);
      if (resolved && resolved.origin === window.location.origin && resolved.pathname.startsWith('/api/')) return true;
      return originalBeacon(url, data);
    };
  }

  installLinkGuard(demoPathFor);
}

let installed = false;

/**
 * מתקין את מה שהחלון צריך, אם הוא אחד החלונות המיוחדים. נקרא בטעינת ספקי
 * השורש; קריאה חוזרת לא עושה דבר.
 */
export function installFrameMode(activateDemoSession: () => void): FrameMode | null {
  if (installed || typeof window === 'undefined') return mode;
  installed = true;
  const current = frameMode();
  if (!current) return null;
  if (current.kind === 'act') installActAs(current.clientId);
  else {
    installSandbox(current.kind);
    // ה-session הבדוי של ההדגמה — עונה ל-/api/auth/* עוד לפני שארגז החול נטען
    activateDemoSession();
  }
  document.documentElement.dataset.frameMode = current.kind;
  return current;
}

const noSubscribe = () => () => undefined;

/** סוג החלון לרינדור — null בשרת ובהידרציה, ואז הערך האמיתי (בלי אי-התאמה) */
export function useFrameMode(): FrameMode | null {
  return useSyncExternalStore(noSubscribe, frameMode, () => null);
}
