"use client";

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-[24px] tracking-[1.5px] uppercase flex items-center gap-2 text-white">
          TENSILE STRAIN
        </h4>
      </div>

      <div className="relative border border-[#262626] bg-[#000000] p-6 flex items-center justify-center overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={260}>
          {/* ── Top fixture clamp ── */}
          <rect x={CX - 30} y={20} width={60} height={30}
            fill="#0d0d0d" stroke="#3a3a3a" strokeWidth={1} />
          <line x1={CX} y1={0} x2={CX} y2={20} stroke="#3a3a3a" strokeWidth={3} />

          {/* ── Bottom fixture clamp + downward arrow ── */}
          <rect x={CX - 30} y={SPEC_BOT + 10} width={60} height={30}
            fill="#0d0d0d" stroke="#3a3a3a" strokeWidth={1} />
          {/* Pull arrow */}
          <motion.g
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <line x1={CX} y1={SPEC_BOT + 40} x2={CX} y2={H - 20}
              stroke="#ffffff" strokeWidth={1.5} />
            <polygon
              points={`${CX},${H - 8} ${CX - 7},${H - 22} ${CX + 7},${H - 22}`}
              fill="#ffffff" />
          </motion.g>

          {/* ── Specimen ── */}
          {/* Ghost (straight) */}
          <path d={straightPath} fill="rgba(255,255,255,0.05)" />

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
              <stop offset="0%" stopColor="#3a3a3a" />
              <stop offset="40%" stopColor="#cccccc" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#cccccc" />
              <stop offset="100%" stopColor="#3a3a3a" />
            </linearGradient>
          </defs>

          {/* Neck highlight (stress concentration) */}
          <motion.ellipse
            cx={CX}
            cy={midY}
            rx={neckW / 2 + 2}
            ry={14}
            fill="transparent"
            stroke="#ffffff"
            strokeWidth={1}
            strokeDasharray="2,2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          />

          {/* ── Stage annotation lines ── */}
          {/* Yield line */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            <line x1={CX + baseW / 2 + 10} y1={SPEC_TOP} x2={CX + baseW / 2 + 60} y2={SPEC_TOP}
              stroke="#666666" strokeWidth={1} strokeDasharray="2,2" />
            <text x={CX + baseW / 2 + 65} y={SPEC_TOP + 4} fill="#666666" fontSize={8} className="font-mono uppercase tracking-[2px]">
              YIELD LIMIT
            </text>
            <text x={CX + baseW / 2 + 65} y={SPEC_TOP + 14} fill="#ffffff" fontSize={9} className="font-mono tracking-[1px]">
              {yieldKg.toLocaleString()} KG
            </text>
          </motion.g>

          {/* Fracture line */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            <line x1={CX + baseW / 2 + 10} y1={SPEC_BOT} x2={CX + baseW / 2 + 60} y2={SPEC_BOT}
              stroke="#666666" strokeWidth={1} strokeDasharray="2,2" />
            <text x={CX + baseW / 2 + 65} y={SPEC_BOT - 4} fill="#666666" fontSize={8} className="font-mono uppercase tracking-[2px]">
              FRACTURE
            </text>
            <text x={CX + baseW / 2 + 65} y={SPEC_BOT + 6} fill="#ffffff" fontSize={9} className="font-mono tracking-[1px]">
              {fracKg.toLocaleString()} KG
            </text>
          </motion.g>

          {/* Stretch annotation */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
            <text x={CX - baseW / 2 - 16} y={(SPEC_TOP + SPEC_BOT) / 2 + 4}
              fill="#999999" fontSize={8} textAnchor="middle"
              className="font-mono tracking-[1px]"
              style={{ writingMode: "vertical-rl", transform: `rotate(180deg)`, transformOrigin: `${CX - baseW / 2 - 16}px ${midY}px` }}>
              ε = {stretchMm.toFixed(2)} mm
            </text>
          </motion.g>
        </svg>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#262626]">
        <MetricPill label="YIELD LOAD" value={`${yieldKg.toLocaleString()} KG`} color="#cccccc" />
        <MetricPill label="FRACTURE LOAD" value={`${fracKg.toLocaleString()} KG`} color="#ffffff" />
        <MetricPill label="ELASTIC STRETCH" value={`${stretchMm.toFixed(3)} MM`} color="#cccccc" />
        <MetricPill label="ELONGATION" value={`${elongMm.toFixed(1)} MM`} color="#cccccc" />
      </div>
    </div>
  );
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[2px] uppercase text-[#666666] mb-1">
        {label}
      </div>
      <div className="font-mono text-[16px] tracking-[1px] uppercase" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
