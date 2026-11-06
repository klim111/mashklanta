'use client';

/**
 * הסמן הווירטואלי — "היד" של ההדגמה.
 *
 * חץ שנע בחלקות אל הרכיב הבא, ומצייר טבעת לחיצה כשההדגמה לוחצת. הוא נרשם
 * במנוע דרך `registerCursor`, והפעולות מזיזות אותו לפני כל לחיצה או הקלדה.
 */

import { useEffect, useRef, useState } from 'react';
import { useDemoEngine } from '../engine/DemoEngineProvider';
import { sleep } from '../engine/dom';

export function VirtualCursor() {
  const engine = useDemoEngine();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [pressing, setPressing] = useState(false);
  const position = useRef({ x: -100, y: -100 });

  useEffect(() => {
    if (!engine) return;
    engine.registerCursor({
      moveTo: async (x, y, duration = 620) => {
        const node = ref.current;
        if (!node) return;
        const from = position.current;
        const distance = Math.hypot(x - from.x, y - from.y);
        const time = from.x < 0 ? 0 : Math.min(duration, Math.max(180, (distance / 900) * duration + 180));
        node.style.transition = `transform ${time}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        node.style.transform = `translate(${x}px, ${y}px)`;
        position.current = { x, y };
        setVisible(true);
        await sleep(time + 40);
      },
      press: async () => {
        setPressing(true);
        await sleep(200);
        setPressing(false);
        await sleep(80);
      },
      hide: () => setVisible(false),
    });
    return () => engine.registerCursor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine?.registerCursor]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`mk-demo-cursor ${visible ? 'is-visible' : ''} ${pressing ? 'is-pressing' : ''}`}
      style={{ transform: `translate(${position.current.x}px, ${position.current.y}px)` }}
    >
      <span className="mk-demo-cursor__ring" />
      <svg width="26" height="30" viewBox="0 0 26 30" fill="none">
        <path
          d="M3 2 L3 24 L8.5 18.8 L12.5 27.5 L16.5 25.6 L12.6 17 L20 17 Z"
          fill="#0f172a"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
