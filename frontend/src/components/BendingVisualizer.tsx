"use client";
/**
 * BendingVisualizer — Simply-Supported Beam with Adjustable Load
 * ================================================================
 * Physics: δ = FL³/(48EI) for a central point load.
 * Since deflection is linear in force (elastic range), we derive:
 *   δ(F) = δ_yield × (F / F_yield)
 * This avoids needing E and I directly and stays consistent with backend values.
 *
 * Realism:
 *   • Deflection is scaled to pixels at the TRUE same ratio as reality.
 *     1 mm deflection = (SPAN_PX / length_mm) pixels.
 *   • A 20mm rod over 1200mm at yield deflects ≈25mm → ~8px in the SVG.
 *     Steel is stiff — the visual correctly shows a subtle, realistic curve.
 *   • Color: neutral steel-grey below 70% yield, amber at 70-100%, red above.
 *   • Post-yield zone shown with dashed override beam + warning banner.
 *   • If δ/L > 5% (large-deflection regime), a notice is shown.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { PhysicsNumbers } from "../lib/api";

interface Props {
  physics: PhysicsNumbers;
  gradeLabel: string;
  diameter_mm: number;
  length_mm: number;
}

const W = 500;
const H = 260;
const BEAM_Y = 115;
const SUPPORT_H = 20;
const LEFT_X  = 55;
const RIGHT_X = 445;
const SPAN_PX = RIGHT_X - LEFT_X;   // 390 px

// Scale factor: how many SVG pixels represent 1 mm of real deflection
// We keep it proportional to the rod's own span.
const PX_PER_MM = (span_mm: number) => SPAN_PX / span_mm;

/** Clamp-free steel stress colour:
 *  0–70 % yield → steel grey, 70–100 % → amber, >100 % → red */
function stressColor(frac: number): string {
  if (frac <= 0) return "#64748b";
  if (frac < 0.70) {
    // grey → amber (linear lerp)
    const t = frac / 0.70;
    const r = Math.round(100 + t * (234 - 100));
    const g = Math.round(116 + t * (88  - 116));
    const b = Math.round(139 + t * (12  - 139));
    return `rgb(${r},${g},${b})`;
  }
  if (frac < 1.0) {
    const t = (frac - 0.70) / 0.30;
    const r = Math.round(234 + t * (239 - 234));
    const g = Math.round(88  + t * (68  - 88));
    const b = Math.round(12  + t * (68  - 12));
    return `rgb(${r},${g},${b})`;
  }
  return "#ef4444";  // post-yield red
}

