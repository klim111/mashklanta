/**
 * הקלטת הסרטון "צפו בהדגמה קצרה" שמתחת לאנימציה בדף הבית.
 *
 * המסך של הסרטון בנוי משני חלקים: פס כתוביות למעלה, ומתחתיו האתר עצמו (iframe ברוחב
 * של מסך מחשב מלא), כך שהכתוביות לא מסתירות אף חלק מהעמוד והעמוד נראה כולו. השקופיות
 * (החזון, ההצטרפות, הסיום) מכסות את כל המסך.
 *
 * הסדר:
 *   intro  שקופית החזון עם המאזניים, ושקופית "כל המשכנתא במקום אחד" עם הסערה.
 *   free   הכלים החינמיים, כאורח: היתכנות (כולל הזזת ערכים ונעילה), בדיקת מיחזור
 *          והלוואות צרכניות. בסופו שקופית ההצטרפות.
 *   dash   האזור האישי: הלשוניות, פעולות מהירות, לוח שנה, תזרים והמחשבון המהיר, והכלים.
 *   equity תכנון הון עצמי (מתוך הכלים): טבלת הוצאות מלאה, לוח שנה והדוח הסופי.
 *   docs   תיק המסמכים, הצ׳אט והמיילים עם כל הגורמים בעסקה.
 *   call   שיחת וידאו עם היועץ: שיתוף מסך, הצגת מסמך ושליחתו בצ׳אט.
 *   forms  כתב הסמכה ליועץ: ממלאים, חותמים, והטופס של הבנק נוצר מלא.
 *   plan   חמשת השלבים לפי הסדר, ובסוף שקופית "יש לכם משכנתא" עם החוטים.
 *   mine   "המשכנתא שלי" אחרי החתימה, וכרטיס הסיום.
 * הקטעים של הרשומים רצים בתוך ההדגמה (נתונים לדוגמה, בלי שרת).
 *
 * הסקריפט מזיז עכבר, מקליד ומציג כתוביות בעצמו. ההדגמה `promo`
 * (src/demo/catalog/flows/promo.ts) משמשת רק במה מושהית לחלקים של הרשומים, והאנימציות
 * של השקופיות מגיעות מ-/video-stage.
 *
 * הרצה (האתר רץ ב-http://localhost:3000, עדיף `next build && next start`):
 *   npm i --no-save playwright-core@1.56.1
 *   python3 -m pip install Pillow pymupdf
 *   node scripts/promo-video/record.mjs
 *
 * משתני סביבה: BASE_URL, CHROMIUM (נתיב לדפדפן), FFMPEG (נתיב ל-ffmpeg),
 * PYTHON (למעברים הרכים ולטופס, דורש Pillow ו-pymupdf), OUT_DIR (ברירת מחדל public/promo),
 * NARRATION (קובץ שמע לקריינות, אופציונלי), SPEED (האצת הפעולות), WORK_DIR,
 * ONLY (רשימת קטעים מופרדת בפסיקים, לכיוונון), SKIP_WEBM.
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
const PYTHON = process.env.PYTHON ?? 'python3';
const WORK = resolve(process.env.WORK_DIR ?? join(root, '.promo-work'));
const FPS = 30;
/** מסך מחשב מלא, כדי שכל עמוד ייראה במלואו; מוגדל ל-1920x1080 */
const VIEWPORT = { width: 1440, height: 810 };
const SCALE = 1920 / VIEWPORT.width;
/**
 * פס הכתוביות, השקופיות והטופס מעוצבים על משטח של 1760x990 ומוקטנים ב-zoom
 * לגודל המסך, כך שאפשר לשנות את גודל האתר בלי לשנות אותם
 */
const DESIGN = { width: 1760, height: 990 };
const K = VIEWPORT.width / DESIGN.width;
/** גובה פס הכתוביות שמעל האתר (ביחידות העיצוב) */
const BAND = 138;
const SITE = { x: 0, y: Math.round(BAND * K), width: VIEWPORT.width, height: VIEWPORT.height - Math.round(BAND * K) };
/** פי כמה מואצות הפעולות (תנועת עכבר, לחיצות, גלילה). זמן הקריאה של הכתוביות אינו מואץ */
const SPEED = Number(process.env.SPEED ?? 1.6);
/** הקלדה וגרירה מואצות פחות, כדי שיראו את הערכים משתנים */
const TYPING_SPEED = 1.15;
const DEMO_KEY = 'mashkalanta:demo';
const DEMO_PLAN_ID = 'demo';
/** הצעדים של במת ההדגמה, לפי הסדר ב-promo.ts */
const STAGE = { equity: 0, dashboard: 1, plan: 2, authorization: 3, meeting: 4 };
const SHELL_PATH = '/__promo-shell';

/** מה שמוסתר בתוך האתר בזמן ההקלטה: ממשק ההדגמה, ההתראה של האורח */
const APP_CSS = `
  .mk-demo-ui, .mk-demo-bar, .mk-demo-badge, .mk-demo-end, .mk-demo-tryit, .mk-demo-cursor,
  .driver-popover, [data-a11y-ui], nextjs-portal { display: none !important; }
  .driver-overlay { display: none !important; }
  body.driver-active, body.driver-active * { pointer-events: auto !important; }
  /* ההתראה "נרשמים כדי לשמור" של האורח מסתירה את התוצאות; שקופית ההצטרפות אומרת את זה */
  aside[role="status"] { display: none !important; }
  /* ההתראה "היועץ הציע לך פגישה" (NewMeetingAlert) קופצת בכל מסך של ההדגמה */
  .pointer-events-none.fixed.inset-x-4.bottom-24.z-50 { display: none !important; }
  html { scroll-behavior: smooth; }
`;

