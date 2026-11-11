'use client';

import { Capacitor } from '@capacitor/core';
import { HANDOFF_VERIFIER_KEY, IN_APP_HOSTS } from './constants';

/**
 * האתר רץ גם בתוך אפליקציית משכלנתא לנייד (Capacitor, ראו mobile/README.md).
 * האפליקציה טוענת את האתר עצמו, כך שהלוגיקה והתצוגה זהות; כאן רק הנקודות
 * שבהן WebView מתנהג אחרת מדפדפן: הורדת קבצים, חלונות חדשים, קישורים
 * חיצוניים, כפתור "חזרה" באנדרואיד והכניסה עם Google.
 *
 * מחוץ לאפליקציה כל הפונקציות כאן לא עושות כלום, והאתר מתנהג כרגיל.
 */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

const plugins = {
  app: () => import('@capacitor/app').then((m) => m.App),
  browser: () => import('@capacitor/browser').then((m) => m.Browser),
  filesystem: () => import('@capacitor/filesystem'),
  share: () => import('@capacitor/share').then((m) => m.Share),
  fileOpener: () => import('@capacitor-community/file-opener').then((m) => m.FileOpener),
};

/* ------------------------------------------------------------------ קבצים */

/**
 * קבצים שהאתר מייצר בדפדפן (PDF, CSV, אקסל) נוצרים כ-blob, ולרוב הכתובת שלהם
 * מבוטלת מיד אחרי הלחיצה. ב-WebView ההורדה עצמה אסינכרונית, ולכן שומרים את
 * ה-blob לפי הכתובת לדקה, כדי שיהיה זמין גם אחרי הביטול.
 */
const recentBlobs = new Map<string, Blob>();

function rememberBlobs() {
  const create = URL.createObjectURL.bind(URL);
  const revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    const url = create(obj);
    if (obj instanceof Blob) recentBlobs.set(url, obj);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    window.setTimeout(() => {
      recentBlobs.delete(url);
      revoke(url);
    }, 60_000);
  };
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').trim();
  return cleaned || 'קובץ';
}

function fileNameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      /* ממשיכים לשם הרגיל */
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'application/json': 'json',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

