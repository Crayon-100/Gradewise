"use client";
/**
 * CorrosionVisualizer — Realistic Surface Degradation Simulation
 * ===============================================================
 *
 * Visual layers (top → bottom):
 *  1. Steel base gradient  — polished silver → tarnished brown based on damage
 *  2. Brushed-metal texture — fine horizontal lines
 *  3. Oxide / tarnish zones — brownish rounded patches that spread with time
 *  4. Individual pits       — radial gradient: dark core → rust ring → rust halo
 *  5. Salt deposits         — marine env only: tiny white crystals
 *  6. Cr₂O₃ passive film   — green shimmer layer for high-PREN, fades as it breaks down
 *
 * Cross-section strip (below surface):
 *  Shows a horizontal slice of the bar.
 *  Pits appear as SVG arc-shaped indentations into the steel body.
 *  Depth scale annotated in µm.
 *
 * Metrics:
 *  • Pit depth (µm)          — estimated from PREN and environment
 *  • Corrosion rate (µm/yr)  — environment + PREN derived
 *  • Passive film status     — OK / Weakening / Broken
 *  • Est. service life       — rough estimate before significant maintenance
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Wind, Waves } from "lucide-react";
import { GRADE_PREN } from "../lib/gradeData";

const ENVIRONMENTS = [
  {
    id: "indoor",
    label: "Indoor / Dry",
    icon: Wind,
    aggressiveness: 0.25,
    baseRateUmYr: 0.5,          // µm/year base corrosion rate
    color: "#64748b",
    description: "Controlled dry environment — ISO C1 corrosivity category.",
  },
  {
    id: "urban",
    label: "Urban / Industrial",
    icon: Droplets,
    aggressiveness: 1.1,
    baseRateUmYr: 8,
    color: "#f59e0b",
    description: "Acid rain, SO₂, NOₓ pollution — ISO C3/C4 category.",
  },
  {
    id: "marine",
    label: "Coastal Marine",
    icon: Waves,
    aggressiveness: 2.8,
    baseRateUmYr: 25,
    color: "#3b82f6",
    description: "Chloride-rich salt spray — ISO C5-M (most aggressive).",
  },
] as const;

type EnvId = typeof ENVIRONMENTS[number]["id"];

interface Props {
  gradeLabel: string;
  corrosionResistance: number;
}

// Deterministic pseudo-random positions for pits and tarnish zones
function lcg(seed: number, n: number): { x: number; y: number; size: number }[] {
  let s = seed;
  const out = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const x = 3 + ((s >>> 16) % 94);
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const y = 3 + ((s >>> 8)  % 94);
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const size = 1.5 + ((s >>> 20) % 6);
    out.push({ x, y, size });
  }
  return out;
}

/** Interpolate between two hex colours (simple linear lerp in RGB) */
function lerpColor(a: string, b: string, t: number): string {
  const parse = (c: string) => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ];
  const ca = parse(a), cb = parse(b);
  const r = Math.round(ca[0] + t * (cb[0] - ca[0]));
  const g = Math.round(ca[1] + t * (cb[1] - ca[1]));
  const bl = Math.round(ca[2] + t * (cb[2] - ca[2]));
  return `rgb(${r},${g},${bl})`;
}

