"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function LoanWordJump() {
  const [triggered, setTriggered] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);

  const handleHover = () => {
    if (!triggered) setTriggered(true);
  };

  // After the "ל" animation finishes, start blinking & bold effect
  useEffect(() => {
    let timer;
    if (triggered) {
      timer = setTimeout(() => setAnimationDone(true), 1300); // matches duration of motion animation
    }
    return () => clearTimeout(timer);
  }, [triggered]);

  const containerStyle = {
    display: "inline-flex",
    direction: "rtl",
    unicodeBidi: "plaintext",
  };

  // The final word letters with "ל" inserted at position 3
  const finalWord = ["מ", "ש", "כ", "ל", "נ", "ת", "א"];

  return (
    <div
      dir="rtl"
      onMouseEnter={handleHover}
      className="flex flex-col justify-center items-center h-96 cursor-pointer select-none"
    >
      {/* Word container */}
      <div className="text-5xl font-bold" style={containerStyle}>
        {finalWord.map((letter, index) => {
          // For the "ל" letter, show it animated only when triggered
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
                    className="text-green-600"
                  >
                    ל
                  </motion.span>
                )}
                {/* Once animation done, show static letter with blinking */}
                {animationDone && (
                  <span className="blink-and-bold">ל</span>
                )}
              </AnimatePresence>
            );
          }

          // For the letters ש and כ, apply blink+bold after animation done
          if (animationDone && (letter === "ש" || letter === "כ")) {
            return (
              <span key={index} className="blink-and-bold">
                {letter}
              </span>
            );
          }

          // For other letters, just render normally
          return (
            <span key={index}>
              {letter}
            </span>
          );
        })}
      </div>

      {/* Final text appears after animation is done */}
      <AnimatePresence>
        {animationDone && (
          <motion.div
            key="finalText"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
            className="mt-4 text-xl text-gray-700"
          >
            מוסיפים שכל למשכנתא שלך
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .blink-and-bold {
          animation: blink 0.5s steps(2, start) 1;
          font-weight: bold;
          color: #065f46; /* Tailwind emerald-700 color */
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
