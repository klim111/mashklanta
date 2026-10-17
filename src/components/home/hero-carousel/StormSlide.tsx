'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useReducedMotion } from 'framer-motion';
import s from './stage.module.css';
import { lin, runTimeline, seeded, seg } from './timeline';
import { StageLogo } from './StageLogo';

/**
 * מסך הסופה: כל הנושאים של המשכנתא מסתחררים סביב זוג בגשם, משכלנתא שואבת אותם פנימה,
 * השמיים מתבהרים והדשבורד האמיתי עולה מול הזוג.
 */
export const STORM_MS = 9000;

const LABELS = [
  'דוח שמאות',
  'חוזה רכישה',
  'תמהילים',
  'סלים אחידים',
  'בנקים',
  'הלוואות נלוות',
  'ביטוחים',
  'מסמכי בטחונות',
  'טופס טיולים',
  'פעימות תשלום',
  'עורך דין',
  'לוחות סילוקין',
  'ריביות',
];
const COLORS = ['#2563eb', '#0d7a4a', '#f59e0b', '#7c3aed', '#ef4444', '#0891b2'];
const DARK_CLOUDS = [[-6, -6, 34, 14], [22, -8, 40, 15], [58, -7, 36, 13], [84, -6, 30, 14], [8, 2, 24, 9], [66, 1, 28, 10]];
const WHITE_CLOUDS = [[6, 8, 16, 4.5], [70, 5, 20, 5], [44, 13, 12, 3.5]];
const FLASHES = [900, 1020, 2700, 2800];

// כל כרטיס עם כיתוב, ובין הכרטיסים דפים ריקים שנותנים לסופה נפח
const PAPERS = (() => {
  const rnd = seeded(7);
  const list: { label: string | null; h: number; phi: number; rot: number; spin: number; sx: number; sy: number }[] = [];
  const blanks = 6;
  const n = LABELS.length + blanks;
  let li = 0;
  for (let k = 0; k < n; k++) {
    const label = k % 3 === 2 && blanks > list.filter((p) => !p.label).length ? null : LABELS[li++] ?? null;
    const edge = rnd();
    list.push({
      label,
      h: label ? 0.15 + 0.8 * rnd() : rnd(),
      phi: rnd() * Math.PI * 2,
      rot: label ? (rnd() - 0.5) * 24 : (rnd() - 0.5) * 70,
      spin: label ? 0 : (rnd() - 0.5) * 0.12,
      sx: edge < 0.5 ? (rnd() < 0.5 ? -0.15 : 1.15) : rnd(),
      sy: edge < 0.5 ? rnd() * 0.8 : -0.2,
    });
  }
  return list;
})();

