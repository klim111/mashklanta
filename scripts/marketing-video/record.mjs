/**
 * סרטון השיווק — שלב 1: צילום הסצנות מהממשק האמיתי.
 *
 * כל סצנה מוקלטת בנפרד (דפדפן אמיתי, נתוני הדגמה בלבד) כרצף פריימים עם
 * חותמות זמן. העריכה (compose.mjs) מתאימה אחר כך כל סצנה לאורך הקריינות שלה.
 *
 *   node scripts/marketing-video/record.mjs              # כל הסצנות
 *   node scripts/marketing-video/record.mjs s2 emails    # רק אלה
 *
 * משתני סביבה: BASE_URL, CHROMIUM, WORK_DIR (ברירת מחדל .marketing-work).
 * מסכי האזור האישי רצים בארגז החול של ההדגמה `marketing`; הכלים הציבוריים
 * רצים כמו שגולש רואה אותם. נתוני בנק ישראל מוגשים מ-market-snapshot.json
 * של סרטון דף הבית, כי האתר של בנק ישראל חסום מהסביבה.
 */

import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const WORK = resolve(process.env.WORK_DIR ?? join(root, '.marketing-work'));
const VIEWPORT = { width: 1280, height: 720 };
const SCALE = 1.5; // 1920x1080
const MARKET = readFileSync(join(root, 'scripts/promo-video/market-snapshot.json'), 'utf8');

/** מה שמוסתר בצילום: פקדי ההדגמה, לשונית הנגישות, תג הסיור */
const CSS = `
  .mk-demo-ui, .mk-demo-bar, .mk-demo-badge, .mk-demo-end, .mk-demo-tryit, .mk-demo-cursor,
  .driver-popover, [data-a11y-ui], nextjs-portal { display: none !important; }
  .driver-overlay { opacity: 0 !important; }
  .driver-active-element { outline: none !important; }
  html { scroll-behavior: auto !important; }
  ::-webkit-scrollbar { display: none; }
  #mv-cursor { position: fixed; top: 0; left: 0; width: 28px; height: 32px; z-index: 2147483647; pointer-events: none;
    transition: transform 520ms cubic-bezier(.3,.7,.2,1); filter: drop-shadow(0 4px 8px rgba(15,23,42,.35)); opacity: 0; }
  #mv-cursor.on { opacity: 1; }
  .mv-ripple { position: fixed; z-index: 2147483646; pointer-events: none; width: 44px; height: 44px; margin: -22px 0 0 -22px;
    border-radius: 999px; border: 3px solid rgba(37,99,235,.9); animation: mv-ripple 520ms ease-out forwards; }
  @keyframes mv-ripple { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
`;

function install(css) {
  const run = () => {
    if (document.getElementById('mv-cursor')) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const cursor = document.createElement('div');
    cursor.id = 'mv-cursor';
    cursor.innerHTML =
      '<svg viewBox="0 0 26 30" width="28" height="32" fill="none"><path d="M3 2l19 12.5-8.2 1.6 4.8 9.6-3.6 1.8-4.8-9.7L3 23.5z" fill="#0f172a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    document.body.appendChild(cursor);
    // תג הסיור בכותרת התהליך
    const hideTour = () =>
      document.querySelectorAll('span').forEach((el) => {
        if (el.textContent?.includes('סיור היכרות')) el.style.display = 'none';
      });
    new MutationObserver(hideTour).observe(document.body, { childList: true, subtree: true });
    hideTour();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}

/** צילום: screencast של CDP, כל פריים עם חותמת זמן */
async function startCapture(context, page, dir) {
  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
    const file = join(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: VIEWPORT.width * SCALE,
    maxHeight: VIEWPORT.height * SCALE,
    everyNthFrame: 1,
  });
  return {
    frames,
    stop: async () => {
      await cdp.send('Page.stopScreencast');
      await cdp.detach().catch(() => undefined);
    },
  };
}

