'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

const INK = '#0f1a5a';

/**
 * אזור חתימה על המסך — בעכבר, באצבע או בעט של טאבלט.
 *
 * הקו נמשך מאירועי pointer, כך שכל סוגי הקלט עובדים אותו דבר. בעט, הלחץ משפיע
 * על עובי הקו. בכל סיום משיכה החתימה נחתכת לגבולות הדיו ונמסרת כ-PNG שקוף,
 * שמוטבע בטופס.
 */
export function SignaturePad({
  label,
  onChange,
}: {
  label: string;
  /** PNG שקוף של החתימה, או null כשנמחקה */
  onChange: (png: Uint8Array | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [signed, setSigned] = useState(false);

  const context = () => canvasRef.current?.getContext('2d') ?? null;

  // הקנבס בגודל הפיקסלים האמיתי של המסך, כדי שהחתימה תהיה חדה
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const lineWidth = (event: React.PointerEvent) =>
    event.pointerType === 'pen' && event.pressure > 0 ? 1.2 + event.pressure * 2.6 : 2.4;

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const p = point(event);
    last.current = p;
    const ctx = context();
    if (!ctx) return;
    ctx.beginPath();
    ctx.fillStyle = INK;
    ctx.arc(p.x, p.y, lineWidth(event) / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    event.preventDefault();
    const ctx = context();
    if (!ctx) return;
    const p = point(event);
    const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
    ctx.lineWidth = lineWidth(event);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const exportPng = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cropped = cropToInk(canvas);
    if (!cropped) {
      onChange(null);
      return;
    }
    const blob = await new Promise<Blob | null>((resolve) => cropped.toBlob(resolve, 'image/png'));
    onChange(blob ? new Uint8Array(await blob.arrayBuffer()) : null);
  }, [onChange]);

  const end = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setSigned(true);
    void exportPng();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = context();
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setSigned(false);
    onChange(null);
  };

  return (
    <div dir="rtl" className="space-y-1.5">
      <div dir="rtl" className="flex items-center justify-between gap-2">
        <span dir="rtl" className="inline-flex items-center gap-1.5 text-info font-black text-slate-800">
          <PenLine className="h-4 w-4 text-slate-400" />
          {label}
        </span>
        <button
          type="button"
          onClick={clear}
          disabled={!signed}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-2xs font-bold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
        >
          <Eraser className="h-3.5 w-3.5" />
          ניקוי
        </button>
      </div>
      <div dir="rtl" className="relative">
        <canvas
          ref={canvasRef}
          aria-label={label}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          className="block h-36 w-full cursor-crosshair touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-white"
        />
        {!signed && (
          <span
            dir="rtl"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-info text-slate-300"
          >
            חתמו כאן בעכבר, באצבע או בעט
          </span>
        )}
        <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-slate-200" />
      </div>
    </div>
  );
}

/** קנבס חדש שמכיל רק את אזור הדיו, עם שוליים קטנים */
function cropToInk(source: HTMLCanvasElement): HTMLCanvasElement | null {
  const ctx = source.getContext('2d');
  if (!ctx) return null;
  const { width, height } = source;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const margin = 4;
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(width - 1, maxX + margin);
  maxY = Math.min(height - 1, maxY + margin);
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d')?.drawImage(source, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