function appStyle(css) {
  // רק בתוך ה-iframe של האתר; המסגרת עצמה מעוצבת בנפרד
  if (window.top === window) return;
  const install = () => {
    if (document.getElementById('promo-app-style')) return;
    const style = document.createElement('style');
    style.id = 'promo-app-style';
    style.textContent = css;
    document.head.appendChild(style);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}

/** המסגרת של הסרטון: פס הכתוביות, האתר, השקופיות והסמן */
const SHELL_CSS = `
  html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #0f172a; }
  body { font-family: var(--font-assistant), Assistant, sans-serif; direction: rtl; }
  #band, #slide, #doc { zoom: ${K}; }
  #band { position: absolute; top: 0; left: 0; right: 0; height: ${BAND}px; box-sizing: border-box; padding: 0 250px;
    display: flex; align-items: center; justify-content: center; text-align: center; color: #fff;
    background: linear-gradient(180deg, #0f172a 0%, #172554 100%); }
  #band::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: linear-gradient(90deg, #10b981, #2563eb 55%, #7c3aed); }
  #cap b { display: block; font-size: 40px; font-weight: 900; line-height: 1.15; letter-spacing: -0.3px; }
  #cap span { display: block; margin-top: 6px; font-size: 25px; font-weight: 700; line-height: 1.3; color: #bfdbfe; }
  #cap span:empty { display: none; }
  #cap.is-in { animation: cap-in 520ms cubic-bezier(.2,.8,.2,1) both; }
  #brand { position: absolute; right: 30px; top: 50%; transform: translateY(-50%); font-size: 34px; font-weight: 900; color: #fff; }
  #brand i { font-style: normal; color: #34d399; }
  #tag { position: absolute; left: 26px; top: 50%; transform: translateY(-50%); padding: 7px 16px; border-radius: 999px;
    background: rgba(255, 255, 255, 0.1); color: #cbd5e1; font-size: 17px; font-weight: 700; }
  #app { position: absolute; top: ${SITE.y}px; left: ${SITE.x}px; width: ${SITE.width}px; height: ${SITE.height}px; border: 0; background: #fff; z-index: 2; }
  body.slide #app { z-index: 0; visibility: hidden; }
  body.slide.stage #app { z-index: 6; visibility: visible; border-radius: 28px; box-shadow: 0 30px 80px rgba(15, 23, 42, 0.18); }
  #slide { position: absolute; inset: 0; z-index: 5; display: none; overflow: hidden; color: #0f172a; text-align: center;
    background: radial-gradient(circle at 50% 0%, #e0ecff 0%, #f8fafc 55%, #eef2ff 100%); }
  body.slide #slide { display: block; animation: fade-in 600ms ease both; }
  #slide.dark { color: #fff; background: radial-gradient(circle at 50% 35%, #1e3a8a 0%, #0f172a 72%); }
  #slide .kicker { display: inline-block; padding: 7px 20px; border-radius: 999px; background: rgba(37, 99, 235, 0.1); color: #1d4ed8; font-size: 24px; font-weight: 800; }
  #slide.dark .kicker { background: rgba(96, 165, 250, 0.18); color: #93c5fd; }
  #slide h1 { margin: 16px 0 0; font-size: 58px; font-weight: 900; line-height: 1.15; letter-spacing: -0.5px; }
  #slide h1 em { font-style: normal; color: #2563eb; }
  #slide.dark h1 em { color: #60a5fa; }
  #slide h2 { margin: 10px 0 0; font-size: 34px; font-weight: 800; color: #334155; }
  #slide.dark h2 { color: #cbd5e1; }
  #slide .top { position: absolute; top: 46px; left: 80px; right: 80px; }
  #slide .bottom { position: absolute; bottom: 44px; left: 80px; right: 80px; font-size: 32px; font-weight: 800; line-height: 1.35; color: #0f172a; }
  #slide .bottom b { color: #059669; }
  #slide .appear { animation: rise 700ms cubic-bezier(.2,.8,.2,1) both; }
  #stage-box { position: absolute; }
  #doc { position: absolute; top: ${BAND}px; left: 0; right: 0; bottom: 0; z-index: 4; display: none; background: #e2e8f0; }
  #doc.is-on { display: block; animation: fade-in 500ms ease both; }
  #doc .page { position: absolute; top: 22px; bottom: 22px; left: 50%; transform: translateX(-50%); aspect-ratio: var(--ratio, 0.707);
    background: #fff; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25); }
  #doc .page img { position: absolute; inset: 0; width: 100%; height: 100%; }
  #doc .page img.filled { clip-path: inset(0 0 100% 0); }
  #doc.is-filling .page img.filled { animation: wipe 3200ms cubic-bezier(.45,.05,.35,1) forwards; }
  #doc .note { position: absolute; top: 40px; right: 60px; width: 360px; text-align: right; color: #0f172a; font-size: 24px; font-weight: 800; line-height: 1.4; }
  #doc .note p { margin: 0 0 14px; padding: 14px 18px; border-radius: 18px; background: #fff; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12); }
  #doc .note p::before { content: '✓'; color: #059669; margin-left: 10px; font-weight: 900; }
  #promo-cursor { position: absolute; top: 0; left: 0; z-index: 20; pointer-events: none; width: 26px; height: 30px; display: none; transition: transform 700ms cubic-bezier(.35,.6,.25,1);
    filter: drop-shadow(0 3px 6px rgba(15, 23, 42, 0.35)); }
  #promo-cursor.is-on { display: block; }
  @keyframes cap-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
  @keyframes wipe { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }

  /* שקופית ההצטרפות: אנשים מצטרפים לכף של הלקוחות, והמאזניים מתאזנים */
  .join { position: absolute; left: 90px; top: 250px; width: 900px; height: 560px; }
  .join .beam { transform-origin: 450px 150px; animation: beam 7000ms cubic-bezier(.45,.05,.35,1) both; }
  .join .pan-left { animation: pan-left 7000ms cubic-bezier(.45,.05,.35,1) both; }
  .join .pan-right { animation: pan-right 7000ms cubic-bezier(.45,.05,.35,1) both; }
  .join .person { opacity: 0; animation: drop 650ms cubic-bezier(.2,.8,.2,1) both; }
  .join .count { font-size: 30px; font-weight: 900; fill: #059669; }
  @keyframes beam { 0% { transform: rotate(9deg); } 100% { transform: rotate(-3deg); } }
  @keyframes pan-left { 0% { transform: translateY(-63px); } 100% { transform: translateY(21px); } }
  @keyframes pan-right { 0% { transform: translateY(63px); } 100% { transform: translateY(-21px); } }
  @keyframes drop { from { opacity: 0; transform: translateY(-120px); } to { opacity: 1; transform: none; } }
  .perks { position: absolute; right: 90px; top: 280px; width: 640px; list-style: none; margin: 0; padding: 0; text-align: right; }
  .perks li { margin: 0 0 18px; padding: 18px 24px; border-radius: 22px; background: #fff; box-shadow: 0 12px 34px rgba(15, 23, 42, 0.1);
    font-size: 29px; font-weight: 800; line-height: 1.3; opacity: 0; animation: rise 700ms cubic-bezier(.2,.8,.2,1) both; }
  .perks li::before { content: '✓'; color: #059669; margin-left: 14px; font-weight: 900; }
  .perks li small { display: block; margin-top: 4px; font-size: 21px; font-weight: 700; color: #64748b; }

  #end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; }
  #end b { font-size: 112px; font-weight: 900; letter-spacing: -1px; }
  #end b i { font-style: normal; color: #34d399; }
  #end p { margin: 0; font-size: 40px; font-weight: 700; color: #cbd5e1; }
  #end em { margin-top: 20px; padding: 15px 36px; border-radius: 18px; background: #2563eb; font-size: 34px; font-style: normal; font-weight: 800; color: #fff; }
`;

const CURSOR_SVG =
  '<svg id="promo-cursor" viewBox="0 0 26 30" fill="none"><path d="M3 2l19 12.5-8.2 1.6 4.8 9.6-3.6 1.8-4.8-9.7L3 23.5z" fill="#0f172a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';

/** דף המסגרת. העיצוב והגופן של האתר נטענים ממנו, כדי שהכתוביות ייכתבו באותו גופן */
async function shellHtml() {
  const home = await (await fetch(BASE_URL + '/')).text();
  const links = [...home.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map((match) => match[0]).join('');
  const htmlClass = home.match(/<html[^>]*class="([^"]*)"/)?.[1] ?? '';
  return `<!doctype html><html lang="he" dir="rtl" class="${htmlClass}"><head><meta charset="utf-8">${links}<style>${SHELL_CSS}</style></head><body>
<div id="band"><div id="brand">משכל<i>נתא</i></div><div id="cap"><b></b><span></span></div><div id="tag">הדגמה · כל הנתונים לדוגמה</div></div>
<iframe id="app" name="app" src="about:blank"></iframe>
<div id="slide"></div>
<div id="doc"></div>
${CURSOR_SVG}
</body></html>`;
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
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
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
 *
 * `page` הוא המסגרת (כתוביות, סמן, שקופיות); `app` הוא האתר שבתוכה.
 */
class Segment {
  constructor(name, context, page) {
    Object.assign(this, { name, context, page });
    this.app = page.frame({ name: 'app' });
    this.ranges = []; // [from, to, rate]
    this.cues = []; // { t, text }
    this.marks = []; // מעברי מסך שיקבלו מעבר רך: { t, span }
  }

  static async open(browser, setup, name, { demoStep = null, path = null } = {}) {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
    await context.route('**/api/boi/mortgage-market', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: setup.market })
    );
    await context.route(`**${SHELL_PATH}`, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: setup.shell }));
    await context.addInitScript(`(${appStyle.toString()})(${JSON.stringify(APP_CSS)})`);
    const page = await context.newPage();
    await page.goto(BASE_URL + SHELL_PATH, { waitUntil: 'load', timeout: 60_000 });
    const segment = new Segment(name, context, page);
    if (demoStep) await segment.loadStage(demoStep.step, demoStep.route, { capture: false });
    else if (path) await segment.app.goto(BASE_URL + path, { waitUntil: 'load', timeout: 120_000 });
    return segment;
  }

  async begin() {
    await this.page.evaluate(() => {
      document.getElementById('promo-cursor').style.transform = 'translate(720px, 460px)';
    });
    this.capture = await startCapture(this.context, this.page, `${this.name}-`);
    this.t0 = now();
  }

  /** מעבר למסך של במת ההדגמה: הצעד נשמר ב-sessionStorage והמסך נטען מחדש. הטעינה עצמה לא מצולמת */
  async loadStage(step, route, { capture = true, ready = null } = {}) {
    const from = now();
    if (capture) await this.capture.stop();
    await this.page.evaluate(
      ({ key, step }) => sessionStorage.setItem(key, JSON.stringify({ flowId: 'promo', stepIndex: step, returnTo: '/', autoplay: false })),
      { key: DEMO_KEY, step }
    );
    await this.app.goto(BASE_URL + route, { waitUntil: 'load', timeout: 120_000 });
    await this.page.waitForTimeout(3500);
    await quietDashboard(this);
    if (ready) await ready();
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
    await this.app.goto(BASE_URL + path, { waitUntil: 'load', timeout: 120_000 });
    if (ready) await this.app.locator(ready).first().waitFor({ timeout: 30_000 });
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

  /** כתובית בפס שמעל האתר, ואחריה זמן קריאה */
  async caption(text, holdMs = 0, sub = '') {
    this.cues.push({ t: now(), text: sub ? `${text}. ${sub}` : text });
    await this.page.evaluate(
      ({ text, sub }) => {
        const cap = document.getElementById('cap');
        cap.querySelector('b').textContent = text;
        cap.querySelector('span').textContent = sub;
        cap.classList.remove('is-in');
        void cap.offsetWidth;
        cap.classList.add('is-in');
      },
      { text, sub }
    );
    if (holdMs) await this.hold(holdMs);
  }

  /** שורת ההסבר בלבד, כשהכותרת נשארת */
  async sub(sub, holdMs = 0) {
    const title = await this.page.evaluate(() => document.querySelector('#cap b').textContent);
    await this.caption(title, holdMs, sub);
  }

  /**
   * שקופית על כל המסך. stage: מלבן שבו מוצגת אנימציה מ-/video-stage (ה-iframe של
   * האתר עובר אליו); בלי stage השקופית כולה מהמסגרת.
   */
  async slide(html, { cue, dark = false, stage = null } = {}) {
    if (cue) this.cues.push({ t: now(), text: cue });
    this.soft(0.8);
    await this.page.evaluate(
      ({ html, dark, stage }) => {
        const slide = document.getElementById('slide');
        slide.className = dark ? 'dark' : '';
        slide.innerHTML = html;
        const app = document.getElementById('app');
        if (stage) Object.assign(app.style, { top: `${stage.y}px`, left: `${stage.x}px`, width: `${stage.width}px`, height: `${stage.height}px` });
        document.body.classList.add('slide');
        document.body.classList.toggle('stage', Boolean(stage));
      },
      { html, dark, stage }
    );
  }

  /** חזרה מהשקופית לאתר שמתחת לפס הכתוביות */
  async site() {
    this.soft(0.8);
    await this.page.evaluate((site) => {
      const app = document.getElementById('app');
      Object.assign(app.style, { top: `${site.y}px`, left: `${site.x}px`, width: `${site.width}px`, height: `${site.height}px` });
      document.body.classList.remove('slide', 'stage');
    }, SITE);
  }

  async endCard(holdMs) {
    await this.cursorOff();
    await this.slide(
      '<div id="end"><b>משכל<i>נתא</i></b><p>כל המשכנתא שלכם, בפלטפורמה אחת</p><em>הרשמה חינם · הכלים החינמיים ללא הגבלה</em></div>',
      { dark: true, cue: 'משכלנתא: כל המשכנתא שלכם, בפלטפורמה אחת. הרשמה חינם, הכלים החינמיים ללא הגבלה' }
    );
    await this.hold(holdMs);
  }

  async cursorOff() {
    await this.page.evaluate(() => document.getElementById('promo-cursor')?.classList.remove('is-on')).catch(() => undefined);
  }

  locator(target) {
    return typeof target === 'string' ? this.app.locator(target).first() : target;
  }

  async cursorTo(x, y, transition = true) {
    await this.page.evaluate(
      ({ x, y, transition }) => {
        const cursor = document.getElementById('promo-cursor');
        cursor.classList.add('is-on');
        cursor.style.transition = transition ? '' : 'none';
        cursor.style.transform = `translate(${x}px, ${y}px)`;
      },
      { x, y, transition }
    );
  }

  async point(target) {
    const locator = this.locator(target);
    await locator.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await this.page.waitForTimeout(150);
    // המיקום ביחס למסגרת כולה (Playwright מחשב את ההיסט של ה-iframe)
    const box = await locator.boundingBox();
    if (!box) return;
    await this.cursorTo(box.x + Math.min(box.width * 0.55, box.width - 10), box.y + box.height * 0.6);
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
    await this.cursorTo(x, y);
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
  async slide1(target, goal) {
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
      await this.cursorTo(x, y, false);
      await this.page.waitForTimeout(45);
    }
    await this.page.mouse.up();
    await this.page.evaluate(() => (document.getElementById('promo-cursor').style.transition = ''));
    this.ranges.push([a, now(), 1 / TYPING_SPEED]);
    await this.page.waitForTimeout(400);
  }

  /** חתימה בעכבר על משטח ציור */
  async sign(target) {
    const pad = this.locator(target);
    await pad.scrollIntoViewIfNeeded();
    const box = await pad.boundingBox();
    if (!box) return;
    const cx = box.x + box.width * 0.5;
    const cy = box.y + box.height * 0.55;
    const w = Math.min(box.width * 0.32, 220);
    const h = Math.min(box.height * 0.22, 34);
    // חתימה מסולסלת: גל עם לולאות
    const points = [];
    for (let i = 0; i <= 60; i += 1) {
      const u = i / 60;
      points.push([cx + w - 2 * w * u + Math.sin(u * Math.PI * 6) * 14, cy + Math.sin(u * Math.PI * 4) * h - u * 10]);
    }
    await this.cursorTo(points[0][0], points[0][1]);
    await this.page.waitForTimeout(760);
    const a = now();
    await this.page.mouse.move(points[0][0], points[0][1]);
    await this.page.mouse.down();
    for (const [x, y] of points.slice(1)) {
      await this.page.mouse.move(x, y, { steps: 2 });
      await this.cursorTo(x, y, false);
      await this.page.waitForTimeout(18);
    }
    await this.page.mouse.up();
    this.ranges.push([a, now(), 1 / TYPING_SPEED]);
    await this.page.evaluate(() => (document.getElementById('promo-cursor').style.transition = ''));
    await this.page.waitForTimeout(300);
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
    await this.app.evaluate((top) => window.scrollBy({ top, behavior: 'smooth' }), top);
    await this.page.waitForTimeout(1200);
  }

  async scrollTop() {
    await this.app.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
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
  const scroll = await s.app.evaluate(() => window.scrollY);
  await s.click(trigger);
  await s.wait(450);
  for (let i = 0; i < downs; i += 1) {
    await s.page.keyboard.press('ArrowDown');
    await s.wait(330);
  }
  await s.page.keyboard.press('Enter');
  await s.wait(350);
  await s.app.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), scroll);
  await s.wait(250);
}

