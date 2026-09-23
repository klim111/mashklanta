'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Circle,
  Pause,
  Play,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DemoWindow } from './DemoKit';
import { DEMO_SCREENS } from './DemoScreens';
import { DEMO_TRACKS, sceneDuration, trackById } from './demoTracks';
import type { DemoTrack } from './demoTracks';

/**
 * נגן ההדגמה — ה"סרטון" של הפלטפורמה.
 *
 * מה שרץ כאן אינו וידאו מוקלט אלא המסכים עצמם: אותם מסכים שהלקוח רואה באזור
 * האישי, בשלבים ובכלים, מתחלפים אחד אחרי השני עם ההסבר שלצדם. אפשר לעצור,
 * לדלג קדימה ואחורה, ולעבור בין המסלולים — מתלבטים, משכנתא חדשה ומיחזור.
 */

export function DemoPlayer({
  open,
  onOpenChange,
  trackId,
  onTrackChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: DemoTrack['id'];
  onTrackChange: (id: DemoTrack['id']) => void;
}) {
  const track = useMemo(() => trackById(trackId), [trackId]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  // כל פתיחה, וכל מעבר בין מסלולים, מתחילים מהסצנה הראשונה
  useEffect(() => {
    setIndex(0);
    setPlaying(true);
  }, [trackId, open]);

  const scene = track.scenes[index];
  const duration = sceneDuration(scene);

  const next = useCallback(() => {
    setIndex((current) => (current + 1) % track.scenes.length);
  }, [track.scenes.length]);

  const previous = useCallback(() => {
    setIndex((current) => (current - 1 + track.scenes.length) % track.scenes.length);
  }, [track.scenes.length]);

  useEffect(() => {
    if (!open || !playing) return;
    const timer = setTimeout(next, duration);
    return () => clearTimeout(timer);
  }, [open, playing, next, duration, index]);

  // ניווט במקלדת, כמו בכל נגן
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') next();
      if (event.key === 'ArrowRight') previous();
      if (event.key === ' ') {
        event.preventDefault();
        setPlaying((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, previous]);

  const screen = DEMO_SCREENS[scene.screen];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="w-[calc(100vw-1rem)] max-w-6xl overflow-hidden rounded-3xl border-0 bg-slate-950 p-0 text-right shadow-2xl sm:w-full [&>button]:hidden"
      >
        {/* כותרת הנגן */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-2xs font-black text-rose-300">
            <Circle className="h-2 w-2 fill-current" />
            הדגמה חיה
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-info font-black text-white sm:text-lg">
              {track.title}
            </DialogTitle>
            <DialogDescription className="truncate text-2xs text-white/50">
              המסכים האמיתיים של הפלטפורמה — סצנה {index + 1} מתוך {track.scenes.length}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="סגירה"
            className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-start">
            {/* המסך */}
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.35 }}
              >
                <DemoWindow url={screen.url}>{screen.render()}</DemoWindow>
              </motion.div>
            </AnimatePresence>

            {/* ההסבר */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${scene.id}-copy`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="min-w-0"
              >
                {scene.badge && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l ${track.gradient} px-3 py-1 text-2xs font-black text-white`}
                  >
                    {scene.badge}
                  </span>
                )}
                <h3 className="mt-2 text-subtitle font-black leading-tight text-white">
                  {scene.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-white/60">{scene.subtitle}</p>

                <ul className="mt-3 space-y-2">
                  {scene.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span className="text-xs leading-relaxed text-white/80">{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* פס ההתקדמות ובקרות הנגן */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {track.scenes.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(itemIndex)}
                  aria-label={item.title}
                  className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15"
                >
                  <span
                    className={`block h-full rounded-full ${
                      itemIndex < index ? 'w-full bg-white/60' : itemIndex === index ? 'bg-white' : 'w-0'
                    }`}
                    style={
                      itemIndex === index
                        ? {
                            animation: `demo-progress ${sceneDuration(item)}ms linear forwards`,
                            animationPlayState: playing ? 'running' : 'paused',
                          }
                        : undefined
                    }
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={previous}
                aria-label="הסצנה הקודמת"
                className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? 'עצירה' : 'המשך'}
                className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="הסצנה הבאה"
                className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* מעבר בין המסלולים והקריאה לפעולה */}
        <div className="flex flex-col gap-3 border-t border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-wrap gap-1.5">
            {DEMO_TRACKS.map((item) => {
              const Icon = item.icon;
              const active = item.id === track.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTrackChange(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors ${
                    active
                      ? 'bg-white text-slate-900'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <Link
            href="/#start"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-600 to-violet-600 px-5 py-2.5 text-button font-black text-white shadow-lg transition-all hover:shadow-xl sm:mr-auto"
          >
            להתחיל עכשיו — הכלים חינם
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