export default function CorrosionVisualizer({ gradeLabel, corrosionResistance }: Props) {
  const [env, setEnv]   = useState<EnvId>("indoor");
  const [year, setYear] = useState(0);

  const activeEnv = ENVIRONMENTS.find((e) => e.id === env)!;
  const pren      = GRADE_PREN[gradeLabel] ?? 18;

  // ── Core damage model ────────────────────────────────────────────────────
  // Higher PREN slows initiation; CR (1–5) scales overall resistance
  const prenFactor    = Math.max(0.1, pren / 35);           // normalised resistance
  const damage        = Math.min(1, (year * activeEnv.aggressiveness) / (prenFactor * 35));
  const filmIntact    = damage < 0.25;
  const filmWeakened  = damage >= 0.25 && damage < 0.60;
  const filmBroken    = damage >= 0.60;

  // Corrosion rate in µm/year (simplified — affected by PREN and environment)
  const corrRateUmYr  = Math.max(0.1,
    (activeEnv.baseRateUmYr / prenFactor) * (filmBroken ? 1.8 : filmWeakened ? 1.2 : 0.4)
  );
  const pitDepthUm    = Math.min(2000, corrRateUmYr * year);   // µm
  const pitDepthMm    = pitDepthUm / 1000;

  // Est. service life: years until damage = 0.6 (passive film breaks down)
  const estLifeYears  = Math.round((prenFactor * 35 * 0.60) / activeEnv.aggressiveness);

  // Number of visible pits (increases with damage, limited by PREN)
  const numPits       = Math.floor(damage * 48);
  const numTarnish    = Math.floor(damage * 16);
  const showFilm      = pren >= 20 && !filmBroken;

  // Pit pixel depth in the cross-section (max ~18px visual)
  const pitDepthPx    = Math.min(18, damage * 22);

  // Base steel colour transitions: polished (#b8bcc2) → tarnish (#7a6e62) → rust (#6b3a1f)
  const steelBase = useMemo(() => {
    if (damage < 0.35) return lerpColor("#a0a4aa", "#7a6e62", damage / 0.35);
    return lerpColor("#7a6e62", "#6b3a1f", (damage - 0.35) / 0.65);
  }, [damage]);

  const pitSeeds     = useMemo(() => lcg(gradeLabel.charCodeAt(0) + gradeLabel.length * 31, 48), [gradeLabel]);
  const tarnishSeeds = useMemo(() => lcg(gradeLabel.charCodeAt(0) * 7 + 13, 16), [gradeLabel]);

  // Cross-section pit positions (evenly spread, visible ones only)
  const xSectionPits = pitSeeds.slice(0, Math.min(numPits, 18)).map((p, i) => ({
    xPct: 5 + (i / 17) * 90,   // evenly spaced across width
    depth: pitDepthPx * (0.5 + (p.size / 7) * 0.5),
  }));

  const filmStatusColor = filmBroken ? "#ef4444" : filmWeakened ? "#f59e0b" : "#10b981";
  const filmStatusText  = filmBroken ? "Broken" : filmWeakened ? "Weakening" : "Intact";

  return (
    <div className="flex flex-col gap-3">

      {/* ── Environment selector ── */}
      <div className="flex gap-2">
        {ENVIRONMENTS.map((e) => {
          const Icon   = e.icon;
          const active = env === e.id;
          return (
            <button
              key={e.id}
              onClick={() => { setEnv(e.id); setYear(0); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: active ? `${e.color}18` : "#1a1a20",
                border: `1px solid ${active ? e.color : "#2a2a35"}`,
                color: active ? e.color : "#52525b",
              }}
            >
              <Icon className="w-3 h-3" />
              {e.label}
            </button>
          );
        })}
      </div>

      {/* ── Surface view ────────────────────────────────────────────── */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ height: 180, border: "1px solid #2a2a35" }}
      >
        <svg
          viewBox="0 0 100 100"
          width="100%" height="100%"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Steel surface base gradient (silver → rust) */}
            <linearGradient id="steelBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={steelBase} stopOpacity={1} />
              <stop offset="100%" stopColor={lerpColor(steelBase, "#2a1a0a", 0.35)} stopOpacity={1} />
            </linearGradient>

            {/* Pit radial gradient: dark core → rust ring → rust halo */}
            <radialGradient id="pitGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#100800" stopOpacity={0.95} />
              <stop offset="35%"  stopColor="#5c2000" stopOpacity={0.85} />
              <stop offset="70%"  stopColor={env === "marine" ? "#8B3A12" : "#7a3010"} stopOpacity={0.6} />
              <stop offset="100%" stopColor={env === "marine" ? "#a0522d" : "#8B4513"} stopOpacity={0} />
            </radialGradient>

            {/* Passive film shimmer */}
            <linearGradient id="filmGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="rgba(16,185,129,0.18)" />
              <stop offset="50%"  stopColor="rgba(52,211,153,0.08)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0.14)" />
            </linearGradient>
          </defs>

          {/* Base surface */}
          <rect x={0} y={0} width={100} height={100} fill="url(#steelBase)" />

          {/* Brushed-metal horizontal grain lines */}
          {Array.from({ length: 22 }, (_, i) => (
            <line
              key={i}
              x1={0} y1={i * 4.8 + 1}
              x2={100} y2={i * 4.8 + 1}
              stroke="rgba(255,255,255,0.045)" strokeWidth={0.6}
            />
          ))}
          {/* Darker micro-grooves between grain */}
          {Array.from({ length: 11 }, (_, i) => (
            <line
              key={`g${i}`}
              x1={0} y1={i * 9.2 + 5}
              x2={100} y2={i * 9.2 + 5}
              stroke="rgba(0,0,0,0.12)" strokeWidth={0.4}
            />
          ))}

          {/* Oxide / tarnish patches (spread before full pitting) */}
          {tarnishSeeds.slice(0, numTarnish).map((p, i) => (
            <ellipse
              key={`t${i}`}
              cx={p.x} cy={p.y}
              rx={p.size * 2.5 * (1 + damage * 0.8)}
              ry={p.size * 1.5 * (1 + damage * 0.8)}
              fill={env === "marine" ? "rgba(101,60,30,0.35)" : "rgba(80,50,20,0.28)"}
            />
          ))}

          {/* Pits with realistic radial gradient */}
          {pitSeeds.slice(0, numPits).map((p, i) => {
            const r = p.size * 0.55 * (1 + damage * 0.6);
            const haloR = r * 2.2;
            return (
              <g key={`pit${i}`}>
                {/* Rust halo (staining around pit) */}
                <circle cx={p.x} cy={p.y} r={haloR}
                  fill={env === "marine" ? "rgba(139,69,19,0.22)" : "rgba(101,50,15,0.18)"} />
                {/* Pit itself */}
                <circle cx={p.x} cy={p.y} r={r} fill="url(#pitGrad)" />
              </g>
            );
          })}

          {/* Marine-only: salt crystal deposits */}
          {env === "marine" && damage > 0.15 && pitSeeds.slice(0, Math.floor(damage * 20)).map((p, i) => (
            <rect
              key={`salt${i}`}
              x={p.x + p.size * 0.3} y={p.y - p.size * 0.2}
              width={0.8 + damage} height={0.5 + damage * 0.5}
              fill="rgba(220,230,240,0.45)" rx={0.2}
              transform={`rotate(${(p.size * 37) % 60 - 30}, ${p.x}, ${p.y})`}
            />
          ))}

          {/* Passive Cr₂O₃ film (vanishes as film breaks down) */}
          {showFilm && (
            <rect x={0} y={0} width={100} height={100}
              fill="url(#filmGrad)"
              opacity={filmWeakened ? 0.4 : 0.85}
            />
          )}
        </svg>

        {/* Overlay labels */}
        <div className="absolute top-2.5 left-3 flex flex-col gap-0.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Surface — Year {year}
          </span>
          <AnimatePresence mode="wait">
            {showFilm && (
              <motion.span key="film"
                className="text-[8px] font-bold"
                style={{ color: filmStatusColor }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                ● Cr₂O₃ film: {filmStatusText}
              </motion.span>
            )}
            {filmBroken && (
              <motion.span key="broken"
                className="text-[8px] font-bold text-red-400"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                ⚠ Passive film failed — active corrosion
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* PREN + environment badge */}
        <div className="absolute top-2.5 right-3 flex flex-col items-end gap-1">
          <div
            className="rounded-md px-2 py-0.5 text-[9px] font-black"
            style={{
              background: "rgba(0,0,0,0.55)",
              border: `1px solid ${pren >= 40 ? "#10b981" : pren >= 25 ? "#3b82f6" : "#f59e0b"}`,
              color: pren >= 40 ? "#10b981" : pren >= 25 ? "#3b82f6" : "#f59e0b",
            }}
          >
            PREN {pren}
          </div>
          <div
            className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.4)", color: activeEnv.color }}
          >
            {activeEnv.label}
          </div>
        </div>
      </div>

      {/* ── Cross-section view ──────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #2a2a35", background: "#0f1118" }}
      >
        <div className="px-3 pt-2 pb-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
            Cross-Section — Pit Depth Profile
          </span>
        </div>
        <svg viewBox="0 0 100 32" width="100%" height={60} preserveAspectRatio="none">
          <defs>
            <linearGradient id="xsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={lerpColor("#8a9bb0", "#5a3010", Math.min(1, damage * 1.2))} />
              <stop offset="100%" stopColor="#2a3444" />
            </linearGradient>
          </defs>

          {/* Steel body */}
          <rect x={0} y={0} width={100} height={32} fill="url(#xsGrad)" />

          {/* Top surface line */}
          <line x1={0} y1={0.5} x2={100} y2={0.5}
            stroke={lerpColor("#c0c0c0", "#8B4513", damage)} strokeWidth={0.6} />

          {/* Pit indentations as rounded arcs into the steel */}
          {xSectionPits.map((pit, i) => {
            const px = pit.xPct;
            const d  = pit.depth;
            if (d < 0.5) return null;
            const w = 2.5 + d * 0.4;
            return (
              <g key={i}>
                {/* Pit cavity */}
                <path
                  d={`M ${px - w},0 Q ${px},${d} ${px + w},0 Z`}
                  fill="#100800"
                />
                {/* Rust rim */}
                <path
                  d={`M ${px - w - 0.5},0 Q ${px},${d + 0.5} ${px + w + 0.5},0`}
                  fill="none" stroke="#8B4513" strokeWidth={0.4}
                />
              </g>
            );
          })}

          {/* Depth scale arrow (right side) */}
          {pitDepthPx > 1 && (
            <g>
              <line x1={97} y1={0} x2={97} y2={Math.min(pitDepthPx, 18)}
                stroke="#64748b" strokeWidth={0.5} strokeDasharray="1,1" />
              <text x={88} y={Math.min(pitDepthPx, 18) / 2 + 2.5}
                fill="#64748b" fontSize={3.5} textAnchor="middle">
                {pitDepthUm > 999 ? `${pitDepthMm.toFixed(2)} mm` : `${Math.round(pitDepthUm)} µm`}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* ── Year scrubber ── */}
      <div>
        <div className="flex justify-between text-[9px] mb-1" style={{ color: "#52525b" }}>
          <span>Year 0</span>
          <span className="font-bold" style={{ color: "#ea580c" }}>Year {year}</span>
          <span>Year 30</span>
        </div>
        <input
          type="range" min={0} max={30} step={1} value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* ── Metrics grid ── */}
      <div className="grid grid-cols-4 gap-2">
        <MetricPill
          label="Pit Depth"
          value={pitDepthUm > 999 ? `${pitDepthMm.toFixed(2)} mm` : `${Math.round(pitDepthUm)} µm`}
          color={damage > 0.6 ? "#ef4444" : "#f59e0b"}
        />
        <MetricPill
          label="Corr. Rate"
          value={`${corrRateUmYr.toFixed(1)} µm/yr`}
          color="#f59e0b"
        />
        <MetricPill
          label="Passive Film"
          value={filmStatusText}
          color={filmStatusColor}
        />
        <MetricPill
          label="Est. Life"
          value={`~${estLifeYears} yr`}
          color="#10b981"
        />
      </div>

      {/* Environment note */}
      <p className="text-[10px] text-slate-600 text-center leading-relaxed">
        {activeEnv.description}&nbsp;
        Grade {gradeLabel} · CR {corrosionResistance}/5 · PREN {pren}
      </p>
    </div>
  );
}

function MetricPill({
  label, value, color,
}: {
  label: string; value: string; color: string;
}) {
  return (
    <div className="bg-[#1a1a20] border border-[#2a2a35] rounded-lg p-2 text-center">
      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="font-mono font-bold text-xs" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