/** כלי הבמאי לסצנה: סמן, לחיצה, הקלדה, גלילה רכה */
function director(page) {
  const wait = (ms) => page.waitForTimeout(ms);
  const loc = (target) => (typeof target === 'string' ? page.locator(`[data-demo-id="${target}"]`).first() : target);
  const moveTo = async (x, y) => {
    await page.evaluate(
      ({ x, y }) => {
        const cursor = document.getElementById('mv-cursor');
        cursor.classList.add('on');
        cursor.style.transform = `translate(${x}px, ${y}px)`;
      },
      { x, y }
    );
    await wait(560);
  };
  const pointAt = async (target) => {
    const el = loc(target);
    const box = await el.boundingBox();
    if (!box) return;
    if (box.y < 60 || box.y + box.height > VIEWPORT.height - 40) {
      await scrollTo(el, 'center');
    }
    const fresh = (await el.boundingBox()) ?? box;
    await moveTo(fresh.x + fresh.width * 0.5, fresh.y + fresh.height * 0.55);
  };
  const ripple = () =>
    page.evaluate(() => {
      const cursor = document.getElementById('mv-cursor');
      const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(cursor.style.transform);
      if (!m) return;
      const dot = document.createElement('div');
      dot.className = 'mv-ripple';
      dot.style.left = `${m[1]}px`;
      dot.style.top = `${m[2]}px`;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 600);
    });
  const click = async (target, after = 450) => {
    await pointAt(target);
    await ripple();
    await loc(target).click();
    await wait(after);
  };
  const type = async (target, text, delay = 55) => {
    await click(target, 150);
    await loc(target).fill('');
    await loc(target).pressSequentially(String(text), { delay });
    await wait(250);
  };
  /** גלילה רכה של החלון, כך שהאלמנט יגיע לראש המסך (או למרכזו) */
  const scrollTo = async (target, where = 'top', offset = 0, ms = 1100) => {
    const el = loc(target);
    await el.waitFor({ state: 'attached', timeout: 10_000 });
    const to = await el.evaluate(
      (node, { where, offset }) => {
        const rect = node.getBoundingClientRect();
        const base = window.scrollY + rect.top;
        const y = where === 'center' ? base - (window.innerHeight - rect.height) / 2 : base - 24;
        return Math.max(0, y + offset);
      },
      { where, offset }
    );
    await scrollBy(to - (await page.evaluate(() => window.scrollY)), ms);
  };
  const scrollBy = async (dy, ms = 1100) => {
    await page.evaluate(
      ({ dy, ms }) =>
        new Promise((done) => {
          const from = window.scrollY;
          const start = performance.now();
          const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
          const step = (now) => {
            const t = Math.min(1, (now - start) / ms);
            window.scrollTo(0, from + dy * ease(t));
            if (t < 1) requestAnimationFrame(step);
            else done();
          };
          requestAnimationFrame(step);
        }),
      { dy, ms }
    );
    await wait(120);
  };
  const hideCursor = () => page.evaluate(() => document.getElementById('mv-cursor')?.classList.remove('on'));
  return { page, wait, loc, moveTo, pointAt, click, type, scrollTo, scrollBy, hideCursor };
}

const byText = (page, text) => page.getByText(text, { exact: false }).first();
const button = (page, name) => page.getByRole('button', { name }).first();

/**
 * הסצנות. `demo` — מספר הצעד בהדגמה `marketing` (ארגז החול של האזור האישי),
 * או null לכלי ציבורי. `prepare` רץ לפני הצילום, `shoot` בזמן הצילום.
 */
