'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

type AnimatedNumberProps = {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Animate every time the value changes, not only on first view */
  live?: boolean;
};

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export default function AnimatedNumber({
  value,
  duration = 1400,
  prefix = '',
  suffix = '',
  className = '',
  live = false,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: !live, margin: '-60px' });
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!inView) return;

    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(from + (value - from) * easeOutExpo(progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {Math.round(display).toLocaleString('he-IL')}
      {suffix}
    </span>
  );
}