/** סגירת חלון (Radix Dialog) בכפתור הסגירה שלו. לא Escape: בהדגמה הוא יוצא ממנה */
async function closeDialog(s) {
  const close = s.app.locator('[role="dialog"]').last().getByRole('button', { name: /^(Close|סגירה|סגור)$/ }).first();
  await s.click(close, { optional: true, soft: true });
  await s.cursorOff();
}

/** לחיצה על לשונית בתפריט האזור האישי */
async function dashTab(s, id) {
  await s.click(s.app.locator(`${sel(`dash-nav-${id}`)}:visible`).first(), { soft: true });
  await s.cursorOff();
  await s.scrollTop();
}

/** החלונית "תמונת מצב" שקופצת בכניסה לאזור האישי נסגרת לפני הצילום */
async function quietDashboard(s) {
  for (const label of ['סגירת תמונת המצב']) {
    const button = s.app.locator(`button[aria-label="${label}"]`).first();
    if (await button.isVisible().catch(() => false)) await button.click().catch(() => undefined);
  }
  await s.wait(500);
}

/** מלבן האנימציה בשקופיות, במרכז המסך */
const stageBox = (y, width, height) => ({
  x: Math.round(((DESIGN.width - width) / 2) * K),
  y: Math.round(y * K),
  width: Math.round(width * K),
  height: Math.round(height * K),
});