const SCENES = {
  home: {
    url: '/',
    prepare: async (d) => d.wait(1200),
    shoot: async (d) => {
      await d.wait(2600);
      await d.scrollTo('home-free-tools', 'top', -40, 2600);
      await d.wait(1800);
    },
  },
  market: {
    url: '/',
    prepare: async (d) => {
      await d.scrollTo('home-market', 'top', -300, 10);
      await d.wait(1500);
    },
    shoot: async (d) => {
      await d.scrollTo('home-market', 'top', 0, 1800);
      await d.wait(1600);
      await d.scrollBy(420, 2200);
      await d.wait(1600);
    },
  },
  affordability: {
    url: '/mortgage-planning?flow=affordability',
    prepare: async (d) => d.wait(800),
    shoot: async (d) => {
      await d.wait(700);
      await d.click('mp-property-0', 250);
      await d.click('mp-borrower-individual', 250);
      await d.type('mp-own-capital', 700000);
      await d.type('mp-age', 34);
      await d.type('mp-income', 25000);
      await d.click('mp-loans-no', 250);
      await d.click('mp-submit', 900);
      await d.hideCursor();
      await d.scrollTo('mp-max-property', 'center', 0, 1200);
      await d.wait(1800);
      await d.pointAt('mp-term-slider');
      await d.wait(1600);
    },
  },
  equity: {
    url: '/equity-planning',
    prepare: async (d) => d.wait(800),
    shoot: async (d) => {
      await d.wait(500);
      await d.type('eq-price', 2100000);
      await d.click('eq-profile-first-home', 300);
      await d.click('eq-target-next', 300);
      await d.click('eq-target-day-15', 300);
      await d.click('eq-continue-expenses', 900);
      await d.hideCursor();
      await d.scrollTo('eq-expenses-table', 'top', -20, 1200);
      await d.wait(1600);
      await d.scrollTo('eq-timeline', 'top', -20, 1400);
      await d.wait(1600);
      await d.scrollTo('eq-pie-chart', 'top', -20, 1400);
      await d.wait(1400);
      await d.click('eq-continue-summary', 700);
      await d.hideCursor();
      await d.scrollTo('eq-cashflow', 'top', -20, 1200);
      await d.wait(1800);
    },
  },
  'refi-check': {
    url: '/mortgage-refinance',
    prepare: async (d) => {
      await byText(d.page, 'הקטנת ההחזר החודשי').waitFor();
      await d.wait(800);
    },
    shoot: async (d) => {
      const { page } = d;
      await d.wait(600);
      await d.click(byText(page, 'הקטנת ההחזר החודשי'), 500);
      await byText(page, 'המסלולים במשכנתא היום').waitFor();
      const selects = page.locator('select');
      await d.pointAt(selects.nth(0));
      await selects.nth(0).selectOption({ label: 'קבועה לא צמודה' });
      await d.type(page.getByPlaceholder('₪').nth(0), '620000', 40);
      await d.type(page.getByPlaceholder('4.5').nth(0), '5.9', 60);
      await d.click(button(page, 'הוספת מסלול'), 300);
      await d.type(page.getByPlaceholder('₪').nth(1), '380000', 40);
      await d.type(page.getByPlaceholder('4.5').nth(1), '6.4', 60);
      await d.click(button(page, /בדיקת אפשרויות המיחזור/), 900);
      await d.hideCursor();
      await d.wait(1600);
      await d.scrollBy(380, 1600);
      await d.wait(1800);
    },
  },
  dashboard: {
    demo: 0,
    url: '/demo/dashboard',
    prepare: async (d) => {
      await d.loc('dash-mortgages-card').waitFor();
      await d.wait(1200);
    },
    shoot: async (d) => {
      await d.wait(1600);
      await d.pointAt('dash-mortgages-card');
      await d.wait(900);
      await d.scrollBy(330, 2000);
      await d.wait(900);
      await d.pointAt('dash-calendar-card');
      await d.wait(1200);
      await d.scrollBy(-330, 1600);
      await d.wait(600);
    },
  },
  stages: {
    demo: 1,
    url: '/demo/plan',
    prepare: async (d) => {
      await d.loc('plan-stage-rail').waitFor();
      await d.wait(1200);
    },
    shoot: async (d) => {
      await d.wait(900);
      for (const stage of ['ANALYSIS', 'MIX', 'APPLICATIONS', 'AUCTION', 'SIGNING']) {
        await d.pointAt(`plan-stage-${stage}`);
        await d.wait(280);
      }
      await d.wait(900);
    },
  },
  s1: stageScene('ANALYSIS', async (d) => {
    await d.scrollBy(520, 1800);
    await d.wait(1500);
    await d.scrollBy(420, 1800);
    await d.wait(1500);
  }),
  s2: stageScene('MIX', async (d) => {
    await d.scrollTo('ws-active-mix', 'top', -80, 1800);
    await d.wait(1700);
    await d.scrollBy(420, 1800);
    await d.wait(1700);
  }),
  s3: stageScene('APPLICATIONS', async (d) => {
    await d.scrollBy(560, 1800);
    await d.wait(1500);
    await d.scrollBy(380, 1600);
    await d.wait(1500);
  }),
  letters: {
    demo: 3,
    url: '/demo/authorization-letters',
    prepare: async (d) => {
      await byText(d.page, 'כתבי הסמכה ליועץ').waitFor();
      await d.wait(1000);
    },
    shoot: async (d) => {
      const { page } = d;
      await d.wait(700);
      const inputs = page.locator('input');
      await d.type(page.getByLabel('מספר ת"ז').first(), '012345674', 45).catch(() => undefined);
      await d.type(page.getByLabel('טלפון נייד').first(), '0501234567', 40).catch(() => undefined);
      void inputs;
      await d.hideCursor();
      const pad = page.locator('canvas').first();
      await d.scrollTo(pad, 'center', 0, 1500);
      await drawSignature(d, pad);
      await d.wait(700);
      await d.hideCursor();
      await d.scrollTo(byText(page, 'הפקת הכתבים לבנקים'), 'top', -20, 1600);
      await d.wait(1200);
      await d.pointAt(button(page, 'הפקת כתב חתום'));
      await d.wait(1200);
    },
  },
  s4: stageScene('AUCTION', async (d) => {
    await d.scrollBy(560, 1800);
    await d.wait(1600);
    await d.scrollBy(460, 1800);
    await d.wait(1600);
  }),
  s5: stageScene('SIGNING', async (d) => {
    await d.scrollBy(560, 1800);
    await d.wait(1400);
    await d.scrollBy(360, 1600);
    await d.wait(1600);
  }),
  completed: {
    demo: 4,
    url: '/demo/completed',
    prepare: async (d) => d.wait(300),
    shoot: async (d) => {
      await d.wait(4200);
    },
  },
  'refi-process': {
    demo: 2,
    url: '/demo/plan?plan=demo-refi',
    prepare: async (d) => {
      await d.loc('plan-stage-rail').waitFor();
      await d.wait(1200);
    },
    shoot: async (d) => {
      await d.wait(1200);
      await d.pointAt('plan-stage-MIX');
      await d.wait(700);
      await d.hideCursor();
      await d.scrollBy(520, 1800);
      await d.wait(1600);
      await d.scrollBy(420, 1800);
      await d.wait(1600);
    },
  },
  vault: {
    demo: 0,
    url: '/demo/dashboard',
    prepare: async (d) => {
      await d.loc('vault-button').waitFor();
      await d.wait(1000);
    },
    shoot: async (d) => {
      await d.wait(700);
      await d.click('vault-button', 900);
      await d.hideCursor();
      await d.wait(1600);
      await d.pointAt(byText(d.page, 'העלאת מסמך'));
      await d.wait(1600);
    },
  },
  chat: {
    demo: 0,
    url: '/demo/dashboard',
    prepare: async (d) => {
      await d.loc('dash-chat').waitFor();
      await d.wait(1000);
    },
    shoot: async (d) => {
      const { page } = d;
      await d.wait(600);
      await d.click('dash-chat', 900);
      const input = page.getByPlaceholder('כתבו הודעה ליועץ…');
      await d.type(input, 'העליתי את התלושים. נקבע שיחה על התמהיל?', 38);
      await d.wait(300);
      await page.keyboard.press('Enter');
      await d.wait(1800);
    },
  },
  emails: {
    demo: 0,
    url: '/demo/dashboard',
    prepare: async (d) => {
      await d.loc('dash-chat').click();
      await d.wait(800);
      await d.loc('conv-tab-emails').click();
      await d.wait(1000);
    },
    shoot: async (d) => {
      const { page } = d;
      await d.wait(1200);
      await d.click(button(page, 'מייל חדש'), 700);
      const fields = page.locator('input[type="text"], input:not([type])');
      await d.type(fields.last(), 'בקשה לאישור עקרוני - דנה ואורי לוי', 32);
      await d.type(page.locator('textarea').last(), 'שלום מיכל, מצורפים שלושת התלושים האחרונים ודפי החשבון. נשמח לאישור עקרוני על התמהיל.', 22);
      await d.wait(500);
      await d.pointAt(button(page, /שליחת המייל/));
      await d.wait(1200);
    },
  },
  pricing: {
    url: '/',
    prepare: async (d) => {
      await d.scrollTo('home-pricing', 'top', -260, 10);
      await d.wait(1200);
    },
    shoot: async (d) => {
      await d.scrollTo('home-pricing', 'top', 0, 1800);
      await d.wait(2200);
      await d.scrollBy(300, 1600);
      await d.wait(1600);
    },
  },
};