export function StormSlide() {
  const reduced = useReducedMotion() ?? false;
  const stage = useRef<HTMLDivElement>(null);
  const rain = useRef<HTMLCanvasElement>(null);
  const paperEls = useRef<(HTMLDivElement | null)[]>([]);
  const darkEls = useRef<(HTMLDivElement | null)[]>([]);
  const whiteEls = useRef<(HTMLDivElement | null)[]>([]);
  const el = {
    skyClear: useRef<HTMLDivElement>(null),
    sun: useRef<HTMLDivElement>(null),
    groundStorm: useRef<HTMLDivElement>(null),
    groundClear: useRef<HTMLDivElement>(null),
    flash: useRef<HTMLDivElement>(null),
    screen: useRef<HTMLDivElement>(null),
    couple: useRef<HTMLDivElement>(null),
    logo: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const root = stage.current;
    const canvas = rain.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext('2d');
    const drops = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), v: 0.9 + Math.random() * 0.8, l: 0.03 + Math.random() * 0.03 }));
    const N = PAPERS.length;

    const render = (t: number) => {
      const r = root.getBoundingClientRect();
      const W = r.width;
      const H = r.height;
      if (!W) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(W * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      const clear = seg(t, 5200, 6400);
      const set = (ref: RefObject<HTMLElement | null>, style: Partial<CSSStyleDeclaration>) => {
        if (ref.current) Object.assign(ref.current.style, style);
      };

      set(el.skyClear, { opacity: String(clear) });
      set(el.groundClear, { opacity: String(clear) });
      set(el.groundStorm, { opacity: String(1 - clear) });
      set(el.sun, { opacity: String(seg(t, 5600, 6800)), transform: `translateY(${(1 - seg(t, 5600, 7000)) * 8}cqw)` });
      darkEls.current.forEach((d, i) => {
        if (d) Object.assign(d.style, { opacity: String(0.85 * (1 - seg(t, 5000, 6200))), transform: `translateX(${Math.sin(t / 900 + i) * 1.2}cqw) translateY(${-seg(t, 5000, 6400) * 10}cqw)` });
      });
      whiteEls.current.forEach((d) => {
        if (d) Object.assign(d.style, { opacity: String(0.9 * seg(t, 5800, 7000)), transform: `translateX(${(t / 1000) * 0.25}cqw)` });
      });

      const fl = FLASHES.reduce((m, f) => Math.max(m, t > f && t < f + 140 ? 1 - (t - f) / 140 : 0), 0);
      set(el.flash, { opacity: String(fl * 0.75) });

      if (ctx) {
        const a = 1 - seg(t, 5000, 5800);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (a > 0.01) {
          ctx.strokeStyle = `rgba(190,205,230,${0.45 * a})`;
          ctx.lineWidth = Math.max(1, canvas.width / 900);
          ctx.beginPath();
          drops.forEach((d) => {
            const y = ((d.y + t * 0.0011 * d.v) % 1.1) - 0.05;
            const x = (d.x + y * 0.12) % 1;
            ctx.moveTo(x * canvas.width, y * canvas.height);
            ctx.lineTo((x + d.l * 0.25) * canvas.width, (y + d.l) * canvas.height);
          });
          ctx.stroke();
        }
      }

      const couple = el.couple.current;
      if (couple) {
        couple.classList.toggle(s.worried, t < 5800);
        couple.style.transform = `translateX(${t < 5200 ? Math.sin(t / 45) * W * 0.0015 : 0}px)`;
      }

      const logo = el.logo.current;
      const lIn = seg(t, 3600, 4200);
      const lOut = seg(t, 6000, 6600);
      if (logo) {
        const pulse = t > 4200 && t < 6000 ? 1 + 0.05 * Math.sin(t / 120) : 1;
        logo.style.left = '50%';
        logo.style.top = '5.5cqw';
        logo.style.opacity = String(1 - lOut);
        logo.style.transform = `translate(-50%,0) scale(${lIn * pulse * (1 - 0.4 * lOut)})`;
        logo.style.boxShadow = `0 0 0 ${W * 0.012 * seg(t, 4000, 4500) * (1 - lOut)}px rgba(96,165,250,.35), 0 0 ${W * 0.05}px rgba(147,197,253,${0.55 * lIn * (1 - lOut)})`;
      }
      const LX = W * 0.5;
      const LY = W * 0.085;

      PAPERS.forEach((p, k) => {
        const node = paperEls.current[k];
        if (!node) return;
        const enter = 150 + k * 120;
        const suck = 4400 + (N - k) * 40;
        const ang = p.phi + t * 0.00085 * (1.5 - 0.6 * p.h);
        const rad = W * (0.07 + 0.26 * p.h) * (1 + 0.08 * Math.sin(t / 600 + p.phi));
        let x = W * 0.5 + rad * Math.cos(ang);
        let y = H * (0.86 - 0.72 * p.h) + rad * 0.1 * Math.sin(ang);
        const depth = Math.sin(ang);
        let sc = (p.label ? 0.88 : 0.7) + (p.label ? 0.12 : 0.3) * (depth + 1) / 2;
        let rot = p.rot + (p.label ? Math.sin(t / 900 + p.phi) * 6 : t * p.spin * 0.6);
        const fin = seg(Math.max(0, t - enter), 0, 900);
        x = p.sx * W + (x - p.sx * W) * fin;
        y = p.sy * H + (y - p.sy * H) * fin;
        const k2 = seg(t, suck, suck + 1000);
        x += (LX - x) * k2;
        y += (LY - y) * k2;
        sc *= 1 - 0.85 * k2;
        rot *= 1 - k2;
        node.style.opacity = String(t < enter ? 0 : 1 - lin(t, suck + 750, suck + 1000));
        node.style.zIndex = String(k2 > 0.3 ? 65 : p.label ? (depth < 0 ? 55 : 62) : depth < 0 ? 40 : 58);
        node.style.transform = `translate(${x - node.offsetWidth / 2}px,${y - node.offsetHeight / 2}px) rotate(${rot}deg) scale(${sc})`;
      });

      const rise = seg(t, 6100, 7400);
      set(el.screen, { opacity: String(lin(t, 6100, 6600)), transform: `translateY(${(1 - rise) * 40}cqw) scale(${0.9 + 0.1 * rise})` });
    };

    return runTimeline(render, STORM_MS, reduced);
  }, [reduced]);

  return (
    <div ref={stage} className={s.stage} style={{ height: '100%' }}>
      <div className={`${s.layer} ${s.skyStorm}`} />
      <div ref={el.skyClear} className={`${s.layer} ${s.skyClear}`} />
      <div ref={el.sun} className={s.sun} />
      {DARK_CLOUDS.map(([x, y, w, h], i) => (
        <div key={`d${i}`} ref={(n) => { darkEls.current[i] = n; }} className={`${s.cloud} ${s.cloudDark}`} style={{ left: `${x}cqw`, top: `${y}cqw`, width: `${w}cqw`, height: `${h}cqw` }} />
      ))}
      {WHITE_CLOUDS.map(([x, y, w, h], i) => (
        <div key={`w${i}`} ref={(n) => { whiteEls.current[i] = n; }} className={`${s.cloud} ${s.cloudWhite}`} style={{ left: `${x}cqw`, top: `${y}cqw`, width: `${w}cqw`, height: `${h}cqw` }} />
      ))}
      <div ref={el.groundStorm} className={`${s.ground} ${s.groundStorm}`} />
      <div ref={el.groundClear} className={`${s.ground} ${s.groundClear}`} />
      <canvas ref={rain} className={s.canvas} />
      <div ref={el.flash} className={`${s.layer} ${s.flash}`} />

      <div ref={el.screen} className={s.screen}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home/hero-dashboard.jpg" alt="" width={1152} height={704} />
      </div>

      <div ref={el.couple} className={`${s.couple} ${s.worried}`}>
        <Couple />
      </div>

      {PAPERS.map((p, k) => (
        <div
          key={k}
          ref={(n) => { paperEls.current[k] = n; }}
          className={`${s.paper} ${p.label ? '' : s.blank}`}
          style={{ ['--c' as string]: COLORS[k % COLORS.length] }}
        >
          {p.label && <b>{p.label}</b>}
          <i />
          <i />
          <i />
        </div>
      ))}

      <StageLogo ref={el.logo} />
    </div>
  );
}

