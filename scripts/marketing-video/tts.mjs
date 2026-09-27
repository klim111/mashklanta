/**
 * סרטון השיווק — קריינות בעברית דרך Google Cloud Text-to-Speech.
 *
 *   GOOGLE_TTS_KEY=... node scripts/marketing-video/tts.mjs            # כל הקטעים
 *   GOOGLE_TTS_KEY=... node scripts/marketing-video/tts.mjs --voices   # רשימת הקולות בעברית
 *   VOICE=he-IL-Chirp3-HD-Charon node ...                              # קול מסוים
 *
 * הפלט: .marketing-work/voice/<id>.wav לכל קטע ב-script.json. אפשר גם להקליט
 * בעצמכם: קובץ WAV לכל קטע באותו שם, והעורך (compose.mjs) ישתמש בו.
 * `say` בקטע (אם קיים) מחליף את `voice` לדיבור בלבד — למשל כתיב מנוקד.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const WORK = resolve(process.env.WORK_DIR ?? join(root, '.marketing-work'));
const KEY = process.env.GOOGLE_TTS_KEY;
const API = 'https://texttospeech.googleapis.com/v1';

if (!KEY) {
  console.error('חסר GOOGLE_TTS_KEY');
  process.exit(1);
}

async function call(path, body) {
  const response = await fetch(`${API}/${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(KEY)}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${json.error?.message ?? ''}`);
  return json;
}

async function voices() {
  const { voices = [] } = await call('voices?languageCode=he-IL');
  return voices.map((voice) => ({ name: voice.name, gender: voice.ssmlGender }));
}

/** ההעדפה: Chirp 3 HD (הטבעי ביותר), אחריו Neural2/WaveNet */
function pickVoice(list) {
  if (process.env.VOICE) return process.env.VOICE;
  const rank = (name) => (/Chirp3-HD/.test(name) ? 0 : /Chirp/.test(name) ? 1 : /Neural2/.test(name) ? 2 : /Wavenet/.test(name) ? 3 : 4);
  const sorted = [...list].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  return sorted[0]?.name;
}

async function main() {
  const list = await voices();
  if (process.argv.includes('--voices')) {
    list.forEach((voice) => console.log(voice.name, voice.gender));
    return;
  }
  const voice = pickVoice(list);
  if (!voice) throw new Error('אין קולות עבריים זמינים');
  console.log('קול:', voice);
  const script = JSON.parse(readFileSync(join(here, 'script.json'), 'utf8'));
  const only = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const dir = join(WORK, 'voice');
  mkdirSync(dir, { recursive: true });
  const rate = Number(process.env.RATE ?? (/Chirp/.test(voice) ? 1.0 : 1.04));
  for (const seg of script.segments) {
    if (only.length && !only.includes(seg.id)) continue;
    const text = seg.say ?? seg.voice;
    const audioConfig = { audioEncoding: 'LINEAR16', sampleRateHertz: 48000 };
    if (!/Chirp/.test(voice)) Object.assign(audioConfig, { speakingRate: rate, pitch: 0 });
    else if (rate !== 1) audioConfig.speakingRate = rate;
    const { audioContent } = await call('text:synthesize', {
      input: { text },
      voice: { languageCode: 'he-IL', name: voice },
      audioConfig,
    });
    writeFileSync(join(dir, `${seg.id}.wav`), Buffer.from(audioContent, 'base64'));
    console.log('  ✓', seg.id);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
