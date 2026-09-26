/**
 * הקלטת סרטון התדמית של דף הבית ("מה זה משכלנתא?").
 *
 * הסרטון מוקלט מהממשק האמיתי: הסקריפט פותח דפדפן, מפעיל את ההדגמה `promo`
 * (src/demo/catalog/flows/promo.ts) — שמזינה נתונים לדוגמה לכל כלי ועוברת
 * על האזור האישי — ומצלם את המסך. במקום הסרגל התחתון של ההדגמה מוצגות
 * כתוביות גדולות בסגנון סרטון שיווקי, והקובץ נבנה ב-ffmpeg.
 *
 * הרצה (האתר רץ ב-http://localhost:3000, עדיף `next build && next start`):
 *   npm i --no-save playwright-core@1.56.1
 *   node scripts/promo-video/record.mjs
 *
 * משתני סביבה: BASE_URL, CHROMIUM (נתיב לדפדפן), FFMPEG (נתיב ל-ffmpeg),
 * OUT_DIR (ברירת מחדל public/promo), NARRATION (קובץ שמע לקריינות, אופציונלי).
 *
 * נתוני שוק המשכנתאות בדף הבית מוגשים מ-market-snapshot.json — תמונת מצב של
 * נתוני בנק ישראל כפי שהוצגו באתר, כדי שההקלטה לא תלויה ברשת.
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
/** פי כמה מואצות הפעולות (הקלדה, לחיצות, ניווט). זמן הקריאה של הכתוביות אינו מואץ */
const SPEED = Number(process.env.SPEED ?? 2.8);