// ─────────────────────────── פתיחה: החזון ───────────────────────────

async function recordIntro(browser, setup) {
  const s = await Segment.open(browser, setup, 'intro', { path: '/video-stage?slide=balance' });
  const vision = stageBox(300, 1040, 520);
  await s.slide(
    `<div class="top"><span class="kicker">החזון של משכלנתא</span>
      <h1>לאזן בין <em>כוח הבנקים</em> לכוחו של <em>הלקוח</em></h1>
      <h2>לקראת שוק משכנתאות משוכלל והוגן</h2></div>
     <div class="bottom appear" style="animation-delay: 5200ms">לכן משכלנתא מספקת לכלל הציבור, <b>בחינם</b>, כלים לניתוח ולתכנון המשכנתא</div>`,
    { stage: vision }
  );
  // האנימציה מתחילה מההתחלה כשהצילום מתחיל
  await s.app.goto(BASE_URL + '/video-stage?slide=balance', { waitUntil: 'load' });
  await s.wait(300);
  await s.begin();
  s.cues.push({ t: now(), text: 'החזון של משכלנתא: לאזן בין כוח הבנקים לכוחו של הלקוח, לקראת שוק משכנתאות משוכלל והוגן. לכן משכלנתא מספקת לכלל הציבור, בחינם, כלים לניתוח ולתכנון המשכנתא' });
  await s.hold(10_800);

  // הסערה: כל נושאי המשכנתא, במקום אחד
  const from = now();
  await s.capture.stop();
  await s.slide(
    `<div class="top"><span class="kicker">משכלנתא מסדרת את הבלגן</span>
      <h1>כל המשכנתא <em>במקום אחד</em></h1>
      <h2>חוזה, שמאות, בנקים, ביטוחים ולוחות סילוקין</h2></div>`,
    { stage: stageBox(270, 1180, 660) }
  );
  await s.app.goto(BASE_URL + '/video-stage?slide=storm', { waitUntil: 'load' });
  await s.wait(200);
  await s.capture.start();
  s.ranges.push([from, now(), 0]);
  s.soft(0.3);
  s.cues.push({ t: now(), text: 'כל המשכנתא במקום אחד: חוזה, שמאות, בנקים, ביטוחים ולוחות סילוקין' });
  await s.hold(9_300);
  await s.finish();
  return s;
}

// ─────────────────────────── הכלים החינמיים, כאורח ───────────────────────────

async function recordFreeTools(browser, setup) {
  const s = await Segment.open(browser, setup, 'free', { path: '/' });
  const page = s.app;
  await s.wait(2500);
  await page.evaluate(() => document.querySelector('[data-demo-id="home-free-tools"]')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await s.wait(600);
  await s.begin();
  await s.caption('כלים חינמיים לכולם', 2600, 'פתוחים לכל הציבור, בלי הרשמה וללא הגבלה');

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
  await s.scrollTop();
  await s.caption('ומקבלים מחיר דירה, משכנתא והחזר חודשי', 2600, 'לפי כללי בנק ישראל');
  await s.caption('כל ערך אפשר לעדכן', 0, 'מזיזים, וכל השאר מתעדכן מיד');
  await s.slide1(sel('mp-payment-slider'), 8000);
  await s.cursorOff();
  await s.hold(1800);
  await s.caption('ונועלים ערך שלא רוצים שישתנה', 0, 'למשל את ההחזר החודשי');
  await s.click('button[title^="נעילת ההחזר החודשי"]');
  await s.hold(1100);
  await s.slide1(sel('mp-term-slider'), 240);
  await s.cursorOff();
  await s.caption('התקופה התקצרה, וההחזר נשאר נעול', 2600, 'סכום המשכנתא ומחיר הדירה התעדכנו בהתאם');

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
  await s.scrollBy(420);
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
    await s.wait(500);
    await s.type(page.getByLabel('שם ההלוואה').nth(i), name);
    await s.type(page.getByRole('textbox', { name: 'קרן', exact: true }).nth(i), principal);
    await s.type(page.getByRole('textbox', { name: 'ריבית שנתית', exact: true }).nth(i), apr);
    await s.type(page.getByRole('textbox', { name: 'תקופה', exact: true }).nth(i), months);
  }
  await s.cursorOff();
  await s.caption('תמונה מלאה של ההלוואות', 2200, 'איחוד הלוואות ואסטרטגיה לפירעון');
  await s.scrollBy(420);
  await s.hold(1800);

  // ─── מצטרפים ───
  const people = Array.from({ length: 14 }, (_, i) => {
    const x = 120 + (i % 7) * 34;
    const y = 300 - Math.floor(i / 7) * 40;
    const color = ['#2563eb', '#059669', '#7c3aed', '#f59e0b', '#0891b2'][i % 5];
    return `<g class="person" style="animation-delay:${600 + i * 380}ms"><circle cx="${x}" cy="${y - 22}" r="9" fill="${color}"/><path d="M${x - 13} ${y + 4} Q${x} ${y - 20} ${x + 13} ${y + 4} Z" fill="${color}"/></g>`;
  }).join('');
  await s.slide(
    `<div class="top"><span class="kicker">הרשמה חינם</span>
      <h1>מצטרפים למשכלנתא, ומוסיפים <em>כוח לצד הלקוחות</em></h1>
      <h2>כל מי שמצטרף מגדיל את הקהילה, וכולנו מגיעים לבנק חזקים יותר</h2></div>
     <svg class="join" viewBox="0 0 900 560">
       <path d="M450 150 L450 470" stroke="#475569" stroke-width="8" stroke-linecap="round"/>
       <rect x="360" y="466" width="180" height="18" rx="9" fill="#94a3b8"/>
       <circle cx="450" cy="142" r="13" fill="#2563eb"/>
       <g class="beam"><path d="M150 150 L750 150" stroke="#334155" stroke-width="9" stroke-linecap="round"/></g>
       <g class="pan-left">
         <path d="M150 150 L60 330 M150 150 L240 330" stroke="#64748b" stroke-width="2.5"/>
         <path d="M40 330 Q150 395 260 330 Z" fill="rgba(37,99,235,.18)" stroke="#2563eb" stroke-width="3"/>
         <g transform="translate(-12,22)">${people}</g>
         <text x="150" y="430" text-anchor="middle" font-size="30" font-weight="900" fill="#1d4ed8">הלקוחות</text>
       </g>
       <g class="pan-right">
         <path d="M750 150 L660 330 M750 150 L840 330" stroke="#64748b" stroke-width="2.5"/>
         <path d="M708 286 L750 262 L792 286 Z" fill="#475569"/>
         <rect x="714" y="288" width="9" height="34" fill="#64748b"/><rect x="734" y="288" width="9" height="34" fill="#64748b"/>
         <rect x="757" y="288" width="9" height="34" fill="#64748b"/><rect x="777" y="288" width="9" height="34" fill="#64748b"/>
         <path d="M640 330 Q750 395 860 330 Z" fill="rgba(100,116,139,.18)" stroke="#475569" stroke-width="3"/>
         <text x="750" y="430" text-anchor="middle" font-size="30" font-weight="900" fill="#334155">הבנקים</text>
       </g>
     </svg>
     <ul class="perks">
       <li style="animation-delay:900ms">כל מה שהזנתם נשמר בחשבון<small>חוזרים מתי שרוצים, מאותה נקודה</small></li>
       <li style="animation-delay:1900ms">עוד כלים חינמיים לרשומים<small>תכנון הון עצמי, תזרים ומחשבונים</small></li>
       <li style="animation-delay:2900ms">אזור אישי לניהול כל המשכנתא<small>משימות, מסמכים ותקשורת עם כל הגורמים</small></li>
       <li style="animation-delay:3900ms">חמשת השלבים, עם יועץ בכל שלב<small>במנוי לפלטפורמה: מהפרופיל הפיננסי ועד החתימה</small></li>
     </ul>`,
    { cue: 'מצטרפים למשכלנתא ומוסיפים כוח לצד הלקוחות. לרשומים: הנתונים נשמרים, עוד כלים חינמיים, אזור אישי לניהול המשכנתא, וחמשת השלבים עם יועץ בכל שלב (במנוי)' }
  );
  await s.cursorOff();
  await s.hold(8_400);

  await s.finish();
  return s;
}

