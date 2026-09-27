/**
 * סרטון השיווק — שלב 2: עריכה.
 *
 * בונה את הסרטון מהסצנות שצולמו (record.mjs), מהתסריט (script.json), מהקריינות
 * (אם קיימת) ומהמוזיקה. כל פריים מצויר בדף HTML אחד כפונקציה של הזמן, כך
 * שהכותרות, המעברים והכתוביות מדויקים לפריים, והעברית מוצגת נכון.
 *
 *   node scripts/marketing-video/compose.mjs            # הסרטון המלא
 *   PREVIEW=1 node scripts/marketing-video/compose.mjs  # מהיר: 12 פריימים לשנייה, 960x540
 *   ONLY=s2,emails node ...                              # רק הקטעים האלה (לבדיקה)
 *
 * קריינות: .marketing-work/voice/<id>.wav לכל קטע (tts.mjs מפיק אותם). אין קובץ —
 * משך הקטע מוערך מאורך הטקסט, והסרטון יוצא בלי קול (אבל עם מוזיקה, אם יש).
 * מוזיקה: .marketing-work/music.wav (music.py).
 */

import { chromium } from 'playwright-core';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const WORK = resolve(process.env.WORK_DIR ?? join(root, '.marketing-work'));
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const PREVIEW = process.env.PREVIEW === '1';
const FPS = PREVIEW ? 12 : 30;
const OUT_W = PREVIEW ? 960 : 1920;
const OUT = resolve(process.env.OUT ?? join(WORK, PREVIEW ? 'preview.mp4' : 'mashkalanta-marketing.mp4'));
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;

/** זמנים (שניות) */
const LEAD = 0.35; // שקט לפני הקריינות בכל קטע
const TAIL = 0.55; // אחרי
const MIN = { title: 2.6, logo: 2.8, chapter: 2.6, scene: 3.2, outro: 5.5 };
const CHARS_PER_SEC = 13.5;

function audioDuration(file) {
  try {
    execFileSync(FFMPEG, ['-i', file], { stdio: 'pipe' });
  } catch (error) {
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(error.stderr));
    if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  }
  return null;
}

/** כתוביות: חלוקת הטקסט לצירופים קצרים, כל אחד לפי חלקו באורך */
function captionChunks(text, start, duration) {
  const parts = text
    .split(/(?<=[,.?:!])\s+/)
    .flatMap((part) => {
      if (part.length <= 46) return [part];
      const words = part.split(' ');
      const half = Math.ceil(words.length / 2);
      return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
    })
    .filter(Boolean);
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  let t = start;
  return parts.map((part) => {
    const d = (duration * part.length) / total;
    const chunk = { text: part.replace(/[,.]$/, ''), start: t, end: t + d };
    t += d;
    return chunk;
  });
}

function buildTimeline(script) {
  let t = 0;
  const segments = [];
  for (const seg of script.segments) {
    if (ONLY && !ONLY.includes(seg.id)) continue;
    const voiceFile = join(WORK, 'voice', `${seg.id}.wav`);
    const voice = existsSync(voiceFile) ? audioDuration(voiceFile) : null;
    const spoken = voice ?? seg.voice.replace(/\s+/g, ' ').length / CHARS_PER_SEC;
    const duration = Math.max(MIN[seg.kind] ?? 3, LEAD + spoken + TAIL) + (seg.kind === 'outro' ? 2.2 : 0);
    let clip = null;
    if (seg.kind === 'scene') {
      const manifest = JSON.parse(readFileSync(join(WORK, 'scenes', seg.scene, 'manifest.json'), 'utf8'));
      clip = { scene: seg.scene, duration: manifest.duration, frames: manifest.frames };
    }
    segments.push({
      ...seg,
      start: t,
      duration,
      voiceFile: voice ? voiceFile : null,
      voiceStart: t + LEAD,
      voiceDuration: spoken,
      captions: captionChunks(seg.voice, t + LEAD, spoken),
      clip,
    });
    t += duration;
  }
  return { segments, total: t };
}

