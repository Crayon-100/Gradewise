"use client";
/**
 * TensileVisualizer — 3-Stage Axial Pull SVG
 * ============================================
 * Shows a vertical steel specimen in a tensile test fixture.
 *
 * Three stages:
 *   Stage 1 — Elastic (0 → F_yield):  rod stretches linearly, can spring back
 *   Stage 2 — Plastic (F_yield → F_u): permanent deformation + visible necking
 *   Stage 3 — Fracture:               rod snaps with a rupture line
 *
 * The stage progress is driven by a percentage `loadFrac` prop that defaults
 * to showing the yield state (100 % elastic).
 */

import { motion } from "framer-motion";
import type { PhysicsNumbers } from "../lib/api";

interface Props {
  physics: PhysicsNumbers;
  gradeLabel: string;
  diameter_mm: number;
  length_mm: number;
}

const W = 300;
const H = 420;
const CX = 150;           // centre X
const SPEC_TOP = 60;      // specimen top Y (in fixture)
const SPEC_BOT = 330;     // specimen bottom Y (in fixture)
const SPEC_LEN = SPEC_BOT - SPEC_TOP;

export default function TensileVisualizer({
  physics,
  gradeLabel,
  diameter_mm,
  length_mm,
}: Props) {
  const yieldKg  = physics.yield_load_kg;
  const fracKg   = physics.fracture_load_kg;
  const stretchMm = physics.elastic_stretch_mm;
  const elongMm   = physics.total_elongation_mm;

  // Visual widths proportional to diameter (capped)
  const baseW = Math.max(12, Math.min(36, (diameter_mm / 100) * 40 + 8));
  const neckW = baseW * 0.62; // necking at centre (plastic zone proxy)

  // Bar outline path: slightly tapered at centre (necking)
  const midY = (SPEC_TOP + SPEC_BOT) / 2;
  const neckPath = `
    M ${CX - baseW / 2},${SPEC_TOP}
    Q ${CX - baseW / 2},${midY - 20} ${CX - neckW / 2},${midY}
    Q ${CX - baseW / 2},${midY + 20} ${CX - baseW / 2},${SPEC_BOT}
    L ${CX + baseW / 2},${SPEC_BOT}
    Q ${CX + baseW / 2},${midY + 20} ${CX + neckW / 2},${midY}
    Q ${CX + baseW / 2},${midY - 20} ${CX + baseW / 2},${SPEC_TOP}
    Z
  `;

  const straightPath = `
    M ${CX - baseW / 2},${SPEC_TOP}
    L ${CX - baseW / 2},${SPEC_BOT}
    L ${CX + baseW / 2},${SPEC_BOT}
    L ${CX + baseW / 2},${SPEC_TOP}
    Z
  `;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="rounded-xl">
        {/* ── Top fixture clamp ── */}
        <rect x={CX - 30} y={20} width={60} height={30} rx={4}
          fill="#334155" stroke="#475569" strokeWidth={1} />
        <line x1={CX} y1={0} x2={CX} y2={20} stroke="#475569" strokeWidth={3} />

        {/* ── Bottom fixture clamp + downward arrow ── */}
        <rect x={CX - 30} y={SPEC_BOT + 10} width={60} height={30} rx={4}
          fill="#334155" stroke="#475569" strokeWidth={1} />
        {/* Pull arrow */}
        <motion.g
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <line x1={CX} y1={SPEC_BOT + 40} x2={CX} y2={H - 20}
            stroke="#ea580c" strokeWidth={2.5} />
          <polygon
            points={`${CX},${H - 8} ${CX - 7},${H - 22} ${CX + 7},${H - 22}`}
            fill="#ea580c" />
        </motion.g>

        {/* ── Specimen ── */}
        {/* Ghost (straight) */}
        <path d={straightPath} fill="#1e2433" />

        {/* Animated necked bar */}
        <motion.path
          d={neckPath}
          fill="url(#steelGrad)"
          initial={{ opacity: 0, scaleY: 0.8 }}
          animate={{ opacity: 1, scaleY: 1 }}
          style={{ transformOrigin: `${CX}px ${midY}px` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="steelGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="40%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#93c5fd" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </linearGradient>
        </defs>

        {/* Neck highlight (stress concentration) */}
        <motion.ellipse
          cx={CX}
          cy={midY}
          rx={neckW / 2 + 2}
          ry={14}
          fill="rgba(234,88,12,0.18)"
          stroke="#ea580c"
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        />

        {/* ── Stage annotation lines ── */}
        {/* Yield line */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          <line x1={CX + baseW / 2 + 10} y1={SPEC_TOP} x2={CX + baseW / 2 + 60} y2={SPEC_TOP}
            stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
          <text x={CX + baseW / 2 + 65} y={SPEC_TOP + 4} fill="#94a3b8" fontSize={8} fontFamily="monospace">
            elastic limit
          </text>
          <text x={CX + baseW / 2 + 65} y={SPEC_TOP + 14} fill="#ea580c" fontSize={9} fontWeight={700} fontFamily="monospace">
            {yieldKg.toLocaleString()} kg
          </text>
        </motion.g>

        {/* Fracture line */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <line x1={CX + baseW / 2 + 10} y1={SPEC_BOT} x2={CX + baseW / 2 + 60} y2={SPEC_BOT}
            stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
          <text x={CX + baseW / 2 + 65} y={SPEC_BOT - 4} fill="#94a3b8" fontSize={8} fontFamily="monospace">
            fracture load
          </text>
          <text x={CX + baseW / 2 + 65} y={SPEC_BOT + 6} fill="#ef4444" fontSize={9} fontWeight={700} fontFamily="monospace">
            {fracKg.toLocaleString()} kg
          </text>
        </motion.g>

        {/* Stretch annotation */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
          <text x={CX - baseW / 2 - 16} y={(SPEC_TOP + SPEC_BOT) / 2 + 4}
            fill="#64748b" fontSize={8} textAnchor="middle"
            fontFamily="monospace"
            style={{ writingMode: "vertical-rl", transform: `rotate(180deg)`, transformOrigin: `${CX - baseW / 2 - 16}px ${midY}px` }}>
            ε = {stretchMm.toFixed(2)} mm
          </text>
        </motion.g>

        {/* Footer label */}
        <text x={CX} y={H - 4} textAnchor="middle" fill="#475569" fontSize={8}>
          Grade {gradeLabel} · Ø {diameter_mm} mm · L {length_mm} mm
        </text>
      </svg>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <MetricPill label="Yield Load" value={`${yieldKg.toLocaleString()} kg`} />
        <MetricPill label="Fracture Load" value={`${fracKg.toLocaleString()} kg`} />
        <MetricPill label="Elastic Stretch" value={`${stretchMm.toFixed(3)} mm`} />
        <MetricPill label="Total Elongation" value={`${elongMm.toFixed(1)} mm`} />
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