function withExtension(name: string, type: string): string {
  if (/\.[A-Za-z0-9]{2,5}$/.test(name)) return name;
  const ext = EXTENSIONS[type.split(';')[0].trim()];
  return ext ? `${name}.${ext}` : name;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * "הורדה" באפליקציה: הקובץ נשמר בטלפון ונפתח בתוכנה המתאימה (מציג PDF,
 * גיליון), ומשם אפשר לשמור או לשתף. אם אין תוכנה שפותחת אותו — תפריט השיתוף.
 */
export async function openFileNatively(url: string, suggestedName?: string | null): Promise<void> {
  let blob = recentBlobs.get(url) ?? null;
  let name = suggestedName || null;
  if (!blob) {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error(`download failed: ${response.status}`);
    blob = await response.blob();
    name = name || fileNameFromDisposition(response.headers.get('content-disposition'));
  }
  if (!name && /^https?:/.test(url)) {
    name = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? '');
  }
  const fileName = withExtension(safeFileName(name || 'משכלנתא'), blob.type);

  const { Filesystem, Directory } = await plugins.filesystem();
  const { uri } = await Filesystem.writeFile({
    path: `downloads/${Date.now()}/${fileName}`,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  try {
    const opener = await plugins.fileOpener();
    await opener.open({ filePath: uri, contentType: blob.type || undefined, openWithDefault: true });
  } catch {
    const share = await plugins.share();
    await share.share({ title: fileName, files: [uri] });
  }
}

/* --------------------------------------------------------------- קישורים */

export async function openExternal(url: string): Promise<void> {
  const browser = await plugins.browser();
  await browser.open({ url });
}

/** מה עושים בקישור: null — ההתנהגות הרגילה של ה-WebView */
export type Route = { kind: 'file'; url: string; name?: string | null } | { kind: 'external'; url: string } | { kind: 'here'; url: string };

export function routeFor(href: string, opts: { download?: string | null; newWindow?: boolean }): Route | null {
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.protocol === 'blob:' || url.protocol === 'data:') return { kind: 'file', url: href, name: opts.download };
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null; // tel:, mailto:, whatsapp: — המערכת פותחת
  const sameSite = url.host === window.location.host;
  if (!sameSite) {
    return IN_APP_HOSTS.includes(url.hostname) ? null : { kind: 'external', url: url.toString() };
  }
  // קובץ מהשרת (מסמך, צרופה, דוח) — לא עמוד
  if (opts.download != null || url.pathname.startsWith('/api/')) {
    return { kind: 'file', url: url.toString(), name: opts.download || null };
  }
  // "בכרטיסייה חדשה" — באפליקציה אין כרטיסיות, אז באותו מסך
  return opts.newWindow ? { kind: 'here', url: url.toString() } : null;
}

function follow(route: Route) {
  if (route.kind === 'here') {
    window.location.assign(route.url);
    return;
  }
  const action = route.kind === 'file' ? openFileNatively(route.url, route.name) : openExternal(route.url);
  action.catch((error) => {
    console.error('[native-app] could not open', route.url, error);
    window.alert(route.kind === 'file' ? 'לא הצלחנו לפתוח את הקובץ. נסו שוב.' : 'לא הצלחנו לפתוח את הקישור.');
  });
}

function anchorRoute(anchor: HTMLAnchorElement): Route | null {
  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#')) return null;
  const download = anchor.hasAttribute('download') ? anchor.getAttribute('download') ?? '' : null;
  const target = anchor.getAttribute('target');
  return routeFor(href, { download, newWindow: Boolean(target && target !== '_self') });
}

function interceptLinks() {
  // לחיצות על קישורים בעמוד — אחרי שהקוד של האתר טיפל בהן (שלב ה-bubble)
  window.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const anchor = (event.target as Element | null)?.closest?.('a');
    if (!anchor) return;
    const route = anchorRoute(anchor as HTMLAnchorElement);
    if (!route) return;
    event.preventDefault();
    follow(route);
  });

  // link.click() על קישור שלא נוסף לעמוד — הלחיצה לא מגיעה ל-window
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (!this.isConnected) {
      const route = anchorRoute(this);
      if (route) {
        follow(route);
        return;
      }
    }
    click.call(this);
  };

  // window.open: באפליקציה אין חלונות נוספים
  window.open = ((url?: string | URL, target?: string) => {
    if (!url) {
      // window.open('') ואחר כך tab.location.href = ... — מחזירים "חלון" שמנתב את הכתובת
      return {
        location: {
          set href(value: string) {
            const route = routeFor(value, { newWindow: true });
            if (route) follow(route);
            else window.location.assign(value);
          },
        },
        close() {},
        focus() {},
      } as unknown as Window;
    }
    const href = String(url);
    const route = routeFor(href, { newWindow: target !== '_self' });
    if (route) follow(route);
    else window.location.assign(href);
    return null;
  }) as typeof window.open;
}

/* ------------------------------------------------------- כניסה עם Google */

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * גוגל לא מאפשרת להתחבר מתוך WebView, ולכן הכניסה נפתחת בדפדפן של המערכת
 * וחוזרת לאפליקציה בקוד חד-פעמי (ראו src/lib/app-handoff.ts).
 */
export async function startNativeGoogleSignIn(callbackUrl: string, carry: string | null): Promise<void> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));
  window.localStorage.setItem(HANDOFF_VERIFIER_KEY, verifier);

  const url = new URL('/app-login/google', window.location.origin);
  url.searchParams.set('challenge', challenge);
  url.searchParams.set('next', callbackUrl);
  if (carry) url.searchParams.set('carry', carry);
  await openExternal(url.toString());
}

/** הקישור com.mashkalanta.app://auth/callback חזר מהדפדפן — ממשיכים לעמוד שמשלים את הכניסה */
async function handleAppUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return;
  }
  if (url.host !== 'auth' || url.pathname !== '/callback') return;
  const browser = await plugins.browser();
  await browser.close().catch(() => undefined);
  const target = new URL('/app-login/complete', window.location.origin);
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  window.location.assign(target.toString());
}

/* ------------------------------------------------------------------ אתחול */

let started = false;

/** מופעל פעם אחת, מ-NativeAppBridge, רק בתוך האפליקציה */
export async function startNativeBridge(): Promise<void> {
  if (started || !isNativeApp()) return;
  started = true;

  document.documentElement.classList.add('native-app');
  document.documentElement.dataset.nativePlatform = Capacitor.getPlatform();

  rememberBlobs();
  interceptLinks();

  const App = await plugins.app();
  App.addListener('appUrlOpen', ({ url }) => void handleAppUrl(url));

  // אנדרואיד: "חזרה" סוגרת קודם חלון פתוח, אחר כך חוזרת עמוד אחורה
  App.addListener('backButton', ({ canGoBack }) => {
    if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      return;
    }
    if (canGoBack) window.history.back();
    else void App.minimizeApp();
  });
}
