/**
 * הקלטת הסרטון "צפו בהדגמה קצרה" שמתחת לאנימציה בדף הבית.
 *
 * הסרטון מוקלט מהממשק האמיתי, בארבעה קטעים ובסדר הזה:
 *   free   הכלים החינמיים, כאורח: היתכנות (כולל הזזת ערכים ונעילה), בדיקת
 *          מיחזור והלוואות צרכניות.
 *   equity לרשומים: תכנון הון עצמי עם טבלת הוצאות מלאה, לוח שנה והדוח הסופי.
 *   dash   האזור האישי: פעולות מהירות, מצב הון ותזרים עם המחשבון המהיר, לוח
 *          שנה ומשימות, תיק המסמכים, צ׳אט ומיילים.
 *   plan   חמשת השלבים לפי הסדר: דוח הפרופיל, בניית תמהיל, לוח החזרים, פרעון
 *          מוקדם וההצעה לבנקים, אישור עקרוני, מכרז ריביות וחתימה. בכל שלב
 *          כפתור "פנו ליועץ" ותפריט הפעולות הצף.
 * הקטעים של הרשומים רצים בתוך ההדגמה (נתונים לדוגמה, בלי שרת).
 *
 * הסקריפט מזיז עכבר, מקליד ומציג כתוביות בעצמו. ההדגמה `promo`
 * (src/demo/catalog/flows/promo.ts) משמשת רק במה מושהית לחלקים של הרשומים.
 *
 * הרצה (האתר רץ ב-http://localhost:3000, עדיף `next build && next start`):
 *   npm i --no-save playwright-core@1.56.1
 *   node scripts/promo-video/record.mjs
 *
 * משתני סביבה: BASE_URL, CHROMIUM (נתיב לדפדפן), FFMPEG (נתיב ל-ffmpeg),
 * PYTHON (למעברים הרכים, דורש Pillow), OUT_DIR (ברירת מחדל public/promo),
 * NARRATION (קובץ שמע לקריינות, אופציונלי), SPEED (האצת הפעולות), WORK_DIR,
 * ONLY (רשימת קטעים מופרדת בפסיקים, לכיוונון: free,equity,dash,plan).
 *
 * נתוני שוק המשכנתאות מוגשים מ-market-snapshot.json — תמונת מצב של נתוני
 * בנק ישראל כפי שהוצגו באתר, כדי שההקלטה לא תלויה ברשת.
 */

import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = resolve(root, process.env.OUT_DIR ?? 'public/promo');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const WORK = resolve(process.env.WORK_DIR ?? join(root, '.promo-work'));
const FPS = 30;
const VIEWPORT = { width: 1280, height: 720 };
const SCALE = 1.5; // 1920x1080
/** פי כמה מואצות הפעולות (תנועת עכבר, לחיצות, גלילה). זמן הקריאה של הכתוביות אינו מואץ */
const SPEED = Number(process.env.SPEED ?? 1.6);
/** הקלדה וגרירה מואצות פחות, כדי שיראו את הערכים משתנים */
const TYPING_SPEED = 1.15;
const DEMO_KEY = 'mashkalanta:demo';
/** הצעדים של במת ההדגמה, לפי הסדר ב-promo.ts */
const STAGE = { equity: 0, dashboard: 1, plan: 2 };

/** השכבה שמעל הממשק בזמן ההקלטה: כתוביות, תג "נתונים לדוגמה", כרטיסי פרק וכרטיס סיום */
const OVERLAY_CSS = `
  .mk-demo-ui, .mk-demo-bar, .mk-demo-badge, .mk-demo-end, .mk-demo-tryit, .mk-demo-cursor,
  .driver-popover, [data-a11y-ui], nextjs-portal { display: none !important; }
  .driver-overlay { display: none !important; }
  body.driver-active, body.driver-active * { pointer-events: auto !important; }
  /* ההתראה "נרשמים כדי לשמור" של האורח מסתירה את התוצאות; כרטיס הפרק "נרשמים בחינם" אומר את זה */
  aside[role="status"] { display: none !important; }
  #promo-layer, #promo-layer * { pointer-events: none !important; }
  html { scroll-behavior: smooth; }
  #promo-layer { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; direction: rtl; font-family: var(--font-assistant), Assistant, sans-serif; }
  #promo-caption { position: absolute; left: 50%; bottom: 30px; transform: translateX(-50%); max-width: 1120px; width: max-content;
    padding: 13px 30px 15px; border-radius: 22px; background: rgba(15, 23, 42, 0.92); color: #fff; text-align: center;
    font-size: 36px; line-height: 1.25; font-weight: 800; box-shadow: 0 18px 50px rgba(15, 23, 42, 0.35); }
  #promo-caption.is-in { animation: promo-in 520ms cubic-bezier(.2,.8,.2,1) both; }
  #promo-caption::before { content: ''; position: absolute; top: 0; right: 30px; left: 30px; height: 4px; border-radius: 0 0 4px 4px; background: #2563eb; }
  #promo-caption:empty { display: none; }
  #promo-caption small { display: block; margin-top: 4px; font-size: 26px; font-weight: 700; color: #bfdbfe; }
  #promo-tag { position: absolute; top: 80px; left: 14px; padding: 5px 12px; border-radius: 999px; background: rgba(15, 23, 42, 0.72);
    color: #e2e8f0; font-size: 15px; font-weight: 700; }
  #promo-chapter, #promo-end { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
    background: radial-gradient(circle at 50% 35%, #1e3a8a 0%, #0f172a 72%); color: #fff; text-align: center; padding: 0 60px; }
  #promo-chapter.is-on, #promo-end.is-on { display: flex; animation: promo-fade 600ms ease both; }
  #promo-chapter i { font-style: normal; padding: 6px 18px; border-radius: 999px; background: rgba(96, 165, 250, 0.18); color: #93c5fd; font-size: 24px; font-weight: 800; }
  #promo-chapter b { font-size: 64px; font-weight: 900; line-height: 1.15; }
  #promo-chapter ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  #promo-chapter li { font-size: 32px; font-weight: 700; color: #e2e8f0; }
  #promo-chapter li::before { content: '✓'; color: #34d399; margin-left: 12px; font-weight: 900; }
  #promo-end b { font-size: 104px; font-weight: 900; letter-spacing: -1px; }
  #promo-end b span { color: #60a5fa; }
  #promo-end p { font-size: 38px; font-weight: 700; color: #cbd5e1; margin: 0; }
  #promo-end em { font-style: normal; margin-top: 18px; padding: 14px 34px; border-radius: 18px; background: #2563eb; font-size: 32px; font-weight: 800; }
  #promo-cursor { position: absolute; top: 0; left: 0; width: 26px; height: 30px; display: none; transition: transform 700ms cubic-bezier(.35,.6,.25,1);
    filter: drop-shadow(0 3px 6px rgba(15, 23, 42, 0.35)); }
  #promo-cursor.is-on { display: block; }
  @keyframes promo-in { from { opacity: 0; transform: translate(-50%, 18px); } to { opacity: 1; transform: translate(-50%, 0); } }
  @keyframes promo-fade { from { opacity: 0; } to { opacity: 1; } }
`;