/** זוג שעומד עם הגב אלינו; הידיים עולות לראש בזמן הסופה ויורדות כשהשמיים מתבהרים */
function Couple() {
  return (
    <svg viewBox="0 0 200 230">
      <g>
        <rect x="54" y="148" width="14" height="72" rx="6" fill="#1f2a44" />
        <rect x="72" y="148" width="14" height="72" rx="6" fill="#1f2a44" />
        <path d="M48 76 Q48 62 62 60 L78 60 Q92 62 92 76 L94 154 L46 154 Z" fill="#1e40af" />
        <ellipse cx="52.5" cy="42" rx="3.5" ry="5" fill="#c58b67" />
        <ellipse cx="87.5" cy="42" rx="3.5" ry="5" fill="#c58b67" />
        <rect x="63" y="52" width="14" height="12" fill="#c58b67" />
        <circle cx="70" cy="39" r="17.5" fill="#2a211c" />
        <g className={`${s.arm} ${s.armHisLeft}`}>
          <line x1="52" y1="70" x2="46" y2="128" stroke="#1e40af" strokeWidth="13" strokeLinecap="round" />
          <circle cx="46" cy="132" r="6" fill="#c58b67" />
        </g>
        <g className={`${s.arm} ${s.armHisRight}`}>
          <line x1="88" y1="70" x2="94" y2="128" stroke="#1e40af" strokeWidth="13" strokeLinecap="round" />
          <circle cx="94" cy="132" r="6" fill="#c58b67" />
        </g>
      </g>
      <g>
        <rect x="118" y="152" width="12" height="68" rx="6" fill="#334155" />
        <rect x="134" y="152" width="12" height="68" rx="6" fill="#334155" />
        <path d="M112 82 Q112 68 124 66 L138 66 Q150 68 150 82 L156 160 L106 160 Z" fill="#0f766e" />
        <rect x="125" y="58" width="12" height="10" fill="#d9a07c" />
        <path d="M115 48 Q115 30 131 30 Q147 30 147 48 L150 92 Q131 98 112 92 Z" fill="#5a3826" />
        <g className={`${s.arm} ${s.armHerLeft}`}>
          <line x1="112" y1="74" x2="106" y2="128" stroke="#0f766e" strokeWidth="11" strokeLinecap="round" />
          <circle cx="106" cy="132" r="5.5" fill="#d9a07c" />
        </g>
        <g className={`${s.arm} ${s.armHerRight}`}>
          <line x1="146" y1="74" x2="152" y2="128" stroke="#0f766e" strokeWidth="11" strokeLinecap="round" />
          <circle cx="152" cy="132" r="5.5" fill="#d9a07c" />
        </g>
      </g>
    </svg>
  );
}