export default function BendingVisualizer({ physics, gradeLabel, diameter_mm, length_mm }: Props) {
  const F_yield_kg = physics.bending_yield_load_kg;
  const δ_yield_mm = physics.deflection_at_yield_mm;

  // Slider max: a bit beyond yield so users can see the post-yield warning
  const sliderMax = Math.ceil(F_yield_kg * 1.5);

  // Default to ~30% of yield load as starting point (shows a visible but safe curve)
  const [appliedKg, setAppliedKg] = useState(() =>
    Math.round(F_yield_kg * 0.30)
  );

  // Physics: elastic deflection scales linearly with load
  const loadFrac  = appliedKg / F_yield_kg;           // 0 = no load, 1 = yield, >1 = post-yield
  const δ_mm      = δ_yield_mm * loadFrac;            // actual deflection in mm (elastic)
  const isPostYield    = loadFrac > 1.0;
  const isLargeDefl    = δ_mm > 0.05 * length_mm;    // > 5% of span (breaks small-defl assumption)
  const safetyFactor   = loadFrac > 0 ? (1 / loadFrac).toFixed(2) : "∞";

  // Pixel deflection — TRUE proportional scale (no artificial inflation)
  const pixPerMm = PX_PER_MM(length_mm);
  const δ_px_raw = δ_mm * pixPerMm;
  // Soft cap at 60px just to keep the SVG readable for extreme scenarios
  const δ_px     = Math.min(δ_px_raw, 60);

  const color     = useMemo(() => stressColor(loadFrac), [loadFrac]);
  const beamThick = Math.max(4, Math.min(18, (diameter_mm / 100) * 20 + 5));

  const midX = (LEFT_X + RIGHT_X) / 2;
  const defY = BEAM_Y + δ_px;

  // Analytical cubic Bezier for δ(x) = Fx(3L²−4x²)/(48EI):
  // Control points that give the correct parabolic-ish shape:
  // At x=0 and x=L the tangent is zero (slope = 0 at supports for symmetric load)
  const dPath = [
    `M ${LEFT_X},${BEAM_Y}`,
    `C ${LEFT_X  + SPAN_PX * 0.25},${BEAM_Y}`,
    `  ${midX    - SPAN_PX * 0.12},${defY}`,
    `  ${midX},${defY}`,
    `C ${midX    + SPAN_PX * 0.12},${defY}`,
    `  ${RIGHT_X - SPAN_PX * 0.25},${BEAM_Y}`,
    `  ${RIGHT_X},${BEAM_Y}`,
  ].join(" ");

  return (
    <div className="flex flex-col gap-4">

      {/* ── Weight slider ─────────────────────────────────────────── */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: "#1a1a20", border: "1px solid #2a2a35" }}
      >
        <div className="flex justify-between items-end mb-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Applied Load (Central Point)
          </label>
          <div className="flex items-baseline gap-1">
            <span className="font-mono font-black text-lg" style={{ color }}>
              {appliedKg.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">kg</span>
            <span
              className="ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{
                background: isPostYield ? "rgba(239,68,68,0.15)" : "rgba(234,88,12,0.12)",
                border: `1px solid ${isPostYield ? "#ef444466" : "#ea580c44"}`,
                color: isPostYield ? "#ef4444" : "#ea580c",
              }}
            >
              {(loadFrac * 100).toFixed(0)}% of yield
            </span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={Math.max(1, Math.round(sliderMax / 200))}
          value={appliedKg}
          onChange={(e) => setAppliedKg(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[9px] text-slate-600 mt-1">
          <span>0 kg</span>
          <span style={{ color: "#ea580c" }}>
            Yield: {F_yield_kg.toLocaleString()} kg
          </span>
          <span>{sliderMax.toLocaleString()} kg</span>
        </div>
      </div>

      {/* ── Warnings ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isPostYield && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold overflow-hidden"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Post-yield zone — permanent plastic deformation. Visual is linear extrapolation only.
          </motion.div>
        )}
        {isLargeDefl && !isPostYield && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold overflow-hidden"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Deflection &gt; 5% of span — entering large-deflection regime; beam theory approximation.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SVG Beam ─────────────────────────────────────────────── */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: "transparent" }}>
        <defs>
          {/* Gradient along beam to simulate bending stress distribution */}
          <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#475569" />
            <stop offset="50%"  stopColor={color} />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>

        {/* ── Supports ── */}
        {[LEFT_X, RIGHT_X].map((x) => (
          <g key={x}>
            <polygon
              points={`${x},${BEAM_Y + beamThick / 2} ${x - 11},${BEAM_Y + beamThick / 2 + SUPPORT_H} ${x + 11},${BEAM_Y + beamThick / 2 + SUPPORT_H}`}
              fill="#334155" stroke="#475569" strokeWidth={1}
            />
            <line
              x1={x - 15} y1={BEAM_Y + beamThick / 2 + SUPPORT_H}
              x2={x + 15} y2={BEAM_Y + beamThick / 2 + SUPPORT_H}
              stroke="#475569" strokeWidth={2.5}
            />
            {/* Ground hatching */}
            {[-10, -5, 0, 5, 10].map((offset) => (
              <line
                key={offset}
                x1={x + offset} y1={BEAM_Y + beamThick / 2 + SUPPORT_H}
                x2={x + offset - 4} y2={BEAM_Y + beamThick / 2 + SUPPORT_H + 5}
                stroke="#334155" strokeWidth={1}
              />
            ))}
          </g>
        ))}

        {/* ── Ghost (undeflected) beam ── */}
        <line
          x1={LEFT_X} y1={BEAM_Y} x2={RIGHT_X} y2={BEAM_Y}
          stroke="#1e293b" strokeWidth={beamThick} strokeLinecap="round"
          strokeDasharray={appliedKg > 0 ? "6,4" : "none"}
        />

        {/* ── Deflected beam ── */}
        <motion.path
          key={`beam-${gradeLabel}-${length_mm}`}
          d={dPath}
          fill="none"
          stroke="url(#beamGrad)"
          strokeWidth={beamThick}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            filter: loadFrac > 0.5
              ? `drop-shadow(0 0 ${4 + loadFrac * 6}px ${color}66)`
              : "none",
          }}
        />

        {/* ── Load arrow (only when load > 0) ── */}
        {appliedKg > 0 && (
          <g>
            {/* Arrow shaft — length proportional to load fraction */}
            <line
              x1={midX} y1={BEAM_Y - 12 - Math.min(50, loadFrac * 50)}
              x2={midX} y2={BEAM_Y - beamThick / 2 - 2}
              stroke={color} strokeWidth={2.5}
            />
            <polygon
              points={`${midX},${BEAM_Y - beamThick / 2} ${midX - 6},${BEAM_Y - beamThick / 2 - 10} ${midX + 6},${BEAM_Y - beamThick / 2 - 10}`}
              fill={color}
            />
            {/* Load label */}
            <text
              x={midX} y={BEAM_Y - 16 - Math.min(50, loadFrac * 50)}
              textAnchor="middle" fill={color}
              fontSize={11} fontWeight={700} fontFamily="monospace"
            >
              {appliedKg.toLocaleString()} kg
            </text>
          </g>
        )}

        {/* ── Deflection dimension annotation ── */}
        {δ_px > 1 && (
          <g>
            {/* Tick at beam centreline level */}
            <line x1={midX + SPAN_PX * 0.32} y1={BEAM_Y}
                  x2={midX + SPAN_PX * 0.36} y2={BEAM_Y}
                  stroke="#475569" strokeWidth={1} />
            {/* Tick at deflected level */}
            <line x1={midX + SPAN_PX * 0.32} y1={defY}
                  x2={midX + SPAN_PX * 0.36} y2={defY}
                  stroke="#475569" strokeWidth={1} />
            {/* Vertical dimension line */}
            <line x1={midX + SPAN_PX * 0.34} y1={BEAM_Y}
                  x2={midX + SPAN_PX * 0.34} y2={defY}
                  stroke="#475569" strokeWidth={0.8} strokeDasharray="2,2" />
            {/* Label */}
            <text
              x={midX + SPAN_PX * 0.36 + 4} y={(BEAM_Y + defY) / 2 + 3}
              fill="#94a3b8" fontSize={8.5} fontFamily="monospace"
            >
              δ = {δ_mm.toFixed(2)} mm
            </text>
          </g>
        )}

        {/* ── Span label ── */}
        <text x={midX} y={H - 8} textAnchor="middle" fill="#475569" fontSize={8}>
          Span: {length_mm} mm · {diameter_mm}mm {"\u00D8"} · Grade {gradeLabel}
        </text>
      </svg>

      {/* ── Metrics row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        <MetricPill
          label="Deflection"
          value={`${δ_mm.toFixed(2)} mm`}
          highlight={isPostYield}
        />
        <MetricPill
          label="Load / Yield"
          value={`${(loadFrac * 100).toFixed(1)}%`}
          highlight={isPostYield}
        />
        <MetricPill
          label="Safety Factor"
          value={safetyFactor === "∞" ? "∞" : `${safetyFactor}×`}
        />
        <MetricPill
          label="Yield Load"
          value={`${F_yield_kg.toLocaleString()} kg`}
        />
      </div>
    </div>
  );
}

function MetricPill({
  label, value, highlight = false,
}: {
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="bg-[#1a1a20] border border-[#2a2a35] rounded-lg p-2.5 text-center">
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className="font-mono font-bold text-sm"
        style={{ color: highlight ? "#ef4444" : "#f59e0b" }}
      >
        {value}
      </div>
    </div>
  );
}
