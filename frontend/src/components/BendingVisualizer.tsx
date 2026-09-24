"use client";
/**
 * BendingVisualizer — 3-Point Simply-Supported Beam SVG
 * =======================================================
 * Draws a horizontal steel bar between two knife-edge supports.
 * A central downward force arrow represents the applied load.
 * The deflected shape is a cubic Bezier that matches the analytical
 * deflection δ(x) = Fx(3L²−4x²) / (48EI) for a central point load.
 *
 * The beam colour shifts from cool steel-blue → amber → red as the
 * applied load approaches the yield load (stress heatmap proxy).
 */

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PhysicsNumbers } from "../lib/api";

interface Props {
  physics: PhysicsNumbers;
  gradeLabel: string;
  diameter_mm: number;
  length_mm: number;
}

const W = 500;
const H = 240;
const BEAM_Y = 110;          // Y of the undeflected beam centreline
const SUPPORT_H = 22;
const LEFT_X = 60;
const RIGHT_X = 440;
const SPAN_PX = RIGHT_X - LEFT_X;

/** Map 0→1 load fraction to a colour (blue → amber → red) */
function loadColor(frac: number) {
  // Three-stop: 0 = #3b82f6, 0.5 = #ea580c, 1 = #ef4444
  if (frac < 0.5) {
    const t = frac * 2;
    const r = Math.round(59 + t * (234 - 59));
    const g = Math.round(130 + t * (88 - 130));
    const b = Math.round(246 + t * (12 - 246));
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (frac - 0.5) * 2;
    const r = Math.round(234 + t * (239 - 234));
    const g = Math.round(88 + t * (68 - 88));
    const b = Math.round(12 + t * (68 - 12));
    return `rgb(${r},${g},${b})`;
  }
}

export default function BendingVisualizer({
  physics,
  gradeLabel,
  diameter_mm,
  length_mm,
}: Props) {
  // Display load = yield load (we show the "at first yield" scenario)
  const yieldLoad = physics.bending_yield_load_kg;
  const deflection = physics.deflection_at_yield_mm;

  // Scale deflection to pixels (cap at 55 px for dramatic but readable visual)
  const deflPx = Math.min(55, (deflection / length_mm) * SPAN_PX * 1.5 + 8);

  const loadFrac = Math.min(1, deflPx / 55); // 0 → 1
  const beamColor = useMemo(() => loadColor(loadFrac), [loadFrac]);

  // Beam thickness scales with diameter (min 4 px, max 20 px)
  const beamThick = Math.max(4, Math.min(20, (diameter_mm / 100) * 22 + 4));

  // Cubic Bezier control points for the deflected shape
  // At the centre, y offset = deflPx; at the ends, slope = 0 (roller supports)
  const midX = (LEFT_X + RIGHT_X) / 2;
  const defY = BEAM_Y + deflPx;

  const dPath = `M ${LEFT_X},${BEAM_Y}
    C ${LEFT_X + SPAN_PX * 0.33},${BEAM_Y} ${midX - 30},${defY} ${midX},${defY}
    C ${midX + 30},${defY} ${RIGHT_X - SPAN_PX * 0.33},${BEAM_Y} ${RIGHT_X},${BEAM_Y}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="rounded-xl"
        style={{ background: "transparent" }}
      >
        {/* ── Supports (triangles) ── */}
        {[LEFT_X, RIGHT_X].map((x) => (
          <g key={x}>
            <polygon
              points={`${x},${BEAM_Y + beamThick / 2} ${x - 12},${BEAM_Y + beamThick / 2 + SUPPORT_H} ${x + 12},${BEAM_Y + beamThick / 2 + SUPPORT_H}`}
              fill="#334155"
              stroke="#475569"
              strokeWidth={1}
            />
            {/* Hatch ground line */}
            <line
              x1={x - 16}
              y1={BEAM_Y + beamThick / 2 + SUPPORT_H}
              x2={x + 16}
              y2={BEAM_Y + beamThick / 2 + SUPPORT_H}
              stroke="#475569"
              strokeWidth={2}
            />
          </g>
        ))}

        {/* ── Undeflected ghost beam ── */}
        <line
          x1={LEFT_X}
          y1={BEAM_Y}
          x2={RIGHT_X}
          y2={BEAM_Y}
          stroke="#1e293b"
          strokeWidth={beamThick}
          strokeLinecap="round"
        />

        {/* ── Deflected beam (animated) ── */}
        <motion.path
          d={dPath}
          fill="none"
          stroke={beamColor}
          strokeWidth={beamThick}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${beamColor}88)` }}
        />

        {/* ── Load arrow ── */}
        <motion.g
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          {/* Arrow shaft */}
          <line
            x1={midX}
            y1={BEAM_Y - 60}
            x2={midX}
            y2={BEAM_Y - beamThick / 2 - 4}
            stroke="#ea580c"
            strokeWidth={2.5}
          />
          {/* Arrowhead */}
          <polygon
            points={`${midX},${BEAM_Y - beamThick / 2} ${midX - 7},${BEAM_Y - beamThick / 2 - 12} ${midX + 7},${BEAM_Y - beamThick / 2 - 12}`}
            fill="#ea580c"
          />
          {/* Load value label */}
          <text
            x={midX}
            y={BEAM_Y - 70}
            textAnchor="middle"
            fill="#ea580c"
            fontSize={11}
            fontWeight={700}
            fontFamily="monospace"
          >
            {yieldLoad.toLocaleString()} kg
          </text>
          <text
            x={midX}
            y={BEAM_Y - 58}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={8}
            fontFamily="inherit"
          >
            max load before yield
          </text>
        </motion.g>

        {/* ── Deflection annotation ── */}
        <AnimatePresence>
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.4 }}
          >
            {/* Vertical dimension line */}
            <line
              x1={midX + 30}
              y1={BEAM_Y}
              x2={midX + 30}
              y2={defY}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="3,2"
            />
            <text
              x={midX + 38}
              y={(BEAM_Y + defY) / 2 + 4}
              fill="#64748b"
              fontSize={8.5}
              fontFamily="monospace"
            >
              δ = {deflection.toFixed(2)} mm
            </text>
          </motion.g>
        </AnimatePresence>

        {/* ── Length dimension ── */}
        <text x={midX} y={H - 10} textAnchor="middle" fill="#475569" fontSize={8.5}>
          Span: {length_mm} mm · Ø {diameter_mm} mm · Grade {gradeLabel}
        </text>
      </svg>

      {/* Key bending metrics row */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <MetricPill label="Yield Load" value={`${yieldLoad.toLocaleString()} kg`} />
        <MetricPill label="Deflection at Yield" value={`${deflection.toFixed(3)} mm`} />
        <MetricPill label="Section Modulus Z" value={`${physics.section_modulus_mm3.toFixed(1)} mm³`} />
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1a1a20] border border-[#2a2a35] rounded-lg p-3 text-center">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="font-mono font-bold text-amber-400 text-sm">{value}</div>
    </div>
  );
}