// ─────────────────────────── האזור האישי ───────────────────────────

const DASH_TITLE = 'ניהול כל תהליך המשכנתא במקום אחד';

async function recordDashboard(browser, setup) {
  const s = await Segment.open(browser, setup, 'dash', { demoStep: { step: STAGE.dashboard, route: '/demo/dashboard' } });
  const page = s.app;
  await s.begin();

  await s.caption(DASH_TITLE, 2800, 'האזור האישי: התהליכים, המשימות והפגישות במבט אחד');
  const fab = page.getByRole('button', { name: /^פעולות/ }).first();
  const fabBox = await fab.boundingBox().catch(() => null);
  if (fabBox) {
    await s.click(fab, { optional: true, soft: true });
    await s.cursorOff();
    await s.sub('כפתור הפעולות הצף: פעולות מהירות מכל מסך', 2600);
    await s.clickAt(fabBox); // אותו כפתור סוגר את התפריט
    await s.cursorOff();
  }

  await dashTab(s, 'agenda');
  await s.sub('לוח שנה ומשימות: פגישות, מועדים ומה עוד פתוח', 2400);
  await s.scrollBy(700);
  await s.hold(1300);

  await dashTab(s, 'meetings');
  await s.sub('פגישות עם היועץ ועם הבנקים', 2000);

  await dashTab(s, 'expenses');
  await s.sub('תכנון ההוצאות של העסקה, עד קבלת המפתח', 2000);

  // ─── מצב הון ותזרים, והמחשבון המהיר ───
  await dashTab(s, 'cash-flow');
  await s.sub('מצב הון ותזרים: הכנסות, משכנתא והלוואות, וכמה נשאר בכל חודש', 2400);
  const calculatorTitle = page.getByText('מחשבון הלוואה מהיר', { exact: true }).first();
  await s.scrollTo(calculatorTitle, 'center');
  const calculator = calculatorTitle.locator('xpath=ancestor::*[.//input][1]');
  await s.sub('מחשבון הלוואה מהיר: סכום, תקופה וריבית, וההחזר מחושב מיד', 800);
  await s.type(calculator.locator('input').nth(0), '50000');
  await s.type(calculator.locator('input').nth(1), '24');
  await s.type(calculator.locator('input').nth(2), '6');
  await s.cursorOff();
  await s.hold(1500);
  await s.sub('נועלים את ההחזר ומשנים את התקופה: כמה אפשר ללוות באותו החזר');
  await s.click(page.getByRole('button', { name: 'נעילת החזר חודשי' }).first(), { optional: true });
  await s.click(page.getByRole('button', { name: 'שחרור סכום ההלוואה' }).first(), { optional: true });
  await s.type(calculator.locator('input').nth(1), '36');
  await s.cursorOff();
  await s.hold(2000);

  await dashTab(s, 'contacts');
  await s.sub('אנשי הקשר בעסקה: עורך דין, שמאי, מתווך ועוד', 2000);

  // ─── הכלים ───
  await dashTab(s, 'tools');
  await s.sub('כלים ומחשבונים: כל הכלים החינמיים, מתוך האזור האישי', 2400);
  await s.point(sel('dash-tool-equity'));
  await s.sub('למשל תכנון הון עצמי', 1200);
  await s.cursorOff();

  await s.finish();
  return s;
}

// ─────────────────────────── תכנון הון עצמי ───────────────────────────

async function recordEquity(browser, setup) {
  const s = await Segment.open(browser, setup, 'equity', { demoStep: { step: STAGE.equity, route: '/equity-planning' } });
  const page = s.app;
  await page.locator(sel('eq-price')).first().waitFor({ timeout: 30_000 });
  await s.begin();

  await s.caption('תכנון הון עצמי: כל הוצאה עד קבלת המפתח', 1600, 'חינם לרשומים, ללא הגבלה');
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
    ['לוגיסטיקה', [['4800', '2026-11-23'], ['6000', '2026-11-26'], ['5200', '2026-11-30']]],
  ];
  let rowsTyped = 0;
  for (const [category, rows] of plan) {
    const header = page.locator('button', { hasText: category }).first();
    await s.click(header);
    await s.wait(450);
    const panel = header.locator('xpath=following-sibling::div[1]');
    const amounts = panel.locator('label', { hasText: 'סכום' }).locator('input');
    for (const [amount, when] of rows) {
      const index = await amounts.evaluateAll((els) => els.findIndex((el) => el.value === ''));
      if (index < 0) break;
      const row = amounts.nth(index).locator('xpath=ancestor::div[.//input[@type="date"]][1]');
      await s.type(amounts.nth(index), amount);
      await s.date(row.locator('input[type="date"]').first(), when);
      rowsTyped += 1;
      if (rowsTyped === 1) await s.sub('מזינים סכום ומועד לכל הוצאה: עורך דין, מסים, שמאות, שיפוץ ועוד');
    }
    await s.click(header); // סוגרים, כדי שהטבלה תישאר קומפקטית
    await s.wait(300);
  }
  console.log(`[equity] הוזנו ${rowsTyped} שורות בטבלת ההוצאות`);
  await s.cursorOff();
  await s.scrollTo(page.getByText('לוח התשלומים').first(), 'start');
  await s.sub('כל תשלום נכנס ללוח השנה, וההון מתחלק לפי קטגוריות');
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
  await s.scrollTo(page.getByText('חלוקת ההון').first(), 'start');
  await s.hold(1800);

  // ─── הדוח הסופי ───
  await s.click(sel('eq-continue-summary'), { soft: true });
  await s.cursorOff();
  await s.scrollTop();
  await s.caption('הדוח הסופי: כמה כסף צריך, ומתי', 2600, 'תזרים חודשי עד קבלת המפתח');
  await s.scrollBy(650);
  await s.hold(1700);
  await s.scrollBy(650);
  await s.hold(1400);
  await s.scrollTo(sel('eq-export-pdf'), 'center');
  await s.point(sel('eq-export-pdf'));
  await s.sub('ומפיקים אותו כ-PDF או כקובץ אקסל, לשמירה ולשיתוף', 1600);
  await s.cursorOff();
  await s.hold(300);

  await s.finish();
  return s;
}