function overlayScript(css) {
  const install = () => {
    if (document.getElementById('promo-layer')) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const layer = document.createElement('div');
    layer.id = 'promo-layer';
    layer.innerHTML =
      '<div id="promo-tag">הדגמה · כל הנתונים לדוגמה</div><div id="promo-caption"></div>' +
      '<svg id="promo-cursor" viewBox="0 0 26 30" fill="none"><path d="M3 2l19 12.5-8.2 1.6 4.8 9.6-3.6 1.8-4.8-9.7L3 23.5z" fill="#0f172a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>' +
      '<div id="promo-chapter"></div>' +
      '<div id="promo-end"><b>משכל<span>נתא</span></b><p>כל המשכנתא שלכם, בפלטפורמה אחת</p><em>הרשמה חינם · הכלים החינמיים ללא הגבלה</em></div>';
    document.body.appendChild(layer);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}

const now = () => Date.now() / 1000;
const sel = (id) => `[data-demo-id="${id}"]`;

/** צילום עמוד: screencast של CDP, כל פריים עם חותמת זמן (שניות, שעון קיר) */
async function startCapture(context, page, prefix) {
  const cdp = await context.newCDPSession(page);
  const frames = [];
  let live = false;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
    if (!live) return;
    const file = join(WORK, 'frames', `${prefix}${String(frames.length).padStart(6, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
  });
  const start = async () => {
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 90,
      maxWidth: VIEWPORT.width * SCALE,
      maxHeight: VIEWPORT.height * SCALE,
      everyNthFrame: 1,
    });
    live = true;
  };
  await start();
  return {
    frames,
    start,
    stop: async () => {
      live = false;
      await cdp.send('Page.stopScreencast').catch(() => undefined);
    },
  };
}

/**
 * קטע מוקלט אחד (הקשר דפדפן אחד). כל פעולה נרשמת על ציר הזמן: ההחזקות
 * (זמן קריאה) בקצב רגיל, ההקלדה מואצת מעט, כל השאר מואץ פי SPEED, וזמן
 * הטעינה בין מסכים נחתך.
 */
class Segment {
  constructor(name, context, page) {
    Object.assign(this, { name, context, page });
    this.ranges = []; // [from, to, rate]
    this.cues = []; // { t, text }
    this.marks = []; // מעברי מסך שיקבלו מעבר רך: { t, span }
  }

  static async open(browser, market, name, { demoStep = null } = {}) {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
    await context.route('**/api/boi/mortgage-market', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: market })
    );
    await context.addInitScript(`(${overlayScript.toString()})(${JSON.stringify(OVERLAY_CSS)})`);
    const page = await context.newPage();
    const segment = new Segment(name, context, page);
    await page.goto(BASE_URL + '/', { waitUntil: 'load', timeout: 120_000 });
    if (demoStep) await segment.loadStage(demoStep.step, demoStep.route, { capture: false });
    return segment;
  }

  async begin() {
    await this.page.evaluate(() => {
      document.getElementById('promo-cursor').style.transform = 'translate(640px, 420px)';
    });
    this.capture = await startCapture(this.context, this.page, `${this.name}-`);
    this.t0 = now();
  }

  /** מעבר למסך של במת ההדגמה: הצעד נשמר ב-sessionStorage והמסך נטען מחדש. הטעינה עצמה לא מצולמת */
  async loadStage(step, route, { capture = true } = {}) {
    const from = now();
    if (capture) await this.capture.stop();
    await this.page.evaluate(
      ({ key, step }) => sessionStorage.setItem(key, JSON.stringify({ flowId: 'promo', stepIndex: step, returnTo: '/', autoplay: false })),
      { key: DEMO_KEY, step }
    );
    await this.page.goto(BASE_URL + route, { waitUntil: 'load', timeout: 120_000 });
    await this.page.waitForTimeout(3500);
    await this.cursorOff();
    if (capture) {
      await this.capture.start();
      this.ranges.push([from, now(), 0]);
      this.soft(0.3);
    }
  }

  /** ניווט רגיל (כאורח). הטעינה לא מצולמת */
  async goto(path, ready) {
    const from = now();
    await this.capture.stop();
    await this.page.goto(BASE_URL + path, { waitUntil: 'load', timeout: 120_000 });
    if (ready) await this.page.locator(ready).first().waitFor({ timeout: 30_000 });
    await this.page.waitForTimeout(1200);
    await this.cursorOff();
    await this.capture.start();
    this.ranges.push([from, now(), 0]);
    this.soft(0.3);
  }

  /** מכאן ועד span שניות קדימה מתחלף המסך — במקום קפיצה יהיה מעבר רך */
  soft(span = 1.6) {
    this.marks.push({ t: now(), span });
  }

  async hold(ms) {
    const a = now();
    await this.page.waitForTimeout(ms);
    this.ranges.push([a, now(), 1]);
  }

  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }

  /** כתובית חדשה, ואחריה זמן קריאה */
  async caption(text, holdMs = 0, sub = '') {
    this.cues.push({ t: now(), text: sub ? `${text} ${sub}` : text });
    await this.page.evaluate(
      ({ text, sub }) => {
        const box = document.getElementById('promo-caption');
        box.textContent = text;
        if (sub) {
          const small = document.createElement('small');
          small.textContent = sub;
          box.appendChild(small);
        }
        box.classList.remove('is-in');
        void box.offsetWidth;
        box.classList.add('is-in');
      },
      { text, sub }
    );
    if (holdMs) await this.hold(holdMs);
  }

  /** כרטיס פרק על כל המסך */
  async chapter(kicker, title, bullets, holdMs) {
    this.cues.push({ t: now(), text: [title, ...bullets].join(' · ') });
    await this.chapterCard(kicker, title, bullets);
    await this.hold(holdMs);
    this.soft(0.6);
    await this.page.evaluate(() => document.getElementById('promo-chapter').classList.remove('is-on'));
    await this.page.waitForTimeout(300);
  }

  /** הכרטיס עצמו. בתחילת קטע מציגים אותו לפני שהצילום מתחיל, כדי שהקטע ייפתח בו */
  async chapterCard(kicker, title, bullets) {
    await this.page.evaluate(
      ({ kicker, title, bullets }) => {
        document.getElementById('promo-caption').textContent = '';
        const card = document.getElementById('promo-chapter');
        card.innerHTML = '';
        const k = document.createElement('i');
        k.textContent = kicker;
        const b = document.createElement('b');
        b.textContent = title;
        const ul = document.createElement('ul');
        bullets.forEach((line) => {
          const li = document.createElement('li');
          li.textContent = line;
          ul.appendChild(li);
        });
        card.append(k, b, ul);
        card.classList.add('is-on');
      },
      { kicker, title, bullets }
    );
  }

  async endCard(holdMs) {
    this.cues.push({ t: now(), text: 'משכלנתא: כל המשכנתא שלכם, בפלטפורמה אחת. הרשמה חינם, הכלים החינמיים ללא הגבלה' });
    await this.page.evaluate(() => {
      document.getElementById('promo-caption').textContent = '';
      document.getElementById('promo-tag').style.display = 'none';
      document.getElementById('promo-end').classList.add('is-on');
    });
    await this.hold(holdMs);
  }

  async cursorOff() {
    await this.page.evaluate(() => document.getElementById('promo-cursor')?.classList.remove('is-on')).catch(() => undefined);
  }

  locator(target) {
    return typeof target === 'string' ? this.page.locator(target).first() : target;
  }

  async point(target) {
    const locator = this.locator(target);
    await locator.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await this.page.waitForTimeout(150);
    const box = await locator.boundingBox();
    if (!box) return;
    await this.page.evaluate(
      ({ x, y }) => {
        const cursor = document.getElementById('promo-cursor');
        cursor.classList.add('is-on');
        cursor.style.transform = `translate(${x}px, ${y}px)`;
      },
      { x: box.x + Math.min(box.width * 0.55, box.width - 10), y: box.y + box.height * 0.6 }
    );
    await this.page.waitForTimeout(760);
  }

  /** soft: הלחיצה מחליפה מסך (לשונית, חלון, שלב) — מעבר רך במקום קפיצה */
  async click(target, { optional = false, soft = false } = {}) {
    try {
      const locator = this.locator(target);
      await this.point(locator);
      if (soft) this.soft();
      await locator.click({ timeout: 10_000 });
      await this.page.waitForTimeout(soft ? 900 : 380);
      return true;
    } catch (error) {
      if (!optional) {
        await this.page.screenshot({ path: join(WORK, `fail-${this.name}.png`) }).catch(() => undefined);
        throw error;
      }
      console.warn(`[${this.name}] לא נלחץ:`, String(error.message).split('\n')[0]);
      return false;
    }
  }

  /** לחיצה בנקודה על המסך (כפתור שמחליף את התווית שלו, כמו כפתור צף שנפתח) */
  async clickAt(box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.evaluate(({ x, y }) => {
      const cursor = document.getElementById('promo-cursor');
      cursor.classList.add('is-on');
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    }, { x, y });
    await this.page.waitForTimeout(760);
    this.soft();
    await this.page.mouse.click(x, y);
    await this.page.waitForTimeout(900);
  }

  async type(target, text) {
    const locator = this.locator(target);
    await this.click(locator);
    await locator.press('Control+a');
    await locator.press('Delete');
    const a = now();
    await locator.pressSequentially(String(text), { delay: 95 });
    this.ranges.push([a, now(), 1 / TYPING_SPEED]);
    // יציאה מהשדה בלי מקלדת: Tab מעביר פוקוס לרכיבים אחרים במסך
    await locator.evaluate((element) => element.blur()).catch(() => undefined);
    await this.page.waitForTimeout(250);
  }

  /** גרירת סליידר (Radix) עם העכבר עד לערך מבוקש — בכל כיוון כתיבה */
  async slide(target, goal) {
    const root = this.locator(target);
    await root.scrollIntoViewIfNeeded();
    const thumb = (await root.getAttribute('role')) === 'slider' ? root : root.locator('[role="slider"]').first();
    const read = async () => ({
      value: Number(await thumb.getAttribute('aria-valuenow')),
      min: Number((await thumb.getAttribute('aria-valuemin')) ?? 0),
      max: Number((await thumb.getAttribute('aria-valuemax')) ?? 100),
    });
    const { value, min, max } = await read();
    const track = await root.boundingBox();
    const knob = await thumb.boundingBox();
    if (!track || !knob || max <= min) return;
    const x0 = knob.x + knob.width / 2;
    const y = knob.y + knob.height / 2;
    const fraction = (value - min) / (max - min);
    // הכיוון: איפה הידית נמצאת ביחס לערך שלה
    const ltr = Math.abs(track.x + fraction * track.width - x0) <= Math.abs(track.x + (1 - fraction) * track.width - x0);
    const g = (Math.min(max, Math.max(min, goal)) - min) / (max - min);
    const x1 = ltr ? track.x + g * track.width : track.x + (1 - g) * track.width;
    await this.point(thumb);
    const a = now();
    await this.page.mouse.move(x0, y);
    await this.page.mouse.down();
    const steps = 28;
    for (let i = 1; i <= steps; i += 1) {
      const x = x0 + ((x1 - x0) * i) / steps;
      await this.page.mouse.move(x, y);
      await this.page.evaluate(({ x, y }) => {
        const cursor = document.getElementById('promo-cursor');
        cursor.style.transition = 'none';
        cursor.style.transform = `translate(${x}px, ${y}px)`;
      }, { x, y });
      await this.page.waitForTimeout(45);
    }
    await this.page.mouse.up();
    await this.page.evaluate(() => (document.getElementById('promo-cursor').style.transition = ''));
    this.ranges.push([a, now(), 1 / TYPING_SPEED]);
    await this.page.waitForTimeout(400);
  }

  /** גלילה בתוך מכל נגלל (חלון, טבלה) שמכיל את הרכיב */
  async scrollInside(target, top) {
    await this.locator(target).evaluate((element, top) => {
      let box = element;
      while (box && box !== document.body) {
        const style = getComputedStyle(box);
        if (/(auto|scroll)/.test(style.overflowY) && box.scrollHeight > box.clientHeight + 10) break;
        box = box.parentElement;
      }
      (box && box !== document.body ? box : window).scrollBy({ top, behavior: 'smooth' });
    }, top);
    await this.page.waitForTimeout(1100);
  }

  /** שדה תאריך: מצביעים עליו וממלאים */
  async date(target, value) {
    const locator = this.locator(target);
    await this.point(locator);
    await locator.fill(value);
    await this.page.waitForTimeout(150);
  }

  async scrollTo(target, block = 'start') {
    await this.locator(target).evaluate((element, block) => element.scrollIntoView({ behavior: 'smooth', block }), block, { timeout: 6000 });
    await this.page.waitForTimeout(1300);
  }

  async scrollBy(top) {
    await this.page.evaluate((top) => window.scrollBy({ top, behavior: 'smooth' }), top);
    await this.page.waitForTimeout(1200);
  }

  async scrollTop() {
    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await this.page.waitForTimeout(1100);
  }

  async finish() {
    this.t1 = now();
    await this.capture.stop();
    await this.context.close();
  }

  /** ציר הזמן של הקטע: משך לכל פריים, ופונקציה שממפה שעון קיר לזמן בסרטון */
  timeline() {
    const { t0, t1 } = this;
    const frames = this.capture.frames.filter((frame) => frame.t >= t0 - 0.05);
    const rateAt = (t) => {
      // הטווח האחרון שנרשם גובר
      for (let i = this.ranges.length - 1; i >= 0; i -= 1) {
        const [a, b, rate] = this.ranges[i];
        if (t >= a && t < b) return rate;
      }
      return 1 / SPEED;
    };
    const RES = 0.01;
    const table = [0];
    for (let x = 0; x < t1 - t0 + 1; x += RES) table.push(table[table.length - 1] + RES * rateAt(t0 + x));
    const remap = (t) => {
      const u = Math.max(0, (t - t0) / RES);
      const i = Math.min(table.length - 2, Math.floor(u));
      return table[i] + (table[i + 1] - table[i]) * (u - i);
    };
    const entries = [];
    let clock = 0;
    frames.forEach((frame, i) => {
      const next = frames[i + 1]?.t ?? t1;
      const duration = remap(next) - clock;
      if (duration <= 0.0005) return; // פריים שכולו בתוך חיתוך
      entries.push({ file: frame.file, duration, t: frame.t });
      clock += duration;
    });
    // חלונות המעברים הרכים, לפי מספרי הפריימים
    const windows = this.marks.map(({ t, span }) => {
      let a = entries.findIndex((entry) => entry.t >= t);
      if (a < 0) return null;
      let b = a;
      while (b + 1 < entries.length && entries[b + 1].t <= t + span) b += 1;
      return [Math.max(1, a), b];
    }).filter(Boolean);
    return { entries, remap, total: clock, windows };
  }
}

// ─────────────────────────── עזרים למסכים ───────────────────────────

/** בחירה ברשימה נפתחת (Radix) במקלדת: הרשימה עצמה נפתחת לפעמים מחוץ למסך */
async function choose(s, trigger, downs) {
  const scroll = await s.page.evaluate(() => window.scrollY);
  await s.click(trigger);
  await s.wait(450);
  for (let i = 0; i < downs; i += 1) {
    await s.page.keyboard.press('ArrowDown');
    await s.wait(330);
  }
  await s.page.keyboard.press('Enter');
  await s.wait(350);
  await s.page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), scroll);
  await s.wait(250);
}

/** סגירת חלון (Radix Dialog) בכפתור הסגירה שלו. לא Escape: בהדגמה הוא יוצא ממנה */
async function closeDialog(s) {
  const close = s.page.locator('[role="dialog"]').last().getByRole('button', { name: /^(Close|סגירה|סגור)$/ }).first();
  await s.click(close, { optional: true, soft: true });
  await s.cursorOff();
}

// ─────────────────────────── קטע 1: הכלים החינמיים, כאורח ───────────────────────────

async function recordFreeTools(browser, market) {
  const s = await Segment.open(browser, market, 'free');
  const page = s.page;
  await page.waitForTimeout(2500);
  await s.begin();

  await s.caption('משכלנתא: כל המשכנתא שלכם, בפלטפורמה אחת', 2400);
  await s.scrollTo(sel('home-free-tools'));
  await s.caption('מתחילים בכלים החינמיים', 2300, 'פתוחים לכולם, בלי הרשמה');

  // ─── מה אני יכול להרשות לעצמי ───
  await s.goto('/mortgage-planning?flow=affordability', sel('mp-property-0'));
  await s.caption('מה אני יכול להרשות לעצמי?', 0, 'מזינים הון עצמי, גיל והכנסה');
  await s.hold(1300);
  await s.click(sel('mp-property-0'));
  await s.click(sel('mp-borrower-individual'));
  await s.type(sel('mp-own-capital'), '700000');
  await s.type(sel('mp-age'), '34');
  await s.type(sel('mp-income'), '25000');
  await s.click(sel('mp-loans-no'));
  await s.click(sel('mp-submit'), { soft: true });
  await page.locator(sel('mp-max-property')).first().waitFor({ timeout: 15_000 });
  await s.cursorOff();
  await s.scrollTo(sel('mp-max-property'), 'center');
  await s.caption('ומקבלים מחיר דירה, משכנתא והחזר חודשי', 2600, 'לפי כללי בנק ישראל');
  await s.caption('כל ערך אפשר לעדכן', 0, 'מזיזים, וכל השאר מתעדכן מיד');
  await s.slide(sel('mp-payment-slider'), 8000);
  await s.cursorOff();
  await s.hold(2000);
  await s.caption('ונועלים ערך שלא רוצים שישתנה', 0, 'למשל את ההחזר החודשי');
  await s.click('button[title^="נעילת ההחזר החודשי"]');
  await s.hold(1300);
  await s.scrollTo(sel('mp-term-card'), 'center');
  await s.slide(sel('mp-term-slider'), 240);
  await s.cursorOff();
  await s.caption('התקופה התקצרה, וההחזר נשאר נעול', 0, 'סכום המשכנתא ומחיר הדירה התעדכנו בהתאם');
  await s.scrollTo(sel('mp-max-property'), 'center');
  await s.hold(2600);

  // ─── בדיקת מיחזור ───
  await s.goto('/mortgage-refinance');
  await s.caption('בדיקת מיחזור: בוחרים מטרה', 0, 'ומזינים את המשכנתא של היום');
  await s.hold(1200);
  await s.click(page.getByText('הקטנת ההחזר החודשי').first(), { optional: true, soft: true });
  await page.getByText('המסלולים במשכנתא היום').first().waitFor({ timeout: 10_000 }).catch(() => undefined);
  const trackType = page.getByLabel('סוג המסלול').first();
  await s.point(trackType);
  await trackType.selectOption({ label: 'קבועה לא צמודה' });
  // מסלול 1: קבועה לא צמודה. מסלול 2: פריים (ברירת המחדל), עם מרווח
  await s.type(page.getByLabel('יתרה לסילוק').nth(0), '620000');
  await s.type(page.getByLabel('ריבית היום').nth(0), '5.9');
  await s.click(page.getByRole('button', { name: 'הוספת מסלול' }));
  await s.type(page.getByLabel('יתרה לסילוק').nth(1), '380000');
  await s.type(page.getByLabel('מרווח').last(), '0.6');
  await s.click(page.getByRole('button', { name: /בדיקת אפשרויות המיחזור/ }), { soft: true });
  await s.cursorOff();
  await s.caption('ורואים כמה אפשר לחסוך', 2400, 'מול הריביות הממוצעות של בנק ישראל');
  await s.scrollBy(380);
  await s.hold(1800);

  // ─── הלוואות צרכניות ───
  await s.goto('/consumer-loans', 'text=הוספת הלוואה');
  await s.caption('הלוואות צרכניות: מזינים כל הלוואה', 0, 'ורואים מה היא עושה להחזר החודשי וליחס ההחזר');
  await s.hold(1300);
  const loans = [
    ['הלוואת רכב', '85000', '6.5', '48'],
    ['כרטיס אשראי', '24000', '14', '24'],
  ];
  for (const [i, [name, principal, apr, months]] of loans.entries()) {
    await s.click(page.getByRole('button', { name: 'הוספת הלוואה' }).first());
    await page.waitForTimeout(500);
    await s.type(page.getByLabel('שם ההלוואה').nth(i), name);
    await s.type(page.getByRole('textbox', { name: 'קרן', exact: true }).nth(i), principal);
    await s.type(page.getByRole('textbox', { name: 'ריבית שנתית', exact: true }).nth(i), apr);
    await s.type(page.getByRole('textbox', { name: 'תקופה', exact: true }).nth(i), months);
  }
  await s.cursorOff();
  await s.caption('תמונה מלאה של ההלוואות', 2200, 'איחוד הלוואות ואסטרטגיה לפירעון');
  await s.scrollBy(400);
  await s.hold(1800);

  await s.finish();
  return s;
}

// ─────────────────────────── קטע 2: נרשמים — תכנון הון עצמי ───────────────────────────

async function recordEquity(browser, market) {
  const s = await Segment.open(browser, market, 'equity', { demoStep: { step: STAGE.equity, route: '/equity-planning' } });
  const page = s.page;
  await page.locator(sel('eq-price')).first().waitFor({ timeout: 30_000 });
  const chapter = ['נרשמים בחינם', 'הנתונים נשמרים, ונפתחים עוד כלים', [
    'כל מה שהזנתם נשמר בחשבון',
    'עוד כלים חינמיים נפתחים לרשומים',
    'שימוש בכלים החינמיים ללא הגבלה',
  ]];
  await s.chapterCard(...chapter);
  await page.waitForTimeout(700);
  await s.begin();
  await s.chapter(...chapter, 4200);

  // ─── תכנון הון עצמי: יותר מעשר שורות, לוח שנה מלא והדוח הסופי ───
  await s.caption('תכנון הון עצמי: כל הוצאה עד קבלת המפתח', 0, 'לרשומים, ללא הגבלה');
  await s.hold(1300);
  await s.type(sel('eq-price'), '2100000');
  await s.click(sel('eq-profile-first-home'));
  for (let i = 0; i < 2; i += 1) await s.click(page.getByRole('button', { name: 'החודש הבא' }).first());
  await s.click(page.getByRole('button', { name: '15', exact: true }).first(), { optional: true });
  await s.click(sel('eq-continue-expenses'), { soft: true });
  await page.locator(sel('eq-expenses-table')).first().waitFor({ timeout: 15_000 });
  await s.wait(600);

  // סכום ומועד לכל שורה, קטגוריה אחרי קטגוריה. השורות ממוינות לפי מועד, ולכן
  // כל פעם מחפשים מחדש את השורה הראשונה שעוד אין בה סכום
  const plan = [
    ['עלות לקיחת משכנתא', [['3500', '2026-11-03'], ['2800', '2026-11-10'], ['1900', '2026-11-17']]],
    ['משפטי', [['9500', '2026-11-05']]],
    ['מציאת נכס', [['1200', '2026-11-02'], ['1600', '2026-11-09']]],
    ['מיסוי', [['16500', '2026-11-19'], ['4200', '2026-11-24']]],
    ['בדירה החדשה', [['48000', '2026-11-23'], ['26000', '2026-11-26'], ['32000', '2026-11-30']]],
  ];
  let rowsTyped = 0;
  for (const [category, rows] of plan) {
    const header = page.locator('button', { hasText: category }).first();
    await s.click(header);
    await page.waitForTimeout(450);
    const panel = header.locator('xpath=following-sibling::div[1]');
    const rowEls = panel.locator('xpath=./div/div[contains(@class,"rounded-2xl")]');
    for (const [amount, when] of rows) {
      const index = await rowEls.evaluateAll((els) =>
        els.findIndex((el) => {
          const input = el.querySelector('input[placeholder="0"]');
          return input && input.value === '';
        })
      );
      if (index < 0) break;
      const row = rowEls.nth(index);
      await s.type(row.locator('input[placeholder="0"]').first(), amount);
      await s.date(row.locator('input[type="date"]').first(), when);
      rowsTyped += 1;
      if (rowsTyped === 1) await s.caption('מזינים סכום ומועד לכל הוצאה', 0, 'עורך דין, מסים, שמאות, שיפוץ ועוד');
    }
    await s.click(header); // סוגרים, כדי שהטבלה תישאר קומפקטית
    await page.waitForTimeout(300);
  }
  console.log(`[equity] הוזנו ${rowsTyped} שורות בטבלת ההוצאות`);
  await s.cursorOff();
  await s.scrollTo(page.getByText('לוח התשלומים').first(), 'start');
  await s.caption('כל תשלום נכנס ללוח השנה', 0, 'וההון מתחלק לפי קטגוריות');
  // הלוח נפתח בחודש אחר; עוברים לחודש שבו נמצאות ההוצאות (נובמבר 2026)
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const nextMonth = page.getByRole('button', { name: 'החודש הבא' }).first();
  const monthLabel = nextMonth.locator('xpath=..').locator('p').first();
  for (let i = 0; i < 8; i += 1) {
    const label = ((await monthLabel.textContent().catch(() => '')) ?? '').trim();
    const match = label.match(/([א-ת]+)\s+(\d{4})/);
    if (!match) break;
    const shown = Number(match[2]) * 12 + MONTHS.indexOf(match[1]);
    const goal = 2026 * 12 + 10;
    if (shown === goal) break;
    await s.click(page.getByRole('button', { name: shown < goal ? 'החודש הבא' : 'החודש הקודם' }).first(), { optional: true, soft: true });
  }
  await s.cursorOff();
  await s.hold(2600);
  await s.scrollTo(page.getByText('חלוקת ההון').first(), 'center');
  await s.hold(2000);

  // ─── הדוח הסופי ───
  await s.click(sel('eq-continue-summary'), { soft: true });
  await s.cursorOff();
  await s.scrollTop();
  await s.caption('הדוח הסופי: כמה כסף צריך, ומתי', 0, 'תזרים חודשי עד קבלת המפתח');
  await s.hold(2600);
  await s.scrollBy(450);
  await s.hold(1800);
  await s.scrollBy(450);
  await s.hold(1500);
  await s.scrollTo(sel('eq-export-pdf'), 'center');
  await s.point(sel('eq-export-pdf'));
  await s.caption('ומפיקים אותו כ-PDF או כקובץ אקסל', 0, 'לשמירה, להדפסה ולשיתוף');
  await s.hold(1600);
  await s.cursorOff();
  await s.hold(400);

  await s.finish();
  return s;
}

// ─────────────────────────── קטע 3: האזור האישי ───────────────────────────

async function recordDashboard(browser, market) {
  const s = await Segment.open(browser, market, 'dash', { demoStep: { step: STAGE.dashboard, route: '/demo/dashboard' } });
  const page = s.page;
  await s.begin();

  await s.caption('האזור האישי: כל המשכנתא שלכם במסך אחד', 2600);
  const fab = page.getByRole('button', { name: /^פעולות/ }).first();
  const fabBox = await fab.boundingBox().catch(() => null);
  if (fabBox) {
    await s.click(fab, { optional: true, soft: true });
    await s.cursorOff();
    await s.caption('כפתור הפעולות הצף: פעולות מהירות מכל מסך', 0, 'אישור עקרוני, תמהיל, מיחזור, מסמכים ועוד');
    await s.hold(2800);
    await s.clickAt(fabBox); // אותו כפתור סוגר את התפריט
    await s.cursorOff();
  }

  // ─── מצב הון ותזרים, והמחשבון המהיר ───
  await s.click(page.locator(`${sel('dash-nav-cash-flow')}:visible`).first(), { soft: true });
  await s.cursorOff();
  await s.caption('מצב הון ותזרים: הכנסות, משכנתא והלוואות', 0, 'וכמה כסף נשאר בכל חודש');
  await s.hold(2400);
  const calculatorTitle = page.getByText('מחשבון הלוואה מהיר', { exact: true }).first();
  await s.scrollTo(calculatorTitle, 'center');
  const calculator = calculatorTitle.locator('xpath=ancestor::*[.//input][1]');
  await s.caption('מחשבון הלוואה מהיר', 0, 'סכום, תקופה וריבית, וההחזר החודשי מחושב מיד');
  await s.hold(900);
  await s.type(calculator.locator('input').nth(0), '50000');
  await s.type(calculator.locator('input').nth(1), '24');
  await s.type(calculator.locator('input').nth(2), '6');
  await s.cursorOff();
  await s.hold(1800);
  await s.caption('נועלים את ההחזר, ומשנים את התקופה', 0, 'והמחשבון מחשב כמה אפשר ללוות באותו החזר');
  await s.click(page.getByRole('button', { name: 'נעילת החזר חודשי' }).first(), { optional: true });
  await s.click(page.getByRole('button', { name: 'שחרור סכום ההלוואה' }).first(), { optional: true });
  await s.type(calculator.locator('input').nth(1), '36');
  await s.cursorOff();
  await s.hold(2200);
  await s.click(page.getByRole('button', { name: /בדיקה ל-18 חודשים/ }).first(), { optional: true, soft: true });
  await s.cursorOff();
  await s.caption('ובדיקה ל-18 חודשים', 2600, 'האם ההלוואה פוגעת ביכולת לקחת משכנתא');

  // ─── לוח שנה, מסמכים, צ׳אט ומיילים ───
  await s.click(page.locator(`${sel('dash-nav-agenda')}:visible`).first(), { soft: true });
  await s.cursorOff();
  await s.scrollTop();
  await s.caption('לוח שנה ומשימות', 0, 'פגישות, מועדים ומה עוד פתוח');
  await s.hold(2200);
  await s.scrollBy(900);
  await s.hold(1600);

  await s.click(page.locator(`${sel('dash-nav-documents')}:visible`).first(), { soft: true });
  await s.cursorOff();
  await s.scrollTop();
  await s.caption('תיק המסמכים', 0, 'כל האישורים וההגשות לבנקים, במקום אחד');
  await s.hold(2200);
  await s.scrollBy(650);
  await s.hold(1500);

  await s.click(page.getByText('צ׳אט עם נציג').first(), { soft: true });
  await s.cursorOff();
  await s.caption('צ׳אט עם היועץ, מכל מסך', 2300);
  await s.click(page.getByRole('button', { name: /מיילים/ }).first(), { optional: true, soft: true });
  await s.cursorOff();
  await s.caption('והמיילים עם הבנקים, בתוך הפלטפורמה', 2500);

  await s.finish();
  return s;
}

// ─────────────────────────── קטע 4: חמשת השלבים ───────────────────────────

async function recordPlan(browser, market) {
  const s = await Segment.open(browser, market, 'plan', { demoStep: { step: STAGE.plan, route: '/demo/plan' } });
  const page = s.page;
  const chapter = ['במנוי לפלטפורמה', 'תהליך המשכנתא בחמישה שלבים', [
    'מהפרופיל הפיננסי ועד החתימה בבנק',
    'בכל שלב: מה עושים, ומה מגישים לבנק',
    'ובכל שלב אפשר לפנות ליועץ',
  ]];
  await s.chapterCard(...chapter);
  await page.waitForTimeout(700);
  await s.begin();
  await s.chapter(...chapter, 4300);
  await s.caption('חמישה שלבים, לפי הסדר', 0, 'והנתונים שכבר הזנתם נמצאים בפנים');
  await s.hold(2400);

  // ─── בכל שלב: פנו ליועץ, ותפריט הפעולות הצף ───
  const advisor = page.getByRole('button', { name: /^פנו ליועץ/ }).first();
  await s.point(advisor).catch(() => undefined);
  await s.caption('בכל שלב: "פנו ליועץ"', 0, 'יועץ משכלנתא נכנס לתמונה עם כל מה שכבר הזנתם');
  await s.hold(2600);
  const fab = page.getByRole('button', { name: /^פתיחת תפריט הפעולות/ }).first();
  const fabBox = await fab.boundingBox().catch(() => null);
  if (fabBox) {
    await s.caption('ותפריט הפעולות הצף', 0, 'משימה חדשה, צ׳אט ומייל, תיק המסמכים וחזרה לאזור האישי');
    await s.click(fab, { optional: true, soft: true });
    await s.cursorOff();
    await s.hold(2600);
    await s.clickAt(fabBox);
    await s.cursorOff();
  }

  /** מעבר לשלב: לחיצה בסרגל, ומסך ההסבר של השלב אם יש */
  const openStage = async (stage, title, sub) => {
    await s.page.evaluate(() => (document.getElementById('promo-caption').textContent = ''));
    await s.scrollTop();
    await s.click(sel(`plan-stage-${stage}`), { soft: true });
    await s.cursorOff();
    await s.scrollTo(sel('plan-stage-title'), 'start').catch(() => undefined);
    const intro = page.locator(sel('plan-stage-intro-start')).first();
    if (await intro.isVisible().catch(() => false)) {
      await s.caption(title, 0, 'מה עושים בשלב, ומה יש לכם בסופו');
      await s.hold(2800);
      await s.click(intro, { optional: true, soft: true });
      await s.cursorOff();
      await s.scrollTo(sel('plan-stage-title'), 'start').catch(() => undefined);
    }
    await s.caption(title, 0, sub);
  };

  // ─── שלב 1: פרופיל פיננסי ───
  await openStage('ANALYSIS', 'שלב 1, פרופיל פיננסי', 'הנכס, הלווים, ההכנסות והמסמכים, כבר מלאים');
  await s.hold(2000);
  await s.click(page.getByRole('button', { name: /דוח הפרופיל/ }).first(), { optional: true, soft: true });
  await s.cursorOff();
  await s.caption('דוח הפרופיל לבנק', 0, 'יחס מימון, יחס החזר ועמידה בהוראות בנק ישראל');
  await s.hold(2400);
  await s.scrollBy(700);
  await s.hold(1700);
  await s.scrollBy(700);
  await s.hold(1500);

  // ─── שלב 2: בניית תמהיל ───
  await openStage('MIX', 'שלב 2, בניית תמהיל', 'בונים, משווים, ומפיקים הצעה לבנקים');
  await s.hold(2000);
  await s.click(page.getByRole('button', { name: /^תמהיל נוסף לנכס הזה/ }).first(), { soft: true });
  await s.cursorOff();
  await s.caption('בונים תמהיל, מסלול אחרי מסלול', 0, 'סוג ריבית ואחוז מהמשכנתא, והגרפים מתעדכנים');
  if (!(await page.locator(sel('ws-track-0')).count())) await s.click(sel('ws-add-track'));
  const percent = (i) => page.locator(sel(`ws-track-${i}`)).locator('input').nth(1);
  const typeTrigger = (i) => page.locator(sel(`ws-track-${i}`)).locator('button[role="combobox"]').nth(1);
  await s.type(percent(0), '40');
  await s.click(sel('ws-add-track'));
  await choose(s, typeTrigger(1), 2); // פריים
  await s.type(percent(1), '35');
  await s.click(sel('ws-add-track'));
  await choose(s, typeTrigger(2), 3); // משתנה לא צמודה
  await s.type(percent(2), '25');
  await s.cursorOff();
  await s.hold(1500);
  await s.caption('ושומרים את התמהיל', 0, 'אפשר לבנות כמה תמהילים לאותו נכס');
  await s.click(page.getByRole('button', { name: /^שמור תמהיל/ }).first(), { soft: true });
  await s.cursorOff();
  await s.hold(1300);
  await s.scrollBy(320);
  await s.caption('והגרפים מראים את התמונה המלאה', 0, 'יתרת חוב, החזר חודשי, וקרן מול ריבית לאורך השנים');
  await s.hold(2600);

  await s.click(page.getByRole('button', { name: /^לוח החזרים$/ }).first(), { soft: true });
  await s.cursorOff();
  await s.caption('לוח החזרים מלא, חודש אחרי חודש', 0, 'קרן, ריבית ויתרה, עם ייצוא לאקסל');
  await s.hold(2200);
  await s.scrollInside(page.locator('[role="dialog"] tbody tr, [role="dialog"] [role="row"]').nth(4), 520);
  await s.hold(1800);
  await closeDialog(s);

  await s.click(page.getByRole('button', { name: /^פרעון מוקדם$/ }).first(), { soft: true });
  await s.cursorOff();
  await s.caption('פרעון מוקדם: מה קורה אם מקדימים תשלום', 0, 'קיצור תקופה או הקטנת ההחזר, וכמה חוסכים בריבית');
  await s.hold(2400);
  await s.click(page.getByRole('button', { name: /^הקטנת ההחזר החודשי/ }).first(), { optional: true });
  await s.cursorOff();
  await s.hold(2200);
  await closeDialog(s);

  await s.click(page.getByRole('button', { name: /^הצעה לבנקים/ }).first(), { soft: true });
  await s.cursorOff();
  await s.caption('ההצעה לבנקים: מכתב מסודר עם התמהיל', 0, 'מסלולים, סכומים ולוח סילוקין, לשמירה כ-PDF או כאקסל');
  await s.hold(2200);
  await s.click(page.locator('[role="dialog"]').last().getByRole('button', { name: 'לאומי', exact: true }), { optional: true });
  await s.cursorOff();
  const letter = page.locator('[role="dialog"]').last().getByText('בקשה לקבלת הצעת ריביות').first();
  await s.scrollInside(letter, 420);
  await s.hold(1800);
  await s.scrollInside(letter, 420);
  await s.hold(1600);
  await s.point(page.getByRole('button', { name: /שמירה כ-PDF/ }).first()).catch(() => undefined);
  await s.hold(1300);
  await closeDialog(s);

  // ─── שלבים 3–5 ───
  await openStage('APPLICATIONS', 'שלב 3, אישור עקרוני', 'מגישים לכמה בנקים, וכל אישור נשמר בתיק');
  await s.hold(2400);
  await s.scrollBy(600);
  await s.hold(1500);

  await openStage('AUCTION', 'שלב 4, מכרז ריביות', 'מזינים את הריביות מכל בנק ומשווים בין ההצעות');
  await s.hold(2400);
  await s.scrollBy(600);
  await s.hold(1500);

  await openStage('SIGNING', 'שלב 5, חתימה בבנק', 'צ׳ק־ליסט לחתימה, בטחונות ומסמכים לבנק');
  await s.hold(2400);
  await s.scrollBy(500);
  await s.hold(1500);

  await s.endCard(4200);
  await s.finish();
  return s;
}

async function main() {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(join(WORK, 'frames'), { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  });
  const market = readFileSync(join(here, 'market-snapshot.json'), 'utf8');

  // טעינה ראשונה מחממת את המסכים, כדי שהסרטון לא יחכה להם
  {
    const context = await browser.newContext({ viewport: VIEWPORT });
    await context.route('**/api/boi/mortgage-market', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: market }));
    const page = await context.newPage();
    for (const path of ['/', '/mortgage-planning?flow=affordability', '/equity-planning', '/mortgage-refinance', '/consumer-loans', '/demo/dashboard', '/demo/plan']) {
      await page.goto(BASE_URL + path, { waitUntil: 'load', timeout: 180_000 }).catch(() => undefined);
    }
    await context.close();
  }

  // ONLY=free,plan — הקלטה חלקית בזמן כיוונון
  const only = process.env.ONLY ? process.env.ONLY.split(',').map((name) => name.trim()) : null;
  const parts = { free: recordFreeTools, equity: recordEquity, dash: recordDashboard, plan: recordPlan };
  const segments = [];
  for (const [name, record] of Object.entries(parts)) {
    if (!only || only.includes(name)) segments.push(await record(browser, market));
  }
  await browser.close();

  // ─── חיבור הקטעים לציר זמן אחד ───
  const entries = [];
  const windows = [];
  const cues = [];
  let clock = 0;
  for (const segment of segments) {
    const line = segment.timeline();
    const offset = entries.length;
    // המעבר בין קטע לקטע, וכל מעבר מסך בתוך הקטע
    if (offset > 0) windows.push([offset, offset]);
    line.windows.forEach(([a, b]) => windows.push([offset + a, offset + b]));
    segment.cues.forEach((cue) => cues.push({ start: clock + line.remap(cue.t), text: cue.text }));
    entries.push(...line.entries.map(({ file, duration }) => ({ file, duration })));
    clock += line.total;
  }
  cues.forEach((cue, i) => (cue.end = cues[i + 1]?.start ?? clock));

  // ─── מעברים רכים במקום קפיצות (soften.py, דורש Pillow) ───
  let frames = entries;
  writeFileSync(join(WORK, 'entries.json'), JSON.stringify({ entries, windows }));
  try {
    execFileSync(process.env.PYTHON ?? 'python3', [join(here, 'soften.py'), join(WORK, 'entries.json'), join(WORK, 'entries-soft.json')], { stdio: 'inherit' });
    const soft = JSON.parse(readFileSync(join(WORK, 'entries-soft.json'), 'utf8'));
    frames = soft.entries;
    // המעברים מזיזים מעט את ציר הזמן; הכתוביות עוברות לזמנים החדשים
    const original = [];
    entries.reduce((at, entry) => (original.push(at), at + entry.duration), 0);
    const shift = (t) => {
      let k = 0;
      while (k + 1 < original.length && original[k + 1] <= t) k += 1;
      return soft.starts[k] + Math.min(t - original[k], entries[k].duration);
    };
    cues.forEach((cue) => {
      cue.start = shift(cue.start);
      cue.end = shift(cue.end);
    });
  } catch (error) {
    console.warn('המעברים הרכים לא נוצרו (חסר Python או Pillow?) — הסרטון ייצא עם חיתוכים רגילים');
  }

  const lines = frames.flatMap((entry) => [`file '${entry.file}'`, `duration ${entry.duration.toFixed(4)}`]);
  lines.push(`file '${frames[frames.length - 1].file}'`);
  writeFileSync(join(WORK, 'frames.txt'), lines.join('\n'));

  const video = join(OUT_DIR, 'mashkalanta-promo.mp4');
  const narration = process.env.NARRATION && existsSync(process.env.NARRATION) ? process.env.NARRATION : null;
  const args = ['-y', '-f', 'concat', '-safe', '0', '-i', join(WORK, 'frames.txt')];
  if (narration) args.push('-i', narration);
  args.push(
    '-vf', `fps=${FPS},scale=1920:1080:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-profile:v', 'high', '-movflags', '+faststart'
  );
  if (narration) args.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
  else args.push('-an');
  args.push(video);
  execFileSync(FFMPEG, args, { stdio: 'inherit' });

  // עותק WebM (VP9) לדפדפנים בלי H.264 (SKIP_WEBM=1 מדלג, להקלטות ניסיון)
  if (!process.env.SKIP_WEBM) execFileSync(FFMPEG, ['-y', '-i', video, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', ...(narration ? ['-c:a', 'libopus', '-b:a', '96k'] : ['-an']), join(OUT_DIR, 'mashkalanta-promo.webm')], { stdio: 'inherit' });

  // תמונת פתיחה (פוסטר) — מתוך דף הבית
  execFileSync(FFMPEG, ['-y', '-ss', '1.0', '-i', video, '-frames:v', '1', '-update', '1', '-vf', 'scale=1280:-2', '-q:v', '4', join(OUT_DIR, 'mashkalanta-promo-poster.jpg')], { stdio: 'inherit' });

  // כתוביות (לקוראי מסך ולנגישות), על ציר הזמן של הסרטון הסופי
  const stamp = (s) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const h = String(Math.floor(ms / 3_600_000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0');
    const sec = String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0');
    return `${h}:${m}:${sec}.${String(ms % 1000).padStart(3, '0')}`;
  };
  const vtt = ['WEBVTT', ''];
  cues.forEach((cue, i) => vtt.push(String(i + 1), `${stamp(cue.start)} --> ${stamp(cue.end)}`, cue.text, ''));
  writeFileSync(join(OUT_DIR, 'mashkalanta-promo.he.vtt'), vtt.join('\n'));
  writeFileSync(join(WORK, 'cues.json'), JSON.stringify({ total: clock, cues }, null, 1));
  console.log(`נוצר ${video} · ${clock.toFixed(1)} שניות · ${entries.length} פריימים`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
