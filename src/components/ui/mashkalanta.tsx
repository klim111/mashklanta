"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

type MashkalantaProps = {
  /** hero = דף הבית; header = כותרת תהליך התכנון; nav = לוגו בסרגל העליון */
  variant?: "hero" | "header" | "nav";
  /** מפעיל את אנימציית ה־ל בלי צורך בריחוף */
  autoPlay?: boolean;
};

export default function LoanWordJump({
  variant = "hero",
  autoPlay = false,
}: MashkalantaProps) {
  const [triggered, setTriggered] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const isHeader = variant === "header";
  const isNav = variant === "nav";

  const handleHover = () => {
    if (!triggered) setTriggered(true);
  };

  useEffect(() => {
    if (!autoPlay || triggered) return;
    const start = setTimeout(() => setTriggered(true), 250);
    return () => clearTimeout(start);
  }, [autoPlay, triggered]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (triggered) {
      timer = setTimeout(() => setAnimationDone(true), 1300);
    }
    return () => clearTimeout(timer);
  }, [triggered]);

  const containerStyle = {
    display: "inline-flex",
    direction: "rtl" as const,
    unicodeBidi: "plaintext" as const,
  };

  const finalWord = ["מ", "ש", "כ", "ל", "נ", "ת", "א"];
  const blinkClass = isHeader ? "blink-and-bold-header" : "blink-and-bold";
  const lamedInClass = isHeader ? "text-emerald-300" : "text-emerald-600";
  const letterClass = isHeader ? "text-white" : isNav ? "text-gray-900" : undefined;

  const wrapClass = isHeader
    ? "flex shrink-0 cursor-pointer select-none flex-col items-center justify-center"
    : isNav
      ? "flex shrink-0 cursor-pointer select-none flex-col items-center justify-center leading-none"
      : "flex h-96 cursor-pointer select-none flex-col items-center justify-center";

  const wordClass = isHeader
    ? "text-2xl font-bold text-white md:text-[1.7rem]"
    : isNav
      ? "text-xl font-black text-gray-900 md:text-2xl"
      : "text-5xl font-bold";

  return (
    <div dir="rtl" onMouseEnter={handleHover} className={wrapClass}>
      <div className={wordClass} style={containerStyle}>
        {finalWord.map((letter, index) => {
          if (letter === "ל") {
            return (
              <AnimatePresence key="lamed">
                {triggered && !animationDone && (
                  <motion.span
                    initial={{ x: 40, y: -40, opacity: 0 }}
                    animate={{
                      x: 0,
                      y: 0,
                      opacity: 1,
                      transition: {
                        duration: 1.0,
                        ease: "easeOut",
                      },
                    }}
                    exit={{ opacity: 0 }}
                    className={lamedInClass}
                  >
                    ל
                  </motion.span>
                )}
                {animationDone && <span className={blinkClass}>ל</span>}
              </AnimatePresence>
            );
          }

          if (animationDone && (letter === "ש" || letter === "כ")) {
            return (
              <span key={index} className={blinkClass}>
                {letter}
              </span>
            );
          }

          return (
            <span key={index} className={letterClass}>
              {letter}
            </span>
          );
        })}
      </div>

      <AnimatePresence>
        {animationDone && !isNav && (
          <motion.div
            key="finalText"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
            className={
              isHeader
                ? "mt-1 max-w-[11rem] text-center text-[10px] font-semibold leading-tight text-cyan-100/90 md:text-[11px]"
                : "mt-4 text-xl text-gray-700"
            }
          >
            מוסיפים שכל למשכנתא שלך
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .blink-and-bold {
          animation: blink 0.5s steps(2, start) 1;
          font-weight: bold;
          color: #065f46;
        }
        .blink-and-bold-header {
          animation: blink 0.5s steps(2, start) 1;
          font-weight: bold;
          color: #6ee7b7;
        }
        @keyframes blink {
          to {
            visibility: hidden;
          }
        }
      `}</style>
    </div>
  );
}