// ─────────────────────────── מסמכים ותקשורת ───────────────────────────

async function recordDocs(browser, setup) {
  const s = await Segment.open(browser, setup, 'docs', { demoStep: { step: STAGE.dashboard, route: '/demo/dashboard#documents' } });
  const page = s.app;
  await s.begin();

  await s.caption('ניהול כל המסמכים במקום אחד', 2600, 'תיק המסמכים: כל האישורים וההגשות לבנקים, לפי שלבים');
  await s.scrollBy(600);
  await s.hold(1600);
  await s.scrollBy(600);
  await s.hold(1300);
  await s.scrollTop();

  await s.click(page.getByText('צ׳אט עם נציג').first(), { soft: true });
  await s.cursorOff();
  await s.caption('תקשורת עם כל הגורמים בעסקה', 2600, 'עו״ד, שמאי, יועץ, בנקאי וכל מי שתצטרכו. הכול מהאזור האישי שלכם במשכלנתא');
  await s.click(page.getByRole('button', { name: /מיילים/ }).first(), { optional: true, soft: true });
  await s.cursorOff();
  await s.hold(2600);
  await s.click(page.getByText('טיוטת חוזה המכר').first(), { optional: true, soft: true });
  await s.cursorOff();
  await s.hold(2400);

  await s.finish();
  return s;
}

// ─────────────────────────── שיחות וידאו ───────────────────────────

async function recordCall(browser, setup) {
  const s = await Segment.open(browser, setup, 'call', { demoStep: { step: STAGE.meeting, route: '/demo/meeting' } });
  const page = s.app;
  await page.getByRole('button', { name: 'שיתוף מסך' }).first().waitFor({ timeout: 20_000 });
  await s.begin();

  await s.caption('שיחות וידאו עם היועץ', 2400, 'ישירות מהאזור האישי, בלי להתקין שום דבר');
  await s.click(page.locator('footer').getByRole('button', { name: 'שיתוף מסך' }), { soft: true });
  await s.cursorOff();
  await s.sub('משתפים מסך ועוברים יחד על התמהילים', 2600);

  await s.click(page.locator('footer').getByRole('button', { name: 'תיק המסמכים' }), { soft: true });
  await s.cursorOff();
  await s.sub('תיק המסמכים פתוח בתוך השיחה', 1600);
  const form = join(WORK, 'form-filled.png');
  await s.click(page.getByRole('button', { name: 'הצגה בשיחה' }).first(), { soft: true });
  if (existsSync(form)) {
    // המסמך המוצג: כתב ההסמכה שנוצר קודם בסרטון
    await page.evaluate((src) => {
      const body = document.querySelector('[data-demo-id="call-present-body"]');
      if (body) body.innerHTML = `<img src="${src}" style="height:100%;max-width:100%;object-fit:contain;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.2)">`;
    }, `data:image/png;base64,${readFileSync(form).toString('base64')}`);
  }
  await s.cursorOff();
  await s.sub('מציגים מסמך לשני הצדדים, ועוברים עליו יחד', 2600);

  await s.click(page.getByRole('button', { name: 'שליחה בצ׳אט' }).nth(1), { optional: true });
  await s.click(page.locator('aside').getByRole('button', { name: 'צ׳אט', exact: true }), { soft: true });
  await s.cursorOff();
  await s.sub('ושולחים מסמכים בצ׳אט של השיחה', 2400);

  await s.finish();
  return s;
}

// ─────────────────────────── כתב הסמכה ליועץ ───────────────────────────

async function recordForms(browser, setup) {
  const s = await Segment.open(browser, setup, 'forms', { demoStep: { step: STAGE.authorization, route: '/demo/authorization-letters' } });
  const page = s.app;
  await page.getByText('הפרטים שלכם').first().waitFor({ timeout: 20_000 });
  await s.begin();

  await s.caption('כל הטפסים ממולאים אוטומטית', 2400, 'למשל כתב הסמכה ליועץ: ממלאים פעם אחת וחותמים על המסך');
  const field = (label, i) => page.locator('label', { hasText: label }).nth(i).locator('input');
  await s.type(field('מספר ת"ז', 0), '034567891');
  await s.type(field('טלפון נייד', 0), '0521234567');
  await s.type(field('מספר ת"ז', 1), '029876543');
  await s.type(field('טלפון נייד', 1), '0547654321');
  await s.type(page.locator('label', { hasText: 'היישוב שבו אתם חותמים' }).locator('input'), 'תל אביב');
  await s.cursorOff();
  await s.scrollTo(page.getByText('היועץ שאתם מסמיכים').first(), 'center');
  await s.sub('פרטי היועץ נכנסים לטופס לבד', 1600);

  const pads = page.locator('canvas');
  await s.scrollTo(pads.first(), 'center');
  await s.sub('חותמים על המסך, פעם אחת לכל הטפסים');
  await s.sign(pads.nth(0));
  await s.sign(pads.nth(1));
  await s.cursorOff();
  await s.hold(700);

  // הטופס של לאומי: התצוגה המקדימה נלכדת כאן במקום לשונית חדשה
  await page.evaluate(() => {
    window.open = () => ({
      close() {},
      location: {
        set href(url) {
          window.__promoPdf = url;
        },
      },
    });
  });
  const leumi = page.locator('div.rounded-2xl', { hasText: 'בנק לאומי לישראל' }).first();
  await s.scrollTo(leumi, 'center');
  await s.sub('והטופס המקורי של כל בנק נוצר מלא וחתום');
  await s.click(leumi.getByRole('button', { name: 'הפקת כתב חתום' }), { soft: true });
  await page.getByText('כתב חתום נשמר').first().waitFor({ timeout: 20_000 }).catch(() => undefined);
  await s.cursorOff();
  await s.hold(1200);
  await s.point(leumi.getByRole('button', { name: /תצוגה מקדימה/ }));
  await leumi.getByRole('button', { name: /תצוגה מקדימה/ }).click();
  await page.waitForFunction(() => Boolean(window.__promoPdf), null, { timeout: 20_000 });
  const pdf = await page.evaluate(async () => {
    const buffer = await (await fetch(window.__promoPdf)).arrayBuffer();
    let binary = '';
    new Uint8Array(buffer).forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary);
  });
  await s.cursorOff();

  // הטופס עצמו: עמוד ריק של הבנק, ועליו מתמלאים הפרטים והחתימה
  const filled = join(WORK, 'leumi-filled.pdf');
  writeFileSync(filled, Buffer.from(pdf, 'base64'));
  const blank = join(root, 'public', await page.evaluate(() => {
    const link = [...document.querySelectorAll('a[download]')].find((a) => a.getAttribute('href')?.includes('leumi'));
    return decodeURIComponent(link?.getAttribute('href') ?? '');
  }));
  const pageNo = 1; // עמוד החתימה
  // pymupdf כותב לפעמים אזהרות לפלט; ה-JSON הוא השורה האחרונה
  const images = JSON.parse(
    execFileSync(PYTHON, [join(here, 'pdf-page.py'), blank, filled, String(pageNo), WORK], { encoding: 'utf8' }).trim().split('\n').pop()
  );
  const toData = (file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  await s.page.evaluate(
    ({ blank, filled, ratio }) => {
      const doc = document.getElementById('doc');
      doc.style.setProperty('--ratio', String(ratio));
      doc.innerHTML = `<div class="page"><img src="${blank}"><img class="filled" src="${filled}"></div>
        <div class="note"><p>השמות ומספרי הזהות</p><p>פרטי היועץ והחברה</p><p>היישוב והתאריך</p><p>החתימות של שניכם</p></div>`;
    },
    { blank: toData(images.blank), filled: toData(images.filled), ratio: images.ratio }
  );
  await s.wait(400);
  s.soft(0.8);
  await s.page.evaluate(() => document.getElementById('doc').classList.add('is-on'));
  await s.sub('הכתב של לאומי, מלא וחתום', 900);
  await s.page.evaluate(() => document.getElementById('doc').classList.add('is-filling'));
  await s.hold(4200);
  await s.caption('כל הטפסים ממולאים אוטומטית', 2200, 'והכתבים נשמרים בתיק ומגיעים ישר ליועץ');

  await s.finish();
  return s;
}

