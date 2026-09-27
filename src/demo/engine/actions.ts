/**
 * ביצוע פעולות ההדגמה על הממשק האמיתי.
 *
 * ההדגמה אינה מדמה מסך: היא לוחצת על הכפתורים האמיתיים, מקלידה לשדות האמיתיים
 * ומזיזה את הסליידרים האמיתיים — דרך אירועי DOM שהרכיבים (React, Radix) מגיבים
 * להם בדיוק כמו ללחיצה של אדם. הסמן הווירטואלי נע אל הרכיב לפני כל פעולה.
 */

import type { DemoAction, DemoState, DemoText, SpotlightSide } from '../types';
import { centerOf, findTarget, readControlValue, scrollTo, sleep, waitForRoute, waitForTarget } from './dom';
import { resolveText, resolveValue } from './text';

export interface DemoCursorApi {
  moveTo: (x: number, y: number, duration?: number) => Promise<void>;
  press: () => Promise<void>;
  hide: () => void;
}

export interface ActionContext {
  state: DemoState;
  cursor: DemoCursorApi;
  signal: { cancelled: boolean };
  navigate: (to: string) => void;
  setCaption: (text: string) => void;
  highlight: (element: HTMLElement, options: { title?: string; text?: string; side?: SpotlightSide }) => void;
  clearHighlight: () => void;
  /** רישום ערך שההדגמה הקלידה */
  setValue: (key: string, value: unknown) => void;
  /** האם המשתמש כבר קבע את הערך בעצמו */
  isUserSet: (key: string) => boolean;
  /** האם השדה כבר מציג את הערך המבוקש — למניעת הקלדה חוזרת */
  onMissingTarget?: (id: string) => void;
}

const inputValueSetter = () =>
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
const textareaValueSetter = () =>
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;

function fire(element: Element, type: string, init: Record<string, unknown> = {}) {
  const base = { bubbles: true, cancelable: true, composed: true, ...init };
  let event: Event;
  if (type.startsWith('pointer') && typeof PointerEvent !== 'undefined') {
    event = new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerdown' ? 1 : 0, ...base });
  } else if (type.startsWith('mouse') || type === 'click') {
    event = new MouseEvent(type, { button: 0, buttons: type === 'mousedown' ? 1 : 0, ...base });
  } else if (type.startsWith('key')) {
    event = new KeyboardEvent(type, base);
  } else {
    event = new Event(type, base);
  }
  element.dispatchEvent(event);
}

/** לחיצה מלאה — pointer, mouse ו-click — כדי שגם Radix (שמאזין ל-pointerdown) יגיב */
export function realClick(element: HTMLElement) {
  const { x, y } = centerOf(element);
  const at = { clientX: x, clientY: y };
  fire(element, 'pointerover', at);
  fire(element, 'pointerenter', { ...at, bubbles: false });
  fire(element, 'mouseover', at);
  fire(element, 'pointermove', at);
  fire(element, 'pointerdown', at);
  fire(element, 'mousedown', at);
  if (typeof element.focus === 'function') element.focus({ preventScroll: true });
  fire(element, 'pointerup', at);
  fire(element, 'mouseup', at);
  fire(element, 'click', at);
}

function setNativeValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = input instanceof HTMLTextAreaElement ? textareaValueSetter() : inputValueSetter();
  if (setter) setter.call(input, value);
  else input.value = value;
  fire(input, 'input', { data: value, inputType: 'insertText' });
}

function controlOf(element: HTMLElement): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return element;
  }
  return element.querySelector('input, textarea, select');
}

/** הקלדה תו אחרי תו — כמו אדם — דרך ה-setter המקורי כדי ש-React יקלוט את השינוי */
export async function typeInto(element: HTMLElement, value: string, options: { instant?: boolean; signal?: { cancelled: boolean } } = {}) {
  const control = controlOf(element);
  if (!control) return;
  if (control instanceof HTMLSelectElement) {
    control.value = value;
    fire(control, 'change');
    return;
  }
  control.focus({ preventScroll: true });
  const instant = options.instant || ['date', 'datetime-local', 'month', 'time'].includes(control.type);
  if (instant) {
    setNativeValue(control, value);
    fire(control, 'change');
    return;
  }
  setNativeValue(control, '');
  let typed = '';
  for (const char of value) {
    if (options.signal?.cancelled) return;
    typed += char;
    fire(control, 'keydown', { key: char });
    setNativeValue(control, typed);
    fire(control, 'keyup', { key: char });
    await sleep(38 + Math.random() * 40);
  }
  fire(control, 'change');
}

