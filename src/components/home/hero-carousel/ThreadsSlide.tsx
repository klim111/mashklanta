'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import s from './stage.module.css';
import { clamp, runTimeline, seeded, seg } from './timeline';
import { StageLogo } from './StageLogo';

/**
 * מסך החוטים: כל נושא במשכנתא קשור בחוט לפקעת אחת. משכלנתא תופסת קצה ומושכת,
 * הפקעת נפרמת לקו ישר, וכל נושא נוחת מתחת לשלב שלו מתוך חמשת השלבים.
 */
export const THREADS_MS = 9000;

// השלבים לפי הסדר שבו הם מופיעים בדשבורד של הלקוח
const STAGES = ['פרופיל פיננסי', 'בניית תמהיל', 'אישור עקרוני', 'מכרז ריביות', 'חתימה בבנק'];
const ITEMS: [string, number][] = [
  ['חוזה רכישה', 0], ['פעימות תשלום', 0], ['עורך דין', 0],
  ['תמהילים', 1], ['סלים אחידים', 1], ['לוחות סילוקין', 1],
  ['בנקים', 2],
  ['ריביות', 3], ['הלוואות נלוות', 3],
  ['דוח שמאות', 4], ['ביטוחים', 4], ['מסמכי בטחונות', 4], ['טופס טיולים', 4],
];
const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#c084fc', '#f87171', '#22d3ee', '#fb923c'];
const LINE_Y = 0.4;
const LOGO_X = 0.972;
const KNOT = { x: 0.5, y: 0.47 };
const SAMPLES = 90;
const stX = (i: number) => 0.74 - i * 0.155; // מימין לשמאל

type Pt = { x: number; y: number; ph?: number };

const STRINGS = (() => {
  const rnd = seeded(11);
  const perStage = [0, 0, 0, 0, 0];
  const order = [...ITEMS.keys()].sort(() => rnd() - 0.5);
  return ITEMS.map(([label, st], idx) => {
    const slot = order.indexOf(idx);
    const a = -Math.PI / 2 + (slot / ITEMS.length) * Math.PI * 2 + (rnd() - 0.5) * 0.25;
    const home = {
      x: clamp(0.5 + 0.36 * Math.cos(a) + (rnd() - 0.5) * 0.04, 0.1, 0.9),
      y: clamp(0.47 + 0.36 * Math.sin(a) + (rnd() - 0.5) * 0.05, 0.08, 0.9),
    };
    const ctrl: Pt[] = [home, { x: home.x + (KNOT.x - home.x) * 0.45 + (rnd() - 0.5) * 0.12, y: home.y + (KNOT.y - home.y) * 0.45 + (rnd() - 0.5) * 0.18 }];
    const loops = 6 + Math.floor(rnd() * 3);
    for (let j = 0; j < loops; j++) {
      const r = 0.03 + rnd() * 0.09;
      const an = rnd() * Math.PI * 2;
      ctrl.push({ x: KNOT.x + r * Math.cos(an), y: KNOT.y + r * 1.6 * Math.sin(an), ph: rnd() * 6 });
    }
    return { label, st, row: perStage[st]++, ctrl, color: COLORS[idx % COLORS.length], enter: 200 + slot * 220, phase: rnd() * 6 };
  });
})();

// עקומה חלקה שעוברת דרך נקודות הבקרה
function catmullRom(pts: Pt[], n: number): Pt[] {
  const out: Pt[] = [];
  const m = pts.length - 1;
  for (let k = 0; k < n; k++) {
    const f = (k / (n - 1)) * m;
    const i = Math.min(m - 1, Math.floor(f));
    const u = f - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(m, i + 2)];
    const u2 = u * u, u3 = u2 * u;
    out.push({
      x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
      y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
    });
  }
  return out;
}

// דגימה של קו שבור בנקודות במרחקים שווים
function resample(poly: Pt[], n: number): Pt[] {
  const L = [0];
  for (let i = 1; i < poly.length; i++) L.push(L[i - 1] + Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y));
  const total = L[L.length - 1];
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / (n - 1)) * total;
    while (j < L.length - 2 && L[j + 1] < d) j++;
    const u = (d - L[j]) / (L[j + 1] - L[j] || 1);
    out.push({ x: poly[j].x + (poly[j + 1].x - poly[j].x) * u, y: poly[j].y + (poly[j + 1].y - poly[j].y) * u });
  }
  return out;
}