/** השכבה שמעל הממשק בזמן ההקלטה: כתוביות, תג "נתונים לדוגמה" וכרטיס סיום */
const OVERLAY_CSS = `
  .mk-demo-bar, .mk-demo-badge, .mk-demo-end, .mk-demo-tryit,
  .driver-popover, [data-a11y-ui], nextjs-portal { display: none !important; }
  .driver-overlay { opacity: 0 !important; }
  .driver-active-element { outline: 3px solid rgba(37, 99, 235, 0.55) !important; outline-offset: 4px !important; border-radius: 14px; }
  html { scroll-behavior: smooth; }
  #promo-layer { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; direction: rtl; font-family: var(--font-assistant), Assistant, sans-serif; }
  #promo-caption { position: absolute; left: 50%; bottom: 34px; transform: translateX(-50%); max-width: 1080px; width: max-content;
    padding: 14px 30px 16px; border-radius: 22px; background: rgba(15, 23, 42, 0.9); color: #fff; text-align: center;
    font-size: 40px; line-height: 1.25; font-weight: 800; box-shadow: 0 18px 50px rgba(15, 23, 42, 0.35); }
  #promo-caption.is-in { animation: promo-in 380ms cubic-bezier(.2,.8,.2,1) both; }
  #promo-caption::before { content: ''; position: absolute; top: 0; right: 30px; left: 30px; height: 4px; border-radius: 0 0 4px 4px; background: #2563eb; }
  #promo-caption:empty { display: none; }
  #promo-tag { position: absolute; top: 80px; left: 14px; padding: 5px 12px; border-radius: 999px; background: rgba(15, 23, 42, 0.72);
    color: #e2e8f0; font-size: 15px; font-weight: 700; }
  #promo-end { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
    background: radial-gradient(circle at 50% 35%, #1e3a8a 0%, #0f172a 70%); color: #fff; text-align: center; }
  #promo-end.is-on { display: flex; animation: promo-fade 500ms ease both; }
  #promo-end b { font-size: 104px; font-weight: 900; letter-spacing: -1px; }
  #promo-end b span { color: #60a5fa; }
  #promo-end p { font-size: 40px; font-weight: 700; color: #cbd5e1; margin: 0; }
  #promo-end em { font-style: normal; margin-top: 18px; padding: 14px 34px; border-radius: 18px; background: #2563eb; font-size: 34px; font-weight: 800; }
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
      '<div id="promo-end"><b>משכל<span>נתא</span></b><p>כל המשכנתא שלכם, בפלטפורמה אחת</p><em>הכלים פתוחים לכולם, בחינם</em></div>';
    document.body.appendChild(layer);
    const box = layer.querySelector('#promo-caption');
    let last = '';
    // הכתובית של ההדגמה נכתבת בסרגל התחתון (המוסתר) — מעתיקים אותה לשכבה
    setInterval(() => {
      const spans = document.querySelectorAll('.mk-demo-bar__caption > span');
      const text = spans.length ? spans[spans.length - 1].textContent.trim() : '';
      if (!text || text === last || text.startsWith('טוענים')) return;
      last = text;
      box.textContent = text;
      box.classList.remove('is-in');
      void box.offsetWidth;
      box.classList.add('is-in');
      window.__promoLog = window.__promoLog || [];
    }, 50);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}

async function main() {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(join(WORK, 'frames'), { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
  });
  const market = readFileSync(join(here, 'market-snapshot.json'), 'utf8');
  await context.route('**/api/boi/mortgage-market', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: market })
  );
  await context.addInitScript(`(${overlayScript.toString()})(${JSON.stringify(OVERLAY_CSS)})`);

  const page = await context.newPage();
  // טעינה ראשונה מחממת את המסכים (בפיתוח: הידור), כדי שהסרטון לא יחכה להם
  for (const path of ['/', '/mortgage-planning?flow=affordability', '/equity-planning', '/mortgage-refinance', '/consumer-loans', '/demo']) {
    await page.goto(BASE_URL + path, { waitUntil: 'networkidle', timeout: 180_000 }).catch(() => undefined);
  }
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // צילום: screencast של CDP, כל פריים עם חותמת זמן
  const cdp = await context.newCDPSession(page);
  const frames = [];
  let recording = false;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
    if (!recording) return;
    const file = join(WORK, 'frames', `${String(frames.length).padStart(6, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
  });

  // מתחילים את ההדגמה מדף הבית, כמו הכפתור
  await page.evaluate(() => {
    window.sessionStorage.setItem(
      'mashkalanta:demo',
      JSON.stringify({ flowId: 'promo', stepIndex: 0, returnTo: '/', autoplay: false })
    );
  });
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
  // ההדגמה נטענת מושהית על הצעד הראשון; מתחילים לצלם ואז לוחצים "ניגון"
  await page.waitForSelector('.mk-demo-bar__counter', { state: 'attached', timeout: 60_000 });
  await page.waitForTimeout(2500);

  recording = true;
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    maxWidth: VIEWPORT.width * SCALE,
    maxHeight: VIEWPORT.height * SCALE,
    everyNthFrame: 1,
  });
  const started = Date.now();
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.mk-demo-bar .mk-demo-control.is-primary')?.click());

  // מעקב אחרי הצעדים — לכתוביות ה-VTT ולזיהוי הסוף
  const steps = [];
  let lastCaption = '';
  for (;;) {
    const info = await page
      .evaluate(() => {
        const counter = document.querySelector('.mk-demo-bar__counter')?.textContent ?? '';
        const caption = document.getElementById('promo-caption')?.textContent ?? '';
        const done = !!document.querySelector('.mk-demo-end');
        return { counter, caption, done };
      })
      .catch(() => ({ counter: '', caption: '', done: false }));
    const t = (Date.now() - started) / 1000;
    if (info.caption && info.caption !== lastCaption) {
      lastCaption = info.caption;
      steps.push({ t, caption: info.caption });
      console.log(t.toFixed(1).padStart(6), info.counter, info.caption);
    }
    if (info.done) break;
    if (t > 400) throw new Error('ההדגמה לא הסתיימה בזמן');
    await page.waitForTimeout(100);
  }

  // כרטיס הסיום
  await page.evaluate(() => {
    document.getElementById('promo-caption').textContent = '';
    document.getElementById('promo-tag').style.display = 'none';
    document.getElementById('promo-end').classList.add('is-on');
  });
  const endAt = (Date.now() - started) / 1000;
  await page.waitForTimeout(3500);
  await cdp.send('Page.stopScreencast');
  recording = false;
  const total = (Date.now() - started) / 1000;
  await browser.close();

  // ─── קצב: הפעולות (הקלדה, לחיצות, ניווט) מואצות, זמן הקריאה של כל כתובית נשמר ───
  // משך ההחזקה של כל צעד נקרא מקובץ התסריט, לפי הסדר
  const holds = [...readFileSync(join(root, 'src/demo/catalog/flows/promo.ts'), 'utf8').matchAll(/duration:\s*(\d+)/g)].map(
    (match) => Number(match[1]) / 1000
  );
  const t0 = frames[0].t;
  const offset = t0 - started / 1000; // שעון הקיר של הצעדים → ציר הזמן של הצילום
  const starts = steps.map((step) => step.t - offset);
  const endCard = endAt - offset;
  const last = total - offset;
  const holdRanges = [[0, starts[0] ?? 0], [endCard, last + 1]];
  starts.forEach((start, i) => {
    const next = starts[i + 1] ?? endCard;
    holdRanges.push([Math.max(start, next - (holds[i] ?? 0)), next]);
  });
  const inHold = (t) => holdRanges.some(([a, b]) => t >= a && t < b);
  // זמן בסרטון הסופי: שנייה של החזקה = שנייה, שנייה של פעולה = 1/SPEED. טבלה ברזולוציה של 10ms
  const RES = 0.01;
  const table = [0];
  for (let x = 0; x < last + 1; x += RES) table.push(table[table.length - 1] + RES * (inHold(x) ? 1 : 1 / SPEED));
  const remap = (t) => {
    const i = Math.min(table.length - 2, Math.max(0, Math.floor(t / RES)));
    return table[i] + (table[i + 1] - table[i]) * (t / RES - i);
  };
  const lines = [];
  let clock = 0;
  frames.forEach((frame, i) => {
    const a = frame.t - t0;
    const b = (frames[i + 1]?.t ?? t0 + last) - t0;
    const target = remap(b);
    const duration = Math.max(0.001, target - clock);
    clock += duration;
    lines.push(`file '${frame.file}'`, `duration ${duration.toFixed(4)}`);
    void a;
  });
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

  // עותק WebM (VP9) לדפדפנים בלי H.264
  execFileSync(FFMPEG, ['-y', '-i', video, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', ...(narration ? ['-c:a', 'libopus', '-b:a', '96k'] : ['-an']), join(OUT_DIR, 'mashkalanta-promo.webm')], { stdio: 'inherit' });

  // תמונת פתיחה (פוסטר) — מתוך דף הבית
  execFileSync(FFMPEG, ['-y', '-ss', '1.2', '-i', video, '-frames:v', '1', '-update', '1', '-vf', 'scale=1280:-2', '-q:v', '4', join(OUT_DIR, 'mashkalanta-promo-poster.jpg')], { stdio: 'inherit' });

  // כתוביות (לקוראי מסך ולנגישות), על ציר הזמן של הסרטון הסופי
  const vtt = ['WEBVTT', ''];
  const cues = starts.map((start, i) => ({ start: remap(start), end: remap(starts[i + 1] ?? endCard), text: steps[i].caption }));
  cues.push({ start: remap(endCard), end: clock, text: 'משכלנתא: כל המשכנתא שלכם, בפלטפורמה אחת' });
  const stamp = (s) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const h = String(Math.floor(ms / 3_600_000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0');
    const sec = String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0');
    return `${h}:${m}:${sec}.${String(ms % 1000).padStart(3, '0')}`;
  };
  cues.forEach((cue, i) => vtt.push(String(i + 1), `${stamp(cue.start)} --> ${stamp(cue.end)}`, cue.text, ''));
  writeFileSync(join(OUT_DIR, 'mashkalanta-promo.he.vtt'), vtt.join('\n'));
  writeFileSync(join(WORK, 'cues.json'), JSON.stringify({ total: clock, cues }, null, 1));
  console.log(`נוצר ${video} · ${clock.toFixed(1)} שניות · ${frames.length} פריימים`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