function key(element: Element, name: string, extra: Record<string, unknown> = {}) {
  fire(element, 'keydown', { key: name, code: name, ...extra });
  fire(element, 'keyup', { key: name, code: name, ...extra });
}

/**
 * הזזת סליידר של Radix לערך מבוקש — במקלדת, צעד אחרי צעד, כמו גרירה.
 * לחיצות Page מקפיצות עשרה צעדים; החיצים משלימים את השארית.
 */
export async function moveSlider(element: HTMLElement, target: number, signal?: { cancelled: boolean }) {
  const thumb = element.matches('[role="slider"]') ? element : element.querySelector<HTMLElement>('[role="slider"]');
  if (!thumb) return;
  thumb.focus({ preventScroll: true });
  const read = () => Number(thumb.getAttribute('aria-valuenow'));
  const min = Number(thumb.getAttribute('aria-valuemin') ?? 0);
  const max = Number(thumb.getAttribute('aria-valuemax') ?? 100);
  const goal = Math.min(max, Math.max(min, target));
  let current = read();
  if (!Number.isFinite(current)) return;

  // מדידת גודל הצעד — לחיצת חץ אחת
  const direction = goal >= current ? 1 : -1;
  const arrow = direction > 0 ? 'ArrowRight' : 'ArrowLeft';
  const page = direction > 0 ? 'PageUp' : 'PageDown';
  key(thumb, arrow);
  await sleep(0);
  const step = Math.abs(read() - current) || 1;
  current = read();

  let guard = 0;
  while (guard < 600 && !signal?.cancelled) {
    const remaining = (goal - current) * direction;
    if (remaining < step / 2) break;
    if (remaining >= step * 10) key(thumb, page);
    else key(thumb, arrow);
    await sleep(remaining >= step * 10 ? 14 : 22);
    const next = read();
    if (next === current) break;
    current = next;
    guard += 1;
  }
}

/** בחירת אפשרות — Radix Select (פותחים, מוצאים לפי טקסט, Enter) או select רגיל */
export async function selectOption(element: HTMLElement, option: string, ctx: ActionContext) {
  const native = controlOf(element);
  if (native instanceof HTMLSelectElement) {
    const match = Array.from(native.options).find((item) => item.text.trim() === option || item.value === option);
    if (match) {
      native.value = match.value;
      fire(native, 'change');
    }
    return;
  }
  const trigger = element.matches('[role="combobox"], button') ? element : element.querySelector<HTMLElement>('[role="combobox"], button') ?? element;
  realClick(trigger);
  await sleep(250);
  const started = Date.now();
  let item: HTMLElement | null = null;
  while (Date.now() - started < 3000 && !ctx.signal.cancelled) {
    item =
      Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
        (candidate) => candidate.textContent?.trim() === option
      ) ?? null;
    if (item) break;
    await sleep(80);
  }
  if (!item) {
    key(trigger, 'Escape');
    return;
  }
  const { x, y } = centerOf(item);
  await ctx.cursor.moveTo(x, y, 350);
  item.focus({ preventScroll: true });
  await sleep(120);
  key(item, 'Enter');
  await sleep(150);
}

async function locate(id: string, ctx: ActionContext, optional = false, timeout?: number): Promise<HTMLElement | null> {
  const element = await waitForTarget(id, { timeout: timeout ?? (optional ? 2500 : 8000), signal: ctx.signal });
  if (!element && !optional) ctx.onMissingTarget?.(id);
  return element;
}

async function approach(element: HTMLElement, ctx: ActionContext) {
  await scrollTo(element);
  if (ctx.signal.cancelled) return;
  const { x, y } = centerOf(element);
  await ctx.cursor.moveTo(x, y);
}