/** סצנה של שלב בתהליך: פתיחת השלב, דילוג על דף הפתיחה, וגלילה לתוכן */
function stageScene(stage, body) {
  return {
    demo: 1,
    url: '/demo/plan',
    prepare: async (d) => {
      await d.loc('plan-stage-rail').waitFor();
      await d.loc(`plan-stage-${stage}`).click();
      await d.wait(900);
      const start = d.loc('plan-stage-intro-start');
      if (await start.isVisible().catch(() => false)) {
        await start.click();
        await d.wait(900);
      }
      await d.page.evaluate(() => window.scrollTo(0, 0));
      await d.wait(900);
    },
    shoot: async (d) => {
      await d.wait(700);
      await d.hideCursor();
      await body(d);
    },
  };
}

/** חתימה בעכבר על לוח החתימה */
async function drawSignature(d, pad) {
  const box = await pad.boundingBox();
  if (!box) return;
  const { page } = d;
  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.55;
  const w = Math.min(box.width * 0.5, 320);
  const path = [];
  for (let i = 0; i <= 90; i += 1) {
    const t = i / 90;
    const x = cx + w / 2 - t * w;
    const y = cy + Math.sin(t * Math.PI * 5) * 18 * (1 - t * 0.4) + Math.cos(t * Math.PI * 2) * 8;
    path.push([x, y]);
  }
  await d.moveTo(path[0][0], path[0][1]);
  await page.mouse.move(path[0][0], path[0][1]);
  await page.mouse.down();
  for (const [x, y] of path) {
    await page.mouse.move(x, y);
    await page.evaluate(({ x, y }) => {
      const cursor = document.getElementById('mv-cursor');
      cursor.style.transition = 'none';
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    }, { x, y });
    await page.waitForTimeout(14);
  }
  await page.mouse.up();
  await page.evaluate(() => {
    document.getElementById('mv-cursor').style.transition = '';
  });
}

