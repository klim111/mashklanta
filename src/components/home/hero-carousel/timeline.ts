// כלי עזר קטנים לאנימציות של קרוסלת הראש: כל מסך מחושב מתוך זמן אחד (באלפיות שנייה)

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** התקדמות עם האצה והאטה בין a ל-b */
export const seg = (t: number, a: number, b: number) => ease(clamp((t - a) / (b - a)));

/** התקדמות לינארית בין a ל-b */
export const lin = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

/** מספרים אקראיים קבועים, כך שכל הצגה של המסך נראית אותו דבר */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * מריץ פונקציית ציור על כל פריים מרגע ההרכבה. כשהמשתמש ביקש פחות תנועה,
 * מציירים פעם אחת את המצב הסופי.
 */
export function runTimeline(render: (t: number) => void, total: number, reduced: boolean) {
  if (reduced) {
    render(total);
    return () => {};
  }
  let raf = 0;
  let start: number | null = null;
  const frame = (now: number) => {
    if (start === null) start = now;
    const t = now - start;
    render(Math.min(t, total));
    if (t < total) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

