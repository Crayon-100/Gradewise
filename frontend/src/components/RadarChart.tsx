"use client";
/**
 * RadarChart — Animated Multi-Grade Spider Chart
 * ================================================
 * A pure-SVG radar/spider chart that overlays polygon webs for 2-3 grades.
 *
 * Five axes (all normalised 0 → 100):
 *   1. Mechanical Strength  — yield strength relative to max in portfolio
 *   2. Corrosion Resistance — direct from grade.corrosion_resistance (1–5)
 *   3. Cost Efficiency      — inverse of cost_tier (lower price = higher score)
 *   4. Workability          — formability (1–5)
 *   5. Thermal Endurance    — max_service_temp_c (350–1100 °C range)
 *
 * Animation: polygons draw in from the centre via SVG stroke-dashoffset.
 */
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { GradeRecommendation } from "../lib/api";
import { radarScores } from "../lib/physics";

const AXES = [
  "Strength",
  "Corrosion",
  "Cost Value",
  "Workability",
  "Thermal",
];

const NUM_RINGS = 4; // concentric reference rings
const CHART_R = 100; // radius in SVG units
const CX = 130; // cx of the chart
const CY = 130; // cy of the chart
const VIEW = 260; // viewBox size

// Colors for up to 3 grades
const PALETTE = [
  { stroke: "#ea580c", fill: "rgba(234,88,12,0.15)" },     // amber
  { stroke: "#3b82f6", fill: "rgba(59,130,246,0.12)" },    // steel blue
  { stroke: "#10b981", fill: "rgba(16,185,129,0.12)" },    // emerald
];

/** Convert a 5-element score array to SVG polygon points */
function toPoints(scores: number[], r: number, cx: number, cy: number): string {
  return scores
    .map((score, i) => {
      const angle = (2 * Math.PI * i) / scores.length - Math.PI / 2;
      const val = (score / 100) * r;
      return `${cx + val * Math.cos(angle)},${cy + val * Math.sin(angle)}`;
    })
    .join(" ");
}

/** Axis label position (slightly outside the chart radius) */
function axisLabelPos(
  idx: number,
  count: number,
  r: number,
  cx: number,
  cy: number
) {
  const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
  const dist = r + 18;
  return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
}

interface Props {
  grades: GradeRecommendation[];
}

export default function RadarChart({ grades }: Props) {
  const polyRefs = useRef<(SVGPolygonElement | null)[]>([]);

  // Animate stroke-dashoffset on mount
  useEffect(() => {
    polyRefs.current.forEach((el) => {
      if (!el) return;
      const len = el.getTotalLength?.() ?? 500;
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
      // Trigger animation via a tiny delay
      requestAnimationFrame(() => {
        el.style.transition = "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)";
        el.style.strokeDashoffset = "0";
      });
    });
  }, [grades]);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
        Grade Comparison
      </h3>

      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width="100%"
        className="max-w-[280px]"
      >
        {/* ── Reference rings ── */}
        {Array.from({ length: NUM_RINGS }, (_, ring) => {
          const r = (CHART_R * (ring + 1)) / NUM_RINGS;
          const pts = Array.from({ length: AXES.length }, (__, i) => {
            const angle = (2 * Math.PI * i) / AXES.length - Math.PI / 2;
            return `${CX + r * Math.cos(angle)},${CY + r * Math.sin(angle)}`;
          }).join(" ");
          return (
            <polygon
              key={ring}
              points={pts}
              fill="none"
              stroke="#2a2a32"
              strokeWidth={ring === NUM_RINGS - 1 ? 1.5 : 0.8}
            />
          );
        })}

        {/* ── Axis spokes ── */}
        {AXES.map((_, i) => {
          const angle = (2 * Math.PI * i) / AXES.length - Math.PI / 2;
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={CX + CHART_R * Math.cos(angle)}
              y2={CY + CHART_R * Math.sin(angle)}
              stroke="#2a2a32"
              strokeWidth={0.8}
            />
          );
        })}

        {/* ── Axis labels ── */}
        {AXES.map((label, i) => {
          const { x, y } = axisLabelPos(i, AXES.length, CHART_R, CX, CY);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={7.5}
              fontWeight={600}
              fill="#94a3b8"
              fontFamily="inherit"
            >
              {label}
            </text>
          );
        })}

        {/* ── Grade polygons ── */}
        {grades.map((grade, gi) => {
          const scores = radarScores(grade);
          const pts = toPoints(scores, CHART_R, CX, CY);
          const color = PALETTE[gi % PALETTE.length];
          return (
            <g key={grade.grade}>
              {/* Filled polygon — animate opacity */}
              <motion.polygon
                points={pts}
                fill={color.fill}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: gi * 0.2 }}
              />
              {/* Outlined polygon — stroke-dashoffset animation via ref */}
              <polygon
                ref={(el) => { polyRefs.current[gi] = el; }}
                points={pts}
                fill="none"
                stroke={color.stroke}
                strokeWidth={2}
              />
              {/* Score nodes */}
              {radarScores(grade).map((score, ai) => {
                const angle = (2 * Math.PI * ai) / AXES.length - Math.PI / 2;
                const val = (score / 100) * CHART_R;
                return (
                  <motion.circle
                    key={ai}
                    cx={CX + val * Math.cos(angle)}
                    cy={CY + val * Math.sin(angle)}
                    r={3.5}
                    fill={color.stroke}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8 + gi * 0.15 + ai * 0.05 }}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 justify-center">
        {grades.map((grade, gi) => {
          const color = PALETTE[gi % PALETTE.length];
          return (
            <div key={grade.grade} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ background: color.stroke }}
              />
              <span className="text-xs text-slate-400 font-semibold">
                Grade {grade.grade}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