// ─────────────────────────── חמשת השלבים ───────────────────────────

async function recordPlan(browser, setup) {
  const s = await Segment.open(browser, setup, 'plan', { demoStep: { step: STAGE.plan, route: '/demo/plan' } });
  const page = s.app;
  await s.begin();
  await s.caption('חמשת השלבים, מהפרופיל הפיננסי ועד החתימה', 2600, 'במנוי לפלטפורמה. והנתונים שכבר הזנתם נמצאים בפנים');

  const advisor = page.getByRole('button', { name: /^פנו ליועץ/ }).first();
  await s.point(advisor).catch(() => undefined);
  await s.sub('בכל שלב: "פנו ליועץ", ויועץ משכלנתא נכנס לתמונה', 2200);
  await s.cursorOff();

  /** מעבר לשלב: לחיצה בסרגל, ומסך ההסבר של השלב אם יש */
  const openStage = async (stage, title, sub) => {
    await s.scrollTop();
    await s.click(sel(`plan-stage-${stage}`), { soft: true });
    await s.cursorOff();
    await s.caption(title, 0, sub);
    await s.scrollTo(sel('plan-stage-title'), 'start').catch(() => undefined);
    const intro = page.locator(sel('plan-stage-intro-start')).first();
    if (await intro.isVisible().catch(() => false)) {
      await s.hold(1800);
      await s.click(intro, { optional: true, soft: true });
      await s.cursorOff();
      await s.scrollTo(sel('plan-stage-title'), 'start').catch(() => undefined);
    }
  };
  /** לשונית בתוך השלב ("2 הנכס והעסקה") */
  const subTab = async (name, text, holdMs = 1500) => {
    const tab = page.getByRole('button', { name: new RegExp(`^\\d+\\s*${name}$`) }).first();
    const clicked = await s.click(tab, { optional: true, soft: true });
    await s.cursorOff();
    if (clicked && text) await s.sub(text, holdMs);
    return clicked;
  };

  // ─── שלב 1: פרופיל פיננסי ───
  await openStage('ANALYSIS', 'שלב 1: פרופיל פיננסי', 'הנכס, הלווים, ההכנסות והמסמכים');
  await subTab('הנכס והעסקה', 'הנכס והעסקה', 1300);
  await subTab('מי לוקח', 'מי לוקח את המשכנתא', 1300);
  await subTab('הכנסות עתידיות', 'הכנסות עתידיות', 1200);
  await subTab('מסמכים', 'המסמכים של השלב, מסודרים לפי מה שהבנק מבקש', 1700);
  await subTab('דוח הפרופיל', 'דוח הפרופיל לבנק: יחס מימון, יחס החזר ועמידה בהוראות בנק ישראל', 2200);
  await s.scrollBy(700);
  await s.hold(1300);
  await s.scrollBy(700);
  await s.hold(1100);

  // ─── שלב 2: בניית תמהיל ───
  await openStage('MIX', 'שלב 2: בניית תמהיל', 'בונים, משווים, ומפיקים הצעה לבנקים');
  await s.hold(1400);
  await s.click(page.getByRole('button', { name: /^תמהיל נוסף לנכס הזה/ }).first(), { soft: true });
  await s.cursorOff();
  await s.sub('בונים תמהיל מסלול אחרי מסלול: סוג ריבית ואחוז מהמשכנתא');
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
  await s.hold(1200);
  await s.click(page.getByRole('button', { name: /^שמור תמהיל/ }).first(), { soft: true });
  await s.cursorOff();
  await s.sub('התמהיל נשמר. אפשר לבנות כמה תמהילים לאותו נכס', 1300);
  await s.click(sel('ws-tab-charts'), { optional: true, soft: true });
  await s.cursorOff();
  await s.scrollTo(sel('ws-tab-charts'), 'start').catch(() => undefined);
  await s.sub('גרפים: יתרת חוב, החזר חודשי, וקרן מול ריבית לאורך השנים', 2600);

  // השוואה בין תמהילים
  await s.click(sel('ws-tab-comparison'), { soft: true });
  await s.cursorOff();
  const toggles = page.getByRole('button', { name: 'סימון להשוואה באזור העבודה' });
  const count = await toggles.count();
  for (let i = 0; i < Math.min(count, 3); i += 1) {
    if ((await toggles.nth(i).getAttribute('aria-pressed')) === 'true') continue;
    await s.click(toggles.nth(i), { optional: true });
    if (i === 0) await s.wait(700);
    if (!(await toggles.nth(i + 1).isVisible().catch(() => false))) {
      const more = page.getByRole('button', { name: /הוסף תמהיל להשוואה/ }).first();
      if (await more.isVisible().catch(() => false)) await s.click(more, { optional: true });
    }
  }
  await s.cursorOff();
  await s.scrollTo(sel('ws-tab-comparison'), 'start').catch(() => undefined);
  await s.sub('השוואה בין התמהילים: החזר, ריבית כוללת ועלות לאורך כל התקופה', 2800);
  await s.scrollBy(500);
  await s.hold(1600);

  await s.click(page.getByRole('button', { name: /^לוח החזרים$/ }).first(), { soft: true });
  await s.cursorOff();
  await s.sub('לוח סילוקין מלא, חודש אחרי חודש: קרן, ריבית ויתרה', 1800);
  await s.scrollInside(page.locator('[role="dialog"] tbody tr, [role="dialog"] [role="row"]').nth(4), 520);
  await s.hold(1300);
  await closeDialog(s);

  await s.click(page.getByRole('button', { name: /^פרעון מוקדם$/ }).first(), { soft: true });
  await s.cursorOff();
  await s.sub('פרעון מוקדם: קיצור תקופה או הקטנת ההחזר, וכמה חוסכים', 2000);
  await s.click(page.getByRole('button', { name: /^הקטנת ההחזר החודשי/ }).first(), { optional: true });
  await s.cursorOff();
  await s.hold(1600);
  await closeDialog(s);

  await s.click(page.getByRole('button', { name: /^הצעה לבנקים/ }).first(), { soft: true });
  await s.cursorOff();
  await s.sub('ההצעה לבנקים: מכתב מסודר עם התמהיל ולוח הסילוקין, כ-PDF או כאקסל', 1800);
  await s.click(page.locator('[role="dialog"]').last().getByRole('button', { name: 'לאומי', exact: true }), { optional: true });
  await s.cursorOff();
  const letter = page.locator('[role="dialog"]').last().getByText('בקשה לקבלת הצעת ריביות').first();
  await s.scrollInside(letter, 520);
  await s.hold(1400);
  await closeDialog(s);

  // ─── שלב 3: אישור עקרוני ───
  await openStage('APPLICATIONS', 'שלב 3: אישור עקרוני', 'מגישים לכמה בנקים, וכל אישור נשמר בתיק');
  await s.hold(2000);
  await s.scrollBy(600);
  await s.hold(1400);

  // ─── שלב 4: מכרז ריביות ───
  await openStage('AUCTION', 'שלב 4: מכרז ריביות', 'מזינים את הריביות מכל בנק ומשווים בין ההצעות');
  await s.hold(2000);
  await s.scrollBy(650);
  await s.hold(1500);
  await s.scrollBy(650);
  await s.hold(1300);

  // ─── שלב 5: חתימה ───
  await openStage('SIGNING', 'שלב 5: חתימה בבנק', 'פתיחת תיק, בטחונות, טופס טיולים והמסמכים לסניף');
  await subTab('אישור לבנק לפתיחת תיק', 'אישור לבנק לפתיחת תיק', 1500);
  await subTab('בטחונות וטופס טיולים', 'בטחונות וטופס טיולים', 1500);
  await s.scrollBy(500);
  await s.hold(1200);
  const signed = page.getByRole('button', { name: /חתמתי על המשכנתא בבנק/ }).first();
  if (await signed.isVisible().catch(() => false)) {
    await s.scrollTo(signed, 'center');
    await s.click(signed, { optional: true, soft: true });
    await s.cursorOff();
    await s.hold(1200);
  }

  // ─── יש לכם משכנתא ───
  const from = now();
  await s.capture.stop();
  await s.slide(
    `<div class="top"><span class="kicker">סיימתם את חמשת השלבים</span>
      <h1>יש לכם משכנתא <em>מותאמת אישית</em>, והכי משתלמת עבורכם</h1></div>`,
    { stage: stageBox(240, 1180, 690) }
  );
  // יוצאים מבמת ההדגמה, אחרת היא מחזירה את האתר למסך השלבים
  await s.page.evaluate((key) => sessionStorage.removeItem(key), DEMO_KEY);
  await s.app.goto(BASE_URL + '/video-stage?slide=threads', { waitUntil: 'load' });
  await s.app.waitForURL(/video-stage/, { timeout: 10_000 }).catch(() => undefined);
  await s.wait(800);
  await s.wait(200);
  await s.capture.start();
  s.ranges.push([from, now(), 0]);
  s.soft(0.6);
  s.cues.push({ t: now(), text: 'יש לכם משכנתא מותאמת אישית, והכי משתלמת עבורכם' });
  await s.hold(9_300);

  await s.finish();
  return s;
}

