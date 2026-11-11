/**
 * איתור רכיבים במסך לפי `data-demo-id` — במקום סלקטורים שבירים של CSS.
 */

export const DEMO_ATTR = 'data-demo-id';

export function demoSelector(id: string): string {
  return `[${DEMO_ATTR}="${id.replace(/"/g, '\\"')}"]`;
}

function isVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return true;
  if (element.hidden) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

/** הרכיב הראשון שגלוי — כשאותו מזהה מופיע גם בתפריט הצד וגם בגרסת המובייל */
export function findTarget(id: string): HTMLElement | null {
  const matches = Array.from(document.querySelectorAll<HTMLElement>(demoSelector(id)));
  return matches.find(isVisible) ?? matches[0] ?? null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** המתנה עד שרכיב מופיע — הדפים נטענים בעצלות ותפריטים נפתחים באנימציה */
export async function waitForTarget(
  id: string,
  options: { timeout?: number; signal?: { cancelled: boolean } } = {}
): Promise<HTMLElement | null> {
  const timeout = options.timeout ?? 8000;
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (options.signal?.cancelled) return null;
    const element = findTarget(id);
    if (element) return element;
    await sleep(80);
  }
  return null;
}

/** המתנה שהניווט הסתיים והכתובת היא זו שביקשנו */
export async function waitForRoute(route: string, timeout = 10000, signal?: { cancelled: boolean }): Promise<boolean> {
  const wanted = new URL(route, window.location.origin);
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (signal?.cancelled) return false;
    if (window.location.pathname === wanted.pathname) {
      const params = wanted.searchParams;
      let ok = true;
      params.forEach((value, key) => {
        if (new URLSearchParams(window.location.search).get(key) !== value) ok = false;
      });
      if (ok) return true;
    }
    await sleep(80);
  }
  return false;
}

export function centerOf(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** הגלילה של ההדגמה: הרכיב באמצע המסך, עם מקום לסרגל התחתון */
export async function scrollTo(element: Element, block: ScrollLogicalPosition = 'center'): Promise<void> {
  const rect = element.getBoundingClientRect();
  const viewport = window.innerHeight;
  const inView = rect.top >= 80 && rect.bottom <= viewport - 200;
  if (inView) return;
  element.scrollIntoView({ block, behavior: 'smooth', inline: 'nearest' });
  await sleep(450);
}

/** הערך הנוכחי של רכיב קלט — לשמירת מה שהמשתמש שינה בהתנסות */
export function readControlValue(element: HTMLElement): unknown {
  const thumb = element.matches('[role="slider"]') ? element : element.querySelector<HTMLElement>('[role="slider"]');
  if (thumb) {
    const value = thumb.getAttribute('aria-valuenow');
    return value === null ? undefined : Number(value);
  }
  const input =
    element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
      ? element
      : element.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
  if (!input) return undefined;
  if (input instanceof HTMLSelectElement) return input.value;
  const raw = input.value;
  if (['numeric', 'decimal'].includes(input.getAttribute('inputmode') ?? '') || input.type === 'number') {
    const numeric = Number(String(raw).replace(/[^\d.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : raw;
  }
  return raw;
}
