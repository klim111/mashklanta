/**
 * יירוט `fetch` בזמן הדגמה.
 *
 * כל קריאה לאותו מקור (origin) בנתיב `/api/...` מנותבת לשרת המדומה. קריאות
 * אחרות — כולל הניווט הפנימי של Next.js — עוברות כרגיל. גם `XMLHttpRequest`
 * ו-`sendBeacon` ל-`/api` נחסמים, כדי ששום ספרייה לא תעקוף את ההגנה.
 */

import type { DemoApiRouter } from './api-router';
import { isPassthrough } from './api-router';

function resolveUrl(input: RequestInfo | URL): URL | null {
  try {
    if (typeof input === 'string') return new URL(input, window.location.href);
    if (input instanceof URL) return input;
    return new URL(input.url, window.location.href);
  } catch {
    return null;
  }
}

function isSandboxed(url: URL | null, method: string): boolean {
  if (!url) return false;
  if (url.origin !== window.location.origin) return false;
  if (!url.pathname.startsWith('/api/')) return false;
  return !isPassthrough(url.pathname, method);
}

export function installFetchShim(router: DemoApiRouter): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalBeacon = navigator.sendBeacon?.bind(navigator);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveUrl(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (url && isSandboxed(url, method)) return router.handle(url, init, input);
    return originalFetch.call(window, input, init);
  };

  XMLHttpRequest.prototype.open = function open(this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    const resolved = resolveUrl(url);
    if (resolved && isSandboxed(resolved, String(method).toUpperCase())) {
      throw new Error('[demo] בקשות XHR ל-API חסומות במצב הדגמה');
    }
    return (originalOpen as (this: XMLHttpRequest, ...args: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;

  if (originalBeacon) {
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const resolved = resolveUrl(url);
      if (resolved && isSandboxed(resolved, 'POST')) return true;
      return originalBeacon(url, data);
    };
  }

  return () => {
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalOpen;
    if (originalBeacon) navigator.sendBeacon = originalBeacon;
  };
}
