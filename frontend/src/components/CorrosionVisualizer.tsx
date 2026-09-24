"use client";
/**
 * CorrosionVisualizer — Environmental Chamber Simulation
 * ========================================================
 * Simulates how each grade's surface degrades over time across 3 environments.
 *
 * Visual elements:
 *   • Dual-pane chamber layout with environment selector buttons
 *   • Time scrubber (Year 0 → 30)
 *   • Surface pitting simulation: pit dots scale in count and size with
 *     (years × aggressiveness / PREN)
 *   • Passive oxide film (Cr₂O₃) glow for high-PREN grades
 *   • PREN rating badge
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Wind, Waves } from "lucide-react";
import { GRADE_PREN } from "../lib/gradeData";

const ENVIRONMENTS = [
  {
    id: "indoor",
    label: "Indoor / Dry",
    icon: Wind,
    aggressiveness: 0.3,
    color: "#64748b",
    pitColor: "#b45309",
    description: "Controlled dry environment. Minimal corrosion risk.",
  },
  {
    id: "urban",
    label: "Urban / Industrial",
    icon: Droplets,
    aggressiveness: 1.0,
    color: "#f59e0b",
    pitColor: "#92400e",
    description: "Acid rain, sulfur compounds, pollutants.",
  },
  {
    id: "marine",
    label: "Coastal Marine",
    icon: Waves,
    aggressiveness: 2.5,
    color: "#3b82f6",
    pitColor: "#7c2d12",
    description: "Chloride-rich salt spray — most aggressive.",
  },
] as const;

type EnvId = typeof ENVIRONMENTS[number]["id"];

interface Props {
  gradeLabel: string;
  corrosionResistance: number;
}

// Deterministic pseudo-random pit positions seeded by grade
function generatePitSeeds(n: number, salt: number) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (salt * 9301 + i * 49297 + 233) % 1000;
    pts.push({ x: 10 + (t % 80), y: 10 + ((t * 7) % 80) });
  }
  return pts;
}

export default function CorrosionVisualizer({ gradeLabel, corrosionResistance }: Props) {
  const [env, setEnv] = useState<EnvId>("indoor");
  const [year, setYear] = useState(0);

  const activeEnv = ENVIRONMENTS.find((e) => e.id === env)!;
  const pren = GRADE_PREN[gradeLabel] ?? 18;

  // Damage index 0–1 (0 = pristine, 1 = severe pitting)
  const damage = Math.min(
    1,
    (year * activeEnv.aggressiveness) / (pren * 1.2)
  );

  // Number of pits visible
  const numPits = Math.floor(damage * 40);

  // Max pit radius in px
  const pitRadius = 1 + damage * 5;

  const pitSeeds = generatePitSeeds(40, gradeLabel.charCodeAt(0));

  // Oxide film: visible when PREN > 24 and damage < 0.6
  const showOxideFilm = pren >= 24 && damage < 0.6;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Environment selector ── */}
      <div className="flex gap-2">
        {ENVIRONMENTS.map((e) => {
          const Icon = e.icon;
          const active = env === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setEnv(e.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: active ? `${e.color}22` : "#1a1a20",
                border: `1px solid ${active ? e.color : "#2a2a35"}`,
                color: active ? e.color : "#64748b",
              }}
            >
              <Icon className="w-3 h-3" />
              {e.label}
            </button>
          );
        })}
      </div>

      {/* ── Chamber + Surface pane ── */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "#0c1018",
          border: "1px solid #1e2433",
          height: 220,
        }}
      >
        {/* Oxide film glow */}
        <AnimatePresence>
          {showOxideFilm && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.25) 0%, transparent 75%)",
              }}
            />
          )}
        </AnimatePresence>

        {/* Steel surface pattern */}
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Steel brushed texture lines */}
          {Array.from({ length: 14 }, (_, i) => (
            <line
              key={i}
              x1={0}
              y1={i * 7 + 3}
              x2={100}
              y2={i * 7 + 3}
              stroke="#1a2030"
              strokeWidth={0.5}
            />
          ))}

          {/* Corrosion pit dots */}
          {pitSeeds.slice(0, numPits).map((pt, idx) => (
            <motion.circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={pitRadius * (0.6 + (idx % 5) * 0.08)}
              fill={activeEnv.pitColor}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.7 + damage * 0.3 }}
              transition={{ duration: 0.3 }}
            />
          ))}

          {/* Oxide film indicator — green tint overlay */}
          {showOxideFilm && (
            <rect
              x={0} y={0} width={100} height={100}
              fill="rgba(16,185,129,0.06)"
            />
          )}
        </svg>

        {/* Overlay labels */}
        <div className="absolute top-3 left-4 flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
            Surface · Year {year}
          </span>
          {showOxideFilm && (
            <motion.span
              className="text-[8px] font-bold text-emerald-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✓ Cr₂O₃ Passive Film Active
            </motion.span>
          )}
          {damage > 0.6 && (
            <motion.span
              className="text-[8px] font-bold text-red-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ⚠ Significant Pitting Detected
            </motion.span>
          )}
        </div>

        {/* PREN badge */}
        <div
          className="absolute top-3 right-4 rounded-md px-2 py-1 text-[10px] font-black"
          style={{
            background: "rgba(0,0,0,0.6)",
            border: `1px solid ${pren >= 40 ? "#10b981" : pren >= 25 ? "#3b82f6" : "#f59e0b"}`,
            color: pren >= 40 ? "#10b981" : pren >= 25 ? "#3b82f6" : "#f59e0b",
          }}
        >
          PREN {pren}
        </div>
      </div>

      {/* ── Year scrubber ── */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>Year 0</span>
          <span className="font-bold text-amber-400">Year {year}</span>
          <span>Year 30</span>
        </div>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{ accentColor: "#ea580c" }}
        />
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500 text-center">
        {activeEnv.description}{" "}
        <span className="text-slate-400 font-medium">
          Grade {gradeLabel} corrosion resistance: {corrosionResistance}/5
        </span>
      </p>
    </div>
  );
}
