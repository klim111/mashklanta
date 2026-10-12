/**
 * הקלטת הסרטון "צפו בהדגמה קצרה" שמתחת לאנימציה בדף הבית.
 *
 * הסרטון מוקלט מהממשק האמיתי, בשלושה חלקים ובסדר הזה:
 *   1. הכלים החינמיים, כאורח: היתכנות, בדיקת מיחזור והלוואות צרכניות.
 *   2. לרשומים: תכנון הון עצמי עם טבלת הוצאות מלאה ולוח שנה, ואז האזור
 *      האישי (פעולות מהירות, מצב הון ותזרים, לוח שנה ומשימות, תיק המסמכים,
 *      צ׳אט ומיילים). החלק הזה רץ בתוך ההדגמה (נתונים לדוגמה, בלי שרת).
 *   3. חמשת השלבים של תהליך המשכנתא, עם הדוחות שמפיקים לבנק.
 *
 * הסקריפט מזיז עכבר, מקליד ומציג כתוביות בעצמו. ההדגמה `promo`
 * (src/demo/catalog/flows/promo.ts) משמשת רק במה מושהית לחלקים של הרשומים.
 *
 * הרצה (האתר רץ ב-http://localhost:3000, עדיף `next build && next start`):
 *   npm i --no-save playwright-core@1.56.1
 *   node scripts/promo-video/record.mjs
 *
 * משתני סביבה: BASE_URL, CHROMIUM (נתיב לדפדפן), FFMPEG (נתיב ל-ffmpeg),
 * OUT_DIR (ברירת מחדל public/promo), NARRATION (קובץ שמע לקריינות, אופציונלי),
 * SPEED (האצת הפעולות), WORK_DIR.
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
const SPEED = Number(process.env.SPEED ?? 2.8);
/** הקלדה מואצת פחות, כדי שיראו את הערכים נכתבים */
const TYPING_SPEED = 1.5;
const DEMO_KEY = 'mashkalanta:demo';
/** הצעדים של במת ההדגמה, לפי הסדר ב-promo.ts */
const STAGE = { equity: 0, dashboard: 1, plan: 2 };