async function main() {
  const script = JSON.parse(readFileSync(join(here, 'script.json'), 'utf8'));
  const { segments, total } = buildTimeline(script);
  console.log(`משך: ${total.toFixed(1)} שניות · ${segments.length} קטעים`);
  for (const seg of segments) {
    if (!seg.clip) continue;
    const rate = seg.clip.duration / (seg.duration - 0.4);
    const flag = rate > 2.6 ? '  ← מהיר מדי' : '';
    console.log(`  ${seg.id.padEnd(14)} ${seg.duration.toFixed(1)}s  צילום ${seg.clip.duration.toFixed(1)}s  ×${rate.toFixed(2)}${flag}`);
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(join(WORK, 'timeline.json'), JSON.stringify({ total, segments: segments.map(({ clip, ...rest }) => rest) }, null, 1));

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--force-color-profile=srgb'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: OUT_W / 1920 });
  const fonts = join(root, 'node_modules/@fontsource/assistant/files');
  await context.route('http://mv.local/**', async (route) => {
    const url = new URL(route.request().url());
    let file = null;
    if (url.pathname === '/') {
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: readFileSync(join(here, 'composer.html'), 'utf8') });
    }
    if (url.pathname.startsWith('/scenes/')) file = join(WORK, decodeURIComponent(url.pathname));
    if (url.pathname.startsWith('/fonts/')) file = join(fonts, url.pathname.slice('/fonts/'.length));
    if (!file || !existsSync(file)) return route.fulfill({ status: 404, body: '' });
    const type = { '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.png': 'image/png' }[extname(file)] ?? 'application/octet-stream';
    return route.fulfill({ contentType: type, body: readFileSync(file), headers: { 'Cache-Control': 'max-age=3600' } });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error('page error:', error.message));
  await page.goto('http://mv.local/');
  await page.evaluate((data) => window.setup(data), { segments, total });
  await page.evaluate(() => document.fonts.ready);

  const cdp = await context.newCDPSession(page);
  const silent = join(WORK, 'video-only.mp4');
  const ff = spawn(
    FFMPEG,
    [
      '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', PREVIEW ? 'veryfast' : 'slow', '-crf', PREVIEW ? '28' : '17',
      '-pix_fmt', 'yuv420p', '-r', String(FPS), silent,
    ],
    { stdio: ['pipe', 'ignore', 'inherit'] }
  );
  const frames = Math.round(total * FPS);
  const started = Date.now();
  for (let n = 0; n < frames; n += 1) {
    await page.evaluate((t) => window.render(t), n / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: PREVIEW ? 80 : 94, optimizeForSpeed: true });
    if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((done) => ff.stdin.once('drain', done));
    if (n % (FPS * 10) === 0) {
      const rate = n / ((Date.now() - started) / 1000 || 1);
      console.log(`  פריים ${n}/${frames} · ${rate.toFixed(1)} לשנייה`);
    }
  }
  ff.stdin.end();
  await new Promise((done) => ff.on('close', done));
  await browser.close();

  // ─── שמע: קריינות במקומה + מוזיקה עם "דאקינג" מתחת לקול ───
  const voices = segments.filter((seg) => seg.voiceFile);
  const music = join(WORK, 'music.wav');
  const inputs = ['-i', silent];
  const filters = [];
  let idx = 1;
  const voiceLabels = [];
  for (const seg of voices) {
    inputs.push('-i', seg.voiceFile);
    const ms = Math.round(seg.voiceStart * 1000);
    filters.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms}[v${idx}]`);
    voiceLabels.push(`[v${idx}]`);
    idx += 1;
  }
  let musicLabel = null;
  if (existsSync(music)) {
    inputs.push('-i', music);
    filters.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${total.toFixed(3)},afade=t=out:st=${(total - 2.5).toFixed(3)}:d=2.5,volume=${voices.length ? 0.55 : 0.8}[m]`);
    musicLabel = '[m]';
    idx += 1;
  }
  const args = ['-y', ...inputs];
  if (voiceLabels.length || musicLabel) {
    if (voiceLabels.length) {
      filters.push(`${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:normalize=0,apad=whole_dur=${total.toFixed(3)}[voice]`);
    }
    if (voiceLabels.length && musicLabel) {
      filters.push('[voice]asplit=2[vk][vm]');
      filters.push(`${musicLabel}[vk]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=400[duck]`);
      filters.push('[duck][vm]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]');
    } else if (voiceLabels.length) {
      filters.push('[voice]alimiter=limit=0.95[a]');
    } else {
      filters.push(`${musicLabel}anull[a]`);
    }
    args.push('-filter_complex', filters.join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', total.toFixed(3));
  } else {
    args.push('-c:v', 'copy');
  }
  args.push('-movflags', '+faststart', OUT);
  execFileSync(FFMPEG, args, { stdio: ['ignore', 'ignore', 'inherit'] });

  // כתוביות SRT לצד הסרטון
  const stamp = (s) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const p = (v, n = 2) => String(v).padStart(n, '0');
    return `${p(Math.floor(ms / 3.6e6))}:${p(Math.floor((ms % 3.6e6) / 6e4))}:${p(Math.floor((ms % 6e4) / 1000))},${p(ms % 1000, 3)}`;
  };
  const cues = segments.flatMap((seg) => seg.captions);
  writeFileSync(OUT.replace(/\.mp4$/, '.srt'), cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n'));
  console.log(`נוצר ${OUT} · ${total.toFixed(1)} שניות · ${((Date.now() - started) / 60000).toFixed(1)} דקות`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
