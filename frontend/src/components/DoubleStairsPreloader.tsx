"use client";
/**
 * DoubleStairsPreloader
 * ======================
 * A cinematic full-screen transition preloader inspired by Awwwards / Skiper UI's
 * "Double Stairs" pattern.
 *
 * How it works:
 *  • The viewport is split into NUM_COLS equally-wide vertical columns.
 *  • Odd-indexed columns slide DOWN from above (top-entry).
 *  • Even-indexed columns slide UP from below (bottom-entry).
 *  • Each column is staggered by STAGGER_S seconds so they arrive in a cascading
 *    staircase sequence — giving the "double staircase" silhouette.
 *  • While locked, the center shows the GradeWise logo and rotating status
 *    messages drawn from the `statusMessages` prop.
 *  • When `isExiting` is true the animation plays in reverse, revealing the
 *    results view beneath.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  /** true = staircase is visible (loading); false = plays exit then unmounts */
  isVisible: boolean;
  /** Rotating analysis messages shown in the centre */
  statusMessages?: string[];
}

const NUM_COLS = 12;
const STAGGER_S = 0.045;
const DURATION = 0.55;
const AMBER = "#ea580c";

const defaultMessages = [
  "Scanning Jindal Stainless portfolio…",
  "Evaluating corrosion resistance…",
  "Calculating tensile & yield loads…",
  "Running bending physics engine…",
  "Shortlisting optimal grades…",
  "Crunching fracture thresholds…",
  "Almost there…",
];

export default function DoubleStairsPreloader({
  isVisible,
  statusMessages = defaultMessages,
}: Props) {
  const [msgIdx, setMsgIdx] = useState(0);

  // Cycle through status messages every 1.4 s while visible
  useEffect(() => {
    if (!isVisible) return;
    const id = setInterval(
      () => setMsgIdx((i) => (i + 1) % statusMessages.length),
      1400
    );
    return () => clearInterval(id);
  }, [isVisible, statusMessages]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="stairs-overlay"
          className="fixed inset-0 z-50 pointer-events-none flex"
          initial="enter"
          animate="enter"
          exit="exit"
        >
          {/* ── Columns ── */}
          {Array.from({ length: NUM_COLS }, (_, i) => {
            const fromTop = i % 2 !== 0; // odd → from top, even → from bottom
            return (
              <motion.div
                key={i}
                className="flex-1 h-full"
                style={{ backgroundColor: "#0f0f11" }}
                variants={{
                  enter: {
                    y: 0,
                    transition: {
                      duration: DURATION,
                      delay: i * STAGGER_S,
                      ease: [0.76, 0, 0.24, 1],
                    },
                  },
                  exit: {
                    y: fromTop ? "-100%" : "100%",
                    transition: {
                      duration: DURATION,
                      delay: (NUM_COLS - 1 - i) * STAGGER_S,
                      ease: [0.76, 0, 0.24, 1],
                    },
                  },
                }}
                initial={{ y: fromTop ? "-100%" : "100%" }}
              />
            );
          })}

          {/* ── Centre branding (on top of columns) ── */}
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.4, duration: 0.4 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            {/* Logo mark */}
            <div className="mb-6 flex flex-col items-center gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${AMBER}, #9a3412)` }}
              >
                GW
              </div>
              <h1 className="text-white text-2xl font-black tracking-tight">
                Grade<span style={{ color: AMBER }}>Wise</span>
              </h1>
            </div>

            {/* Rotating status messages */}
            <AnimatePresence mode="wait">
              <motion.p
                key={msgIdx}
                className="text-slate-400 text-sm font-medium tracking-wide"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                {statusMessages[msgIdx]}
              </motion.p>
            </AnimatePresence>

            {/* Amber pulse dots */}
            <div className="flex gap-2 mt-8">
              {[0, 1, 2].map((dot) => (
                <motion.div
                  key={dot}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: AMBER }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: dot * 0.3,
                  }}
                />
              ))}
            </div>

            {/* "Powered by Jindal Stainless" — inside preloader too */}
            <p className="absolute bottom-6 right-8 text-[10px] tracking-widest text-slate-600 uppercase">
              Powered by{" "}
              <span className="font-bold" style={{ color: AMBER }}>
                Jindal Stainless
              </span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