/** השכבה שמעל הממשק בזמן ההקלטה: כתוביות, תג "נתונים לדוגמה", כרטיסי פרק וכרטיס סיום */
const OVERLAY_CSS = `
  .mk-demo-ui, .mk-demo-bar, .mk-demo-badge, .mk-demo-end, .mk-demo-tryit, .mk-demo-cursor,
  .driver-popover, [data-a11y-ui], nextjs-portal { display: none !important; }
  .driver-overlay { display: none !important; }
  body.driver-active, body.driver-active * { pointer-events: auto !important; }
  /* ההתראה "נרשמים כדי לשמור" נשארת על המסך, אבל לא חוסמת את העכבר */
  aside[role="status"], aside[role="status"] *, #promo-layer, #promo-layer * { pointer-events: none !important; }
  html { scroll-behavior: smooth; }
  #promo-layer { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; direction: rtl; font-family: var(--font-assistant), Assistant, sans-serif; }
  #promo-caption { position: absolute; left: 50%; bottom: 30px; transform: translateX(-50%); max-width: 1120px; width: max-content;
    padding: 13px 30px 15px; border-radius: 22px; background: rgba(15, 23, 42, 0.92); color: #fff; text-align: center;
    font-size: 36px; line-height: 1.25; font-weight: 800; box-shadow: 0 18px 50px rgba(15, 23, 42, 0.35); }
  #promo-caption.is-in { animation: promo-in 360ms cubic-bezier(.2,.8,.2,1) both; }
  #promo-caption::before { content: ''; position: absolute; top: 0; right: 30px; left: 30px; height: 4px; border-radius: 0 0 4px 4px; background: #2563eb; }
  #promo-caption:empty { display: none; }
  #promo-caption small { display: block; margin-top: 4px; font-size: 26px; font-weight: 700; color: #bfdbfe; }
  #promo-tag { position: absolute; top: 80px; left: 14px; padding: 5px 12px; border-radius: 999px; background: rgba(15, 23, 42, 0.72);
    color: #e2e8f0; font-size: 15px; font-weight: 700; }
  #promo-chapter, #promo-end { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
    background: radial-gradient(circle at 50% 35%, #1e3a8a 0%, #0f172a 72%); color: #fff; text-align: center; padding: 0 60px; }
  #promo-chapter.is-on, #promo-end.is-on { display: flex; animation: promo-fade 350ms ease both; }
  #promo-chapter i { font-style: normal; padding: 6px 18px; border-radius: 999px; background: rgba(96, 165, 250, 0.18); color: #93c5fd; font-size: 24px; font-weight: 800; }
  #promo-chapter b { font-size: 64px; font-weight: 900; line-height: 1.15; }
  #promo-chapter ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  #promo-chapter li { font-size: 32px; font-weight: 700; color: #e2e8f0; }
  #promo-chapter li::before { content: '✓'; color: #34d399; margin-left: 12px; font-weight: 900; }
  #promo-end b { font-size: 104px; font-weight: 900; letter-spacing: -1px; }
  #promo-end b span { color: #60a5fa; }
  #promo-end p { font-size: 38px; font-weight: 700; color: #cbd5e1; margin: 0; }
  #promo-end em { font-style: normal; margin-top: 18px; padding: 14px 34px; border-radius: 18px; background: #2563eb; font-size: 32px; font-weight: 800; }
  #promo-cursor { position: absolute; top: 0; left: 0; width: 26px; height: 30px; display: none; transition: transform 380ms cubic-bezier(.3,.7,.2,1);
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
    await this.hold(holdMs);
    await this.page.evaluate(() => document.getElementById('promo-chapter').classList.remove('is-on'));
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
    await this.page.waitForTimeout(420);
  }

  async click(target, { optional = false } = {}) {
    try {
      const locator = this.locator(target);
      await this.point(locator);
      await locator.click({ timeout: 10_000 });
      await this.page.waitForTimeout(300);
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

  async type(target, text) {
    const locator = this.locator(target);
    await this.click(locator);
    await locator.fill('');
    const a = now();
    await locator.pressSequentially(String(text), { delay: 85 });
    this.ranges.push([a, now(), 1 / TYPING_SPEED]);
    await this.page.waitForTimeout(150);
  }

  /** שדה תאריך: מצביעים עליו וממלאים */
  async date(target, value) {
    const locator = this.locator(target);
    await this.point(locator);
    await locator.fill(value);
    await this.page.waitForTimeout(150);
  }

  async scrollTo(target, block = 'start') {
    await this.locator(target).evaluate((element, block) => element.scrollIntoView({ behavior: 'smooth', block }), block);
    await this.page.waitForTimeout(900);
  }

  async scrollBy(top) {
    await this.page.evaluate((top) => window.scrollBy({ top, behavior: 'smooth' }), top);
    await this.page.waitForTimeout(800);
  }

  async scrollTop() {
    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await this.page.waitForTimeout(600);
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
      entries.push({ file: frame.file, duration });
      clock += duration;
    });
    return { entries, remap, total: clock };
  }
}

// ─────────────────────────── חלק 1: הכלים החינמיים, כאורח ───────────────────────────

async function recordFreeTools(browser, market) {
  const s = await Segment.open(browser, market, 'free');
  const page = s.page;
  await page.waitForTimeout(2500);
  await s.begin();

  await s.caption('משכלנתא: כל המשכנתא שלכם, בפלטפורמה אחת', 1500);
  await s.scrollTo(sel('home-free-tools'));
  await s.caption('מתחילים בכלים החינמיים', 1500, 'פתוחים לכולם, בלי הרשמה');

  // ─── היתכנות ───
  await s.goto('/mortgage-planning?flow=affordability', sel('mp-property-0'));
  await s.caption('כמה משכנתא אפשר לקבל?', 0, 'מזינים הון עצמי והכנסה, לפי כללי בנק ישראל');
  await s.hold(900);
  await s.click(sel('mp-property-0'));
  await s.click(sel('mp-borrower-individual'));
  await s.type(sel('mp-own-capital'), '700000');
  await s.type(sel('mp-age'), '34');
  await s.type(sel('mp-income'), '25000');
  await s.click(sel('mp-loans-no'));
  await s.click(sel('mp-submit'));
  await page.locator(sel('mp-max-property')).first().waitFor({ timeout: 15_000 });
  await page.keyboard.press('Escape').catch(() => undefined);
  await s.cursorOff();
  await s.scrollTo(sel('mp-max-property'), 'center');
  await s.caption('ומקבלים מיד את מחיר הדירה וגובה המשכנתא האפשריים', 1900);
  await s.scrollTo(sel('mp-term-card'), 'center');
  await s.hold(700);

  // ─── בדיקת מיחזור ───
  await s.goto('/mortgage-refinance');
  await s.caption('בדיקת מיחזור: בוחרים מטרה ומזינים את המשכנתא של היום', 900);
  await s.click(page.getByText('הקטנת ההחזר החודשי').first(), { optional: true });
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
  await s.click(page.getByRole('button', { name: /בדיקת אפשרויות המיחזור/ }));
  await s.cursorOff();
  await s.wait(700);
  await s.caption('ורואים מיד כמה אפשר לחסוך, מול הריביות של בנק ישראל', 2000);
  await s.scrollBy(360);
  await s.hold(900);

  // ─── הלוואות צרכניות ───
  await s.goto('/consumer-loans', 'text=הוספת הלוואה');
  await s.caption('הלוואות צרכניות: מזינים כל הלוואה', 0, 'ורואים מה היא עושה להחזר החודשי וליחס ההחזר');
  await s.hold(700);
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
  await s.caption('תמונה מלאה של ההלוואות, איחוד ואסטרטגיה לפירעון', 1800);
  await s.scrollBy(380);
  await s.hold(900);

  await s.finish();
  return s;
}

// ─────────────────────────── חלקים 2–3: לרשומים, וחמשת השלבים ───────────────────────────

async function recordRegistered(browser, market) {
  const s = await Segment.open(browser, market, 'reg', { demoStep: { step: STAGE.equity, route: '/equity-planning' } });
  const page = s.page;
  await page.locator(sel('eq-price')).first().waitFor({ timeout: 30_000 });
  await s.begin();

  await s.chapter('נרשמים בחינם', 'הנתונים נשמרים, ונפתחים עוד כלים', [
    'כל מה שהזנתם נשמר בחשבון',
    'עוד כלים חינמיים נפתחים לרשומים',
    'שימוש בכלים החינמיים ללא הגבלה',
  ], 3200);

  // ─── תכנון הון עצמי: יותר מעשר שורות, ולוח שנה מלא ───
  await s.caption('תכנון הון עצמי: כל הוצאה עד קבלת המפתח', 0, 'לרשומים, ללא הגבלה');
  await s.hold(800);
  await s.type(sel('eq-price'), '2100000');
  await s.click(sel('eq-profile-first-home'));
  for (let i = 0; i < 2; i += 1) await s.click(page.getByRole('button', { name: 'החודש הבא' }).first());
  await s.click(page.getByRole('button', { name: '15', exact: true }).first(), { optional: true });
  await s.click(sel('eq-continue-expenses'));
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
  console.log(`[reg] הוזנו ${rowsTyped} שורות בטבלת ההוצאות`);
  await s.cursorOff();
  await s.scrollTo(page.getByText('לוח התשלומים').first(), 'start');
  await s.caption('כל תשלום נכנס ללוח השנה', 0, 'וההון מתחלק לפי קטגוריות');
  // הלוח נפתח בחודש הראשון של התשלומים; עוברים לחודש שבו נמצאות ההוצאות
  for (let i = 0; i < 6; i += 1) {
    if (await page.getByText('נובמבר 2026').first().isVisible().catch(() => false)) break;
    const label = (await page.getByText(/^[א-ת]+ 20\d\d$/).first().textContent().catch(() => '')) ?? '';
    const forward = /2025|ינואר 2026|פברואר 2026|מרץ 2026|אפריל 2026|מאי 2026|יוני 2026|יולי 2026|אוגוסט 2026|ספטמבר 2026|אוקטובר 2026/.test(label);
    await s.click(page.getByRole('button', { name: forward ? 'החודש הבא' : 'החודש הקודם' }).first(), { optional: true });
  }
  await s.cursorOff();
  await s.hold(2200);
  await s.scrollTo(page.getByText('חלוקת ההון').first(), 'center');
  await s.hold(1500);
  await s.click(sel('eq-continue-summary'));
  await s.cursorOff();
  await s.wait(900);
  await s.caption('ובסיכום: תזרים חודשי, כמה כסף צריך ומתי', 1900);
  await s.scrollBy(420);
  await s.hold(700);

  // ─── האזור האישי ───
  await s.loadStage(STAGE.dashboard, '/demo/dashboard');
  await s.caption('האזור האישי: כל המשכנתא שלכם במסך אחד', 2000);
  await s.click(page.getByRole('button', { name: /^פעולות/ }).first(), { optional: true });
  await s.cursorOff();
  await s.wait(500);
  await s.caption('פעולות מהירות: אישור עקרוני, תמהיל, מיחזור, מסמכים ועוד', 2100);

  await s.click(sel('dash-nav-cash-flow'));
  await s.cursorOff();
  await s.wait(600);
  await s.caption('מצב הון ותזרים: הכנסות, משכנתא והלוואות', 0, 'וכמה כסף נשאר בכל חודש');
  await s.hold(1500);
  await s.scrollBy(1500);
  await s.hold(1200);

  await s.click(sel('dash-nav-agenda'));
  await s.cursorOff();
  await s.wait(600);
  await s.caption('לוח שנה ומשימות: פגישות, מועדים ומה פתוח', 1700);
  await s.scrollBy(900);
  await s.hold(1100);

  await s.click(sel('dash-nav-documents'));
  await s.cursorOff();
  await s.wait(600);
  await s.caption('תיק המסמכים: כל האישורים וההגשות לבנקים', 0, 'שמורים במקום אחד');
  await s.hold(1500);
  await s.scrollBy(650);
  await s.hold(900);

  await s.click(page.getByText('צ׳אט עם נציג').first());
  await s.wait(700);
  await s.caption('צ׳אט עם היועץ, מכל מסך', 1700);
  await s.click(page.getByRole('button', { name: /מיילים/ }).first(), { optional: true });
  await s.cursorOff();
  await s.wait(500);
  await s.caption('והמיילים עם הבנקים, בתוך הפלטפורמה', 1900);

  // ─── חמשת השלבים ───
  await s.loadStage(STAGE.plan, '/demo/plan');
  // שאלת החוזה על פעימות התשלום קופצת שוב ושוב במסך הזה בהדגמה. היא (וכל חלון אחר) לא חלק
  // מהסיפור של הסרטון, ולכן מוסתרת בהקלטה (בלי לענות עליה ובלי לשמור דבר)
  await page.addStyleTag({
    content: `
      body { pointer-events: auto !important; }
      div[role="dialog"] { display: none !important; }
      div.fixed.inset-0.z-50.backdrop-blur-sm { display: none !important; }
    `,
  });
  await page.waitForTimeout(500);
  await s.chapter('במנוי לפלטפורמה', 'תהליך המשכנתא בחמישה שלבים', [
    'מהפרופיל הפיננסי ועד החתימה בבנק',
    'בכל שלב: מה עושים, ומה מגישים לבנק',
  ], 3000);
  await s.caption('חמישה שלבים, והנתונים כבר בפנים', 1500);

  const openStage = async (stage) => {
    await s.page.evaluate(() => (document.getElementById('promo-caption').textContent = ''));
    await s.scrollTop();
    await s.click(sel(`plan-stage-${stage}`));
    await s.wait(700);
    const intro = page.locator(sel('plan-stage-intro-start')).first();
    if (await intro.isVisible().catch(() => false)) await s.click(intro, { optional: true });
    await s.cursorOff();
    await s.wait(600);
  };

  await openStage('ANALYSIS');
  await s.click(page.getByRole('button', { name: /דוח הפרופיל/ }).first(), { optional: true });
  await s.cursorOff();
  await s.wait(700);
  await s.caption('שלב 1, פרופיל פיננסי', 0, 'דוח מסודר לבנק: יחס מימון, יחס החזר ועמידה בהוראות בנק ישראל');
  await s.hold(1700);
  await s.scrollBy(900);
  await s.hold(800);
  await s.scrollBy(900);
  await s.hold(700);

  await openStage('MIX');
  await s.scrollTo(sel('plan-stage-content'), 'start');
  await s.caption('שלב 2, בניית תמהיל', 0, 'משווים תמהילים ומפיקים הצעה מסודרת לבנקים');
  await s.point(page.getByRole('button', { name: /הצעה לבנקים/ }).first()).catch(() => undefined);
  await s.hold(2000);
  await s.cursorOff();

  await openStage('APPLICATIONS');
  await s.scrollTo(page.getByText('הגשת הבקשה לבנקים').first(), 'start').catch(() => undefined);
  await s.caption('שלב 3, אישור עקרוני', 0, 'מגישים לכמה בנקים, וכל אישור נשמר בתיק');
  await s.hold(2000);

  await openStage('AUCTION');
  await s.scrollTo(sel('plan-stage-content'), 'start');
  await s.caption('שלב 4, מכרז ריביות', 0, 'בקשת ריביות לכל בנק וטבלת השוואה בין ההצעות');
  await s.hold(2000);

  await s.page.evaluate(() => (document.getElementById('promo-caption').textContent = ''));
  await s.scrollTop();
  await s.click(sel('plan-stage-SIGNING'));
  await s.cursorOff();
  await s.wait(800);
  await s.scrollTo(page.getByText('מה עושים בשלב').first(), 'center').catch(() => undefined);
  await s.caption('שלב 5, חתימה בבנק', 0, 'צ׳ק־ליסט לחתימה, בדיקת מסמכי הבנק ודוח פעימות לעורך הדין');
  await s.hold(2300);

  await s.endCard(3500);
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

  const only = process.env.ONLY; // free | reg — להקלטה חלקית בזמן כיוונון
  const segments = [];
  if (only !== 'reg') segments.push(await recordFreeTools(browser, market));
  if (only !== 'free') segments.push(await recordRegistered(browser, market));
  await browser.close();

  // ─── חיבור הקטעים לציר זמן אחד ───
  const entries = [];
  const cues = [];
  let clock = 0;
  for (const segment of segments) {
    const line = segment.timeline();
    segment.cues.forEach((cue) => cues.push({ start: clock + line.remap(cue.t), text: cue.text }));
    entries.push(...line.entries);
    clock += line.total;
  }
  cues.forEach((cue, i) => (cue.end = cues[i + 1]?.start ?? clock));

  const lines = entries.flatMap((entry) => [`file '${entry.file}'`, `duration ${entry.duration.toFixed(4)}`]);
  lines.push(`file '${entries[entries.length - 1].file}'`);
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

  // עותק WebM (VP9) לדפדפנים בלי H.264
  execFileSync(FFMPEG, ['-y', '-i', video, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', ...(narration ? ['-c:a', 'libopus', '-b:a', '96k'] : ['-an']), join(OUT_DIR, 'mashkalanta-promo.webm')], { stdio: 'inherit' });

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
