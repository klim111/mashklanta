'use client';

/**
 * סרטון התדמית שמתחת לאנימציה בדף הבית — סיור של כדקה וחצי בפלטפורמה.
 *
 * הסרטון מוקלט מהממשק האמיתי עם נתונים לדוגמה (scripts/promo-video), והכתוביות
 * צרובות בו. הכפתור פותח חלון עם הנגן; בסוף הסרטון מוצגות שתי פעולות המשך —
 * הכלים החינמיים והרשמה. בטלפון הנגן ממלא את רוחב המסך, ומסך מלא מסובב לרוחב.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, PlayCircle, RotateCcw, X } from 'lucide-react';
import { demoId } from '@/demo/demo-attr';

/** MP4 (H.264) לכל הדפדפנים המסחריים וה-iPhone; WebM לדפדפנים בלי H.264 */
const VIDEO_MP4 = '/promo/mashkalanta-promo.mp4';
const VIDEO_WEBM = '/promo/mashkalanta-promo.webm';
const POSTER_SRC = '/promo/mashkalanta-promo-poster.jpg';
const CAPTIONS_SRC = '/promo/mashkalanta-promo.he.vtt';
/** משך הסרטון בשניות, לתצוגה על הכפתור */
const DURATION_LABEL = '1:20';

export function HeroPromoVideo({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const replay = () => {
    setEnded(false);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  };

  const showFreeTools = () => {
    setOpen(false);
    document.querySelector('[data-demo-id="home-free-tools"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className={className}>
        <button
          type="button"
          onClick={() => {
            setEnded(false);
            setOpen(true);
          }}
          className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 px-7 py-3.5 text-cta font-black text-white shadow-xl shadow-blue-600/25 transition-all hover:shadow-2xl md:w-auto"
          {...demoId('home-demo-button')}
        >
          <PlayCircle className="h-6 w-6 transition-transform group-hover:scale-110" />
          <span>צפו בסרטון: מה זה משכלנתא?</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-2xs font-bold">{DURATION_LABEL}</span>
        </button>
      </motion.div>

      {/* החלון נפתח מעל כל הדף (portal) — אחרת שכבות דף הבית מכסות אותו */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-0 backdrop-blur-sm md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="סרטון: מה זה משכלנתא?"
          onClick={() => setOpen(false)}
        >
          <div className="relative w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגירת הסרטון"
              className="absolute -top-12 left-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 md:left-0"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative overflow-hidden bg-black shadow-2xl md:rounded-2xl">
              <video
                ref={videoRef}
                poster={POSTER_SRC}
                className="block aspect-video w-full"
                controls
                autoPlay
                playsInline
                preload="auto"
                onEnded={() => setEnded(true)}
                onPlay={() => setEnded(false)}
              >
                <source src={VIDEO_MP4} type="video/mp4" />
                <source src={VIDEO_WEBM} type="video/webm" />
                {/* הכתוביות צרובות בסרטון; הרצועה משמשת קוראי מסך ומי שמפעיל כתוביות בנגן */}
                <track kind="captions" src={CAPTIONS_SRC} srcLang="he" label="עברית" />
              </video>

            </div>
            {ended && (
              <div className="mt-3 flex flex-col items-center gap-2 px-3 text-center text-white md:px-0">
                <p className="text-subtitle font-black">רוצים לנסות בעצמכם?</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={showFreeTools}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-button font-black text-white transition-colors hover:bg-blue-700"
                  >
                    לכלים החינמיים
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-button font-black text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    הרשמה
                  </Link>
                  <button
                    type="button"
                    onClick={replay}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-2.5 text-button font-bold text-white transition-colors hover:bg-white/10"
                  >
                    <RotateCcw className="h-4 w-4" />
                    מההתחלה
                  </button>
                </div>
              </div>
            )}
            <p className="mt-2 px-3 text-center text-2xs text-slate-400 md:px-0">
              הסרטון מציג את הממשק האמיתי של משכלנתא. כל השמות, המספרים והמסמכים בו לדוגמה בלבד.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