export async function executeAction(action: DemoAction, ctx: ActionContext): Promise<void> {
  if (ctx.signal.cancelled) return;
  switch (action.type) {
    case 'navigate': {
      ctx.navigate(action.to);
      await waitForRoute(action.to, 10000, ctx.signal);
      await sleep(350);
      return;
    }
    case 'wait':
      await sleep(action.ms);
      return;
    case 'waitFor':
      await locate(action.target, ctx, action.optional, action.timeout);
      return;
    case 'scroll': {
      const element = await locate(action.target, ctx);
      if (element) {
        element.scrollIntoView({ block: action.block ?? 'center', behavior: 'smooth' });
        await sleep(500);
      }
      return;
    }
    case 'move': {
      const element = await locate(action.target, ctx);
      if (element) await approach(element, ctx);
      return;
    }
    case 'click': {
      const element = await locate(action.target, ctx, action.optional);
      if (!element) return;
      await approach(element, ctx);
      if (ctx.signal.cancelled) return;
      await ctx.cursor.press();
      realClick(element);
      await sleep(450);
      return;
    }
    case 'type': {
      if (action.key && ctx.isUserSet(action.key) && !action.force) return;
      const element = await locate(action.target, ctx);
      if (!element) return;
      const value = resolveValue(action.value, ctx.state);
      await approach(element, ctx);
      if (ctx.signal.cancelled) return;
      await ctx.cursor.press();
      realClick(element);
      await sleep(120);
      await typeInto(element, String(value), { instant: action.instant, signal: ctx.signal });
      if (action.key) ctx.setValue(action.key, value);
      await sleep(350);
      return;
    }
    case 'slider': {
      if (action.key && ctx.isUserSet(action.key) && !action.force) return;
      const element = await locate(action.target, ctx);
      if (!element) return;
      const value = resolveValue(action.value, ctx.state);
      const thumb = element.querySelector<HTMLElement>('[role="slider"]') ?? element;
      await scrollTo(element);
      const start = centerOf(thumb);
      await ctx.cursor.moveTo(start.x, start.y);
      await ctx.cursor.press();
      // הסמן עוקב אחרי הידית תוך כדי התנועה
      const follow = setInterval(() => {
        const at = centerOf(thumb);
        void ctx.cursor.moveTo(at.x, at.y, 60);
      }, 70);
      try {
        await moveSlider(element, value, ctx.signal);
      } finally {
        clearInterval(follow);
      }
      const end = centerOf(thumb);
      await ctx.cursor.moveTo(end.x, end.y, 80);
      if (action.key) ctx.setValue(action.key, readControlValue(element) ?? value);
      await sleep(400);
      return;
    }
    case 'select': {
      if (action.key && ctx.isUserSet(action.key) && !action.force) return;
      const element = await locate(action.target, ctx);
      if (!element) return;
      await approach(element, ctx);
      await ctx.cursor.press();
      await selectOption(element, action.option, ctx);
      if (action.key) ctx.setValue(action.key, action.option);
      await sleep(300);
      return;
    }
    case 'highlight': {
      const element = await locate(action.target, ctx);
      if (!element) return;
      await scrollTo(element);
      const text = resolveText(action.text as DemoText | undefined, ctx.state);
      ctx.highlight(element, { text, side: action.side });
      await sleep(action.hold ?? 2200);
      return;
    }
    case 'caption':
      ctx.setCaption(resolveText(action.text, ctx.state));
      await sleep(200);
      return;
    case 'key': {
      const element = action.target ? await locate(action.target, ctx, true) : (document.activeElement as HTMLElement | null) ?? document.body;
      key(element ?? document.body, action.key);
      await sleep(350);
      return;
    }
    case 'setState':
      ctx.setValue(action.key, resolveValue(action.value, ctx.state));
      return;
    default:
      return;
  }
}

/** קריאת הערכים שהמשתמש שינה בהתנסות מתוך המסך — לפי הפעולות שהוקלדו עד כה */
export function readUserValues(actions: DemoAction[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  actions.forEach((action) => {
    if ((action.type === 'type' || action.type === 'slider' || action.type === 'select') && action.key) {
      const element = findTarget(action.target);
      if (!element) return;
      const value = readControlValue(element);
      if (value !== undefined && value !== '') values[action.key] = value;
    }
  });
  return values;
}