async function recordScene(browser, id) {
  const scene = SCENES[id];
  const dir = join(WORK, 'scenes', id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  await context.route('**/api/boi/mortgage-market', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: MARKET })
  );
  await context.addInitScript(`(${install.toString()})(${JSON.stringify(CSS)})`);
  const page = await context.newPage();
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((step) => {
    if (step === null) window.sessionStorage.removeItem('mashkalanta:demo');
    else
      window.sessionStorage.setItem(
        'mashkalanta:demo',
        JSON.stringify({ flowId: 'marketing', stepIndex: step, returnTo: '/', autoplay: false })
      );
  }, scene.demo ?? null);
  await page.goto(BASE_URL + scene.url, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
  const d = director(page);
  await scene.prepare(d);
  await page.evaluate(() => document.getElementById('mv-cursor')?.style.setProperty('transform', 'translate(900px, 470px)'));

  const capture = await startCapture(context, page, dir);
  const started = Date.now() / 1000;
  await page.waitForTimeout(250);
  try {
    await scene.shoot(d);
  } catch (error) {
    console.error(`  ! ${id}: ${error.message.split('\n')[0]}`);
  }
  await page.waitForTimeout(300);
  const ended = Date.now() / 1000;
  await capture.stop();
  await context.close();

  const frames = capture.frames;
  if (!frames.length) throw new Error(`${id}: לא צולמו פריימים`);
  const t0 = frames[0].t;
  const manifest = {
    id,
    duration: Math.max(ended - started, frames[frames.length - 1].t - t0 + 0.05),
    frames: frames.map((frame) => ({ file: frame.file.split('/').pop(), t: +(frame.t - t0).toFixed(4) })),
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
  console.log(`  ✓ ${id.padEnd(14)} ${manifest.duration.toFixed(1)}s · ${frames.length} פריימים`);
}

async function main() {
  const wanted = process.argv.slice(2);
  const ids = wanted.length ? wanted : Object.keys(SCENES);
  for (const id of ids) if (!SCENES[id]) throw new Error(`אין סצנה בשם ${id}`);
  mkdirSync(join(WORK, 'scenes'), { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  });
  // חימום: טעינה ראשונה של כל מסך
  const warm = await browser.newPage();
  for (const path of ['/', '/mortgage-planning?flow=affordability', '/equity-planning', '/mortgage-refinance', '/demo']) {
    await warm.goto(BASE_URL + path, { waitUntil: 'networkidle', timeout: 120_000 }).catch(() => undefined);
  }
  await warm.close();
  for (const id of ids) await recordScene(browser, id);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