// ─────────────────────────── המשכנתא שלי ───────────────────────────

async function recordMine(browser, setup) {
  const s = await Segment.open(browser, setup, 'mine', {
    demoStep: { step: STAGE.dashboard, route: '/demo/dashboard' },
  });
  const page = s.app;
  // המשכנתא נחתמה: התהליך מסומן כמושלם, והאזור האישי טוען אותו מחדש לבד
  await page.evaluate((id) => fetch(`/api/plans/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signed: true }) }), DEMO_PLAN_ID);
  await page.locator(`${sel('dash-nav-my-mortgage')}:visible`).first().waitFor({ timeout: 20_000 });
  await s.begin();

  await s.caption('משכלנתא נשארת אתכם גם אחרי לקיחת המשכנתא', 0, 'לאורך כל חיי המשכנתא');
  await dashTab(s, 'my-mortgage');
  await s.hold(2400);
  // בפעם הראשונה הלוח שואל מתי ירד התשלום הראשון
  const firstPayment = page.locator('input[type="date"]:visible').first();
  if (await firstPayment.isVisible().catch(() => false)) {
    await s.sub('מזינים את מועד התשלום הראשון, ולוח המעקב נבנה', 600);
    await s.date(firstPayment, '2026-12-01');
    await s.click(page.getByRole('button', { name: /לבניית לוח המעקב/ }).first(), { optional: true, soft: true });
    await s.cursorOff();
    await page.locator(sel('my-mortgage')).first().waitFor({ timeout: 10_000 }).catch(() => undefined);
  }
  await s.sub('כמה שולם, כמה נשאר, והתשלום הבא, חודש אחרי חודש', 2200);
  await s.click(page.getByRole('button', { name: /^הפעלה/ }).first(), { optional: true });
  await s.cursorOff();
  await s.sub('גלילת הזמן: המספרים והגרפים זזים קדימה, חודש אחרי חודש', 3200);
  await s.scrollBy(650);
  await s.hold(1800);
  await s.scrollBy(650);
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
    for (const path of ['/', '/video-stage', '/mortgage-planning?flow=affordability', '/equity-planning', '/mortgage-refinance', '/consumer-loans', '/demo/dashboard', '/demo/plan', '/demo/authorization-letters', '/demo/meeting']) {
      await page.goto(BASE_URL + path, { waitUntil: 'load', timeout: 180_000 }).catch(() => undefined);
    }
    await context.close();
  }
  const setup = { market, shell: await shellHtml() };

  // ONLY=free,plan — הקלטה חלקית בזמן כיוונון
  const only = process.env.ONLY ? process.env.ONLY.split(',').map((name) => name.trim()) : null;
  const parts = {
    intro: recordIntro,
    free: recordFreeTools,
    dash: recordDashboard,
    equity: recordEquity,
    docs: recordDocs,
    call: recordCall,
    forms: recordForms,
    plan: recordPlan,
    mine: recordMine,
  };
  // הטופס מוקלט לפני השיחה, כי בשיחה מוצג הטופס שנוצר בו
  const recordOrder = ['intro', 'free', 'dash', 'equity', 'docs', 'forms', 'call', 'plan', 'mine'];
  const recorded = {};
  for (const name of recordOrder) {
    if (!only || only.includes(name)) recorded[name] = await parts[name](browser, setup);
  }
  const segments = Object.keys(parts).filter((name) => recorded[name]).map((name) => recorded[name]);
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
    execFileSync(PYTHON, [join(here, 'soften.py'), join(WORK, 'entries.json'), join(WORK, 'entries-soft.json')], { stdio: 'inherit' });
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
    clock = frames.reduce((sum, entry) => sum + entry.duration, 0);
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

  // תמונת פתיחה (פוסטר) — משקופית החזון
  execFileSync(FFMPEG, ['-y', '-ss', '6.0', '-i', video, '-frames:v', '1', '-update', '1', '-vf', 'scale=1280:-2', '-q:v', '4', join(OUT_DIR, 'mashkalanta-promo-poster.jpg')], { stdio: 'inherit' });

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
