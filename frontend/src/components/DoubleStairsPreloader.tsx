"use client";
/**
 * DoubleStairsIntro — Cinematic Page-Load Intro
 * ===============================================
 * Plays automatically when the user first arrives. Never re-plays during
 * the session (API loading uses its own inline spinner).
 *
 * Timeline
 * --------
 *  Phase 1 "text"      : White screen. "Steel decisions, made visible." fades
 *                        in slowly over ~1.1 s, then holds for ~0.6 s.
 *  Phase 2 "stairs-in" : Text fades out while dark columns cascade in from
 *                        both top and bottom (double-staircase silhouette).
 *  Phase 3 "hold"      : All columns cover the screen. GradeWise logo shows
 *                        briefly (~650 ms).
 *  Phase 4 "stairs-out": Columns cascade back out in reverse order, revealing
 *                        the dark amber-slate app beneath.
 *  Phase 5 "done"      : Component fully unmounts; `onComplete()` is called.
 *
 * Tuning
 * ------
 *  STAGGER_S   — gap between each column starting its animation
 *  DURATION    — how long a single column takes to slide in or out
 *  Increase both to slow the staircase further.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  onComplete: () => void;
}

const NUM_COLS   = 12;
const STAGGER_S  = 0.07;           // 70 ms between columns (was 45 ms)
const DURATION   = 0.80;           // 800 ms per column slide (was 550 ms)
const AMBER      = "#ea580c";

// Total time for all columns to finish sliding: DURATION + (NUM_COLS-1)*STAGGER_S
const STAIRS_TOTAL = DURATION + (NUM_COLS - 1) * STAGGER_S; // ≈ 1.57 s

// Phase durations in milliseconds
const TEXT_FADE_IN_MS  = 1200;
const TEXT_HOLD_MS     =  700;
const STAIRS_IN_MS     = Math.ceil(STAIRS_TOTAL * 1000) + 80; // small buffer
const HOLD_MS          =  650;
const STAIRS_OUT_MS    = Math.ceil(STAIRS_TOTAL * 1000) + 200;

type Phase = "text" | "stairs-in" | "hold" | "stairs-out" | "done";

export default function DoubleStairsIntro({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("text");

  useEffect(() => {
    // Advance phases on a timer chain
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;
    let t4: ReturnType<typeof setTimeout>;

    t1 = setTimeout(() => {
      setPhase("stairs-in");
    }, TEXT_FADE_IN_MS + TEXT_HOLD_MS);

    t2 = setTimeout(() => {
      setPhase("hold");
    }, TEXT_FADE_IN_MS + TEXT_HOLD_MS + STAIRS_IN_MS);

    t3 = setTimeout(() => {
      setPhase("stairs-out");
    }, TEXT_FADE_IN_MS + TEXT_HOLD_MS + STAIRS_IN_MS + HOLD_MS);

    t4 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, TEXT_FADE_IN_MS + TEXT_HOLD_MS + STAIRS_IN_MS + HOLD_MS + STAIRS_OUT_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* ── Phase 1: White background with tagline ──────────────────── */}
      <AnimatePresence>
        {(phase === "text" || phase === "stairs-in") && (
          <motion.div
            key="white-bg"
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: "#ffffff" }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Tagline */}
            <motion.p
              className="text-4xl sm:text-5xl font-light tracking-tight text-center select-none"
              style={{
                color: "#111111",
                fontFamily: "var(--font-geist-sans), system-ui, serif",
                letterSpacing: "-0.02em",
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={
                phase === "text"
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: -10 }
              }
              transition={
                phase === "text"
                  ? { duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }
                  : { duration: 0.45, ease: "easeIn" }
              }
            >
              Steel decisions,{" "}
              <span style={{ fontStyle: "italic", color: "#374151" }}>
                made visible.
              </span>
            </motion.p>

            {/* Subtle amber underline that draws in after text */}
            <motion.div
              className="mt-6 h-[2px] rounded-full"
              style={{ background: AMBER }}
              initial={{ width: 0, opacity: 0 }}
              animate={
                phase === "text"
                  ? { width: 200, opacity: 1 }
                  : { width: 0,   opacity: 0 }
              }
              transition={
                phase === "text"
                  ? { duration: 0.9, delay: 0.5, ease: "easeOut" }
                  : { duration: 0.3, ease: "easeIn" }
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Staircase columns ───────────────────────────────────────── */}
      <div className="absolute inset-0 flex pointer-events-none">
        {Array.from({ length: NUM_COLS }, (_, i) => {
          const fromTop = i % 2 !== 0; // odd → from top, even → from bottom

          // "stairs-in"  → columns slide TO   y:0
          // "hold"       → columns stay at    y:0
          // "stairs-out" → columns slide BACK to start
          const targetY =
            phase === "stairs-in" || phase === "hold"
              ? "0%"
              : fromTop
              ? "-100%"
              : "100%";

          // Delay: for "stairs-in" cascade left→right;
          //        for "stairs-out" cascade right→left (reverse order)
          const delay =
            phase === "stairs-out"
              ? (NUM_COLS - 1 - i) * STAGGER_S
              : i * STAGGER_S;

          return (
            <motion.div
              key={i}
              className="flex-1 h-full"
              style={{ backgroundColor: "#0f0f11" }}
              initial={{ y: fromTop ? "-100%" : "100%" }}
              animate={{ y: targetY }}
              transition={{
                duration: DURATION,
                delay,
                ease: [0.76, 0, 0.24, 1],
              }}
            />
          );
        })}
      </div>

      {/* ── "hold" phase: GradeWise logo centred over the dark columns ── */}
      <AnimatePresence>
        {phase === "hold" && (
          <motion.div
            key="logo"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${AMBER}, #9a3412)`,
                boxShadow: `0 0 40px rgba(234,88,12,0.45)`,
              }}
            >
              GW
            </div>
            <h1 className="text-white text-2xl font-black tracking-tight">
              Grade<span style={{ color: AMBER }}>Wise</span>
            </h1>
            {/* Powered by badge */}
            <p className="absolute bottom-6 right-8 text-[10px] tracking-widest uppercase"
              style={{ color: "#52525b" }}>
              Powered by{" "}
              <span className="font-bold" style={{ color: AMBER }}>
                Jindal Stainless
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
