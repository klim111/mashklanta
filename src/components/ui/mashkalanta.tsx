"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

type MashkalantaProps = {
  /** hero = דף הבית; header = כותרת תהליך התכנון */
  variant?: "hero" | "header";
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

  return (
    <div
      dir="rtl"
      onMouseEnter={handleHover}
      className={
        isHeader
          ? "flex shrink-0 cursor-pointer select-none flex-col items-center justify-center"
          : "flex h-96 cursor-pointer select-none flex-col items-center justify-center"
      }
    >
      <div
        className={isHeader ? "text-2xl font-bold text-white md:text-[1.7rem]" : "text-5xl font-bold"}
        style={containerStyle}
      >
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
                    className={isHeader ? "text-emerald-300" : "text-green-600"}
                  >
                    ל
                  </motion.span>
                )}
                {animationDone && (
                  <span className={isHeader ? "blink-and-bold-header" : "blink-and-bold"}>ל</span>
                )}
              </AnimatePresence>
            );
          }

          if (animationDone && (letter === "ש" || letter === "כ")) {
            return (
              <span
                key={index}
                className={isHeader ? "blink-and-bold-header" : "blink-and-bold"}
              >
                {letter}
              </span>
            );
          }

          return (
            <span key={index} className={isHeader ? "text-white" : undefined}>
              {letter}
            </span>
          );
        })}
      </div>

      <AnimatePresence>
        {animationDone && (
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
