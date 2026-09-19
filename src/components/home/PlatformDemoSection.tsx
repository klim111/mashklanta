'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MonitorPlay, PlayCircle, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { DemoPlayer } from '@/components/demo/DemoPlayer';
import { DEMO_TRACKS } from '@/components/demo/demoTracks';
import type { DemoTrack } from '@/components/demo/demoTracks';
import { HeroScreenShowcase } from './HeroScreenShowcase';

/**
 * «ראו את הפלטפורמה מבפנים» — האזור שמתחת לאנימציה בעמוד הבית.
 *
 * שלושה כפתורים, לפי המצב שבו הצופה נמצא, וכל אחד מהם מריץ את המסכים
 * האמיתיים של אותו מסלול: הכלי «מה אני יכול להרשות לעצמי» למתלבטים, חמשת
 * מסכי השלבים למי שבונה משכנתא חדשה, וכלי המיחזור למי שכבר יש לו משכנתא.
 */

const PROMISES = [
  { icon: ShieldCheck, text: 'הכול מסודר ושקוף — כל שלב, כל מסמך וכל מספר במקום אחד' },
  { icon: Wrench, text: 'כל הכלים שהשלב דורש כבר כלולים, בלי תוספות ובלי הפתעות' },
  { icon: Sparkles, text: 'רוצים עזרה? יועץ מקצועי מבצע את השלב — ומשלמים רק עליו' },
];

export function PlatformDemoSection() {
  const [open, setOpen] = useState(false);
  const [trackId, setTrackId] = useState<DemoTrack['id']>('new-mortgage');

  const play = (id: DemoTrack['id']) => {
    setTrackId(id);
    setOpen(true);
  };

  return (
    <section className="relative overflow-hidden bg-white px-4 py-12 md:px-6 md:py-16" dir="rtl">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-indigo-50 to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[13px] font-black text-white">
            <MonitorPlay className="h-3.5 w-3.5" />
            הדגמה · המסכים האמיתיים של המערכת
          </span>
          <h2 className="mt-3 text-2xl font-black text-slate-900 md:text-4xl">
            רוצים לראות איך זה נראה מבפנים?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
            בחרו איפה אתם נמצאים, ונריץ לכם את המסכים עצמם — האזור האישי, שלבי התהליך והכלים —
            עם הסבר קצר על כל מסך ומה הוא חוסך לכם.
          </p>
        </div>

        {/* במסכי טלפון האנימציה שלמעלה אינה מוצגת, ולכן המסכים רצים כאן */}
        <div className="mt-6 flex justify-center md:hidden">
          <HeroScreenShowcase />
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {DEMO_TRACKS.map((track, index) => {
            const Icon = track.icon;
            return (
              <motion.button
                key={track.id}
                type="button"
                onClick={() => play(track.id)}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                className="group flex h-full flex-col items-center rounded-3xl border-2 border-slate-200 bg-white p-6 text-center shadow-md transition-all hover:border-slate-900 hover:shadow-xl"
              >
                <span
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${track.gradient} shadow-lg transition-transform group-hover:scale-110`}
                >
                  <Icon className="h-7 w-7 text-white" />
                </span>
                <span className="text-lg font-black leading-snug text-slate-900">{track.label}</span>
                <span className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">
                  {track.hint}
                </span>
                <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition-colors group-hover:bg-slate-700">
                  <PlayCircle className="h-4 w-4" />
                  צפייה בהדגמה
                  <ArrowLeft className="h-4 w-4" />
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
          {PROMISES.map((promise) => {
            const Icon = promise.icon;
            return (
              <div key={promise.text} className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-bold leading-relaxed text-slate-700">
                  {promise.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <DemoPlayer open={open} onOpenChange={setOpen} trackId={trackId} onTrackChange={setTrackId} />
    </section>
  );
}