export function ThreadsSlide() {
  const reduced = useReducedMotion() ?? false;
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const stations = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = stage.current;
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!root || !cv || !ctx) return;

    const render = (realT: number) => {
      // ציר הזמן נכתב בקצב כפול, כך שהמסך כולו נמשך תשע שניות
      const t = realT * 2;
      const r = root.getBoundingClientRect();
      const W = r.width;
      const H = r.height;
      if (!W) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(W * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (light.current) light.current.style.opacity = String(seg(t, 9400, 10500));

      // הלוגו נכנס מימין, תופס את הקצה ונשען אחורה כשהוא מושך
      const lw = logo.current?.offsetWidth ?? 0;
      const lh = logo.current?.offsetHeight ?? 0;
      const lIn = seg(t, 5000, 6000);
      const lx = (LOGO_X + 0.2 * (1 - lIn) + 0.012 * seg(t, 6800, 8000) - 0.012 * seg(t, 8000, 9200)) * W - lw / 2;
      const ly = LINE_Y * H;
      if (logo.current) {
        logo.current.style.opacity = String(lIn);
        logo.current.style.transform = `translate(${lx - lw / 2}px,${ly - lh / 2}px)`;
      }
      const grabX = lx - lw / 2;

      // הקו הראשי והתקדמות השלבים
      const lineA = seg(t, 9200, 10400);
      const pf = seg(t, 11600, 15200);
      const fillX = grabX + (stX(4) * W - grabX) * pf;
      if (lineA > 0) {
        ctx.lineCap = 'round';
        ctx.lineWidth = W * 0.006;
        ctx.strokeStyle = `rgba(148,163,184,${lineA})`;
        ctx.beginPath();
        ctx.moveTo(grabX, ly);
        ctx.lineTo(stX(4) * W, ly);
        ctx.stroke();
        if (pf > 0) {
          ctx.strokeStyle = '#16a34a';
          ctx.beginPath();
          ctx.moveTo(grabX, ly);
          ctx.lineTo(fillX, ly);
          ctx.stroke();
        }
      }
      stations.current.forEach((node, i) => {
        if (!node) return;
        const a = seg(t, 9600 + i * 180, 10400 + i * 180);
        node.style.opacity = String(a);
        node.style.transform = `translate(${stX(i) * W}px,${ly - node.offsetHeight + W * 0.02}px) scale(${0.6 + 0.4 * a})`;
        node.classList.toggle(s.done, pf > 0 && fillX <= stX(i) * W + 1);
      });

      STRINGS.forEach((str, si) => {
        const tw = 1 - seg(t, 10400, 11000);
        const cp = str.ctrl.map((p, j) =>
          j < 2
            ? { x: p.x * W + Math.sin(t / 900 + str.phase + j) * W * 0.004, y: p.y * H + Math.cos(t / 1000 + str.phase) * H * 0.006 }
            : { x: (p.x + Math.sin(t / 700 + (p.ph ?? 0)) * 0.008 * tw) * W, y: (p.y + Math.cos(t / 800 + (p.ph ?? 0)) * 0.012 * tw) * H },
        );
        const tangled = catmullRom(cp, SAMPLES);
        const sx = stX(str.st) * W;
        const cardY = ly + W * 0.075 + str.row * W * 0.048;
        const straight = resample([{ x: sx, y: cardY }, { x: sx, y: ly }, { x: grabX, y: ly }], SAMPLES);
        const reach = seg(t, 6000, 6800);
        const pts = tangled.map((p, i) => {
          const u = i / (SAMPLES - 1);
          const q = u > 0.97 ? { x: p.x + (grabX - p.x) * reach, y: p.y + (ly - p.y) * reach } : p;
          // הקצה שליד הלוגו מתיישר ראשון, והמשיכה מתקדמת עד הכרטיס
          const T0 = 6800 + (1 - u) * 2600 + si * 40;
          const k = seg(t, T0, T0 + 1500);
          return { x: q.x + (straight[i].x - q.x) * k, y: q.y + (straight[i].y - q.y) * k };
        });
        const drawn = Math.floor(SAMPLES * seg(t, str.enter, str.enter + 1300));
        if (drawn > 1) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 1 - 0.75 * seg(t, 10400, 11400);
          ctx.strokeStyle = str.color;
          ctx.lineWidth = W * 0.0028;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < drawn; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const card = cards.current[si];
        if (card) {
          const appear = seg(t, str.enter, str.enter + 500);
          const settled = seg(t, 9600 + si * 40, 11200);
          const sc = (0.6 + 0.4 * appear) * (1 - 0.18 * settled);
          const rot = (1 - settled) * Math.sin(t / 1100 + str.phase) * 4;
          card.style.opacity = String(appear);
          card.style.transform = `translate(${pts[0].x - card.offsetWidth / 2}px,${pts[0].y - card.offsetHeight / 2}px) rotate(${rot}deg) scale(${sc})`;
        }
      });
    };

    return runTimeline(render, THREADS_MS, reduced);
  }, [reduced]);

  return (
    <div ref={stage} className={s.stage} style={{ height: '100%' }}>
      <div className={`${s.layer} ${s.threadsDark}`} />
      <div ref={light} className={`${s.layer} ${s.threadsLight}`} />
      <canvas ref={canvas} className={s.canvas} />
      {STRINGS.map((str, i) => (
        <div key={str.label} ref={(n) => { cards.current[i] = n; }} className={s.card} style={{ ['--c' as string]: str.color }}>
          <b>{str.label}</b>
        </div>
      ))}
      {STAGES.map((name, i) => (
        <div key={name} ref={(n) => { stations.current[i] = n; }} className={s.station}>
          <div className={s.stationName}>{name}</div>
          <div className={s.dot}>
            <span>{i + 1}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
        </div>
      ))}
      <StageLogo ref={logo} />
    </div>
  );
}
