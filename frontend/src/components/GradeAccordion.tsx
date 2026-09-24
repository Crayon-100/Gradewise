"use client";
/**
 * GradeAccordion — Horizontal Expanding Panel Showcase
 * ======================================================
 * Each recommended grade is a vertical panel.
 *   • Collapsed state: narrow strip (~88 px) with rotated grade name + photo peek
 *   • Hovered / active: expands to flex-[4] revealing photo, AI text, and key stats
 * Only one panel is "active" at a time; clicking a panel selects it for the
 * live visualizer and sets it as the focus in the parent state.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Shield, Flame, Wrench } from "lucide-react";
import type { GradeRecommendation } from "../lib/api";
import type { PhysicsNumbers } from "../lib/api";
import { gradeImageUrl } from "../lib/gradeData";

const PANEL_COLORS = ["#ea580c", "#3b82f6", "#10b981"];

interface Props {
  grades: GradeRecommendation[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  /** Live-recalculated physics for each grade */
  livePhysics: PhysicsNumbers[];
}

export default function GradeAccordion({
  grades,
  activeIdx,
  onSelect,
  livePhysics,
}: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const focusIdx = hoveredIdx ?? activeIdx;

  return (
    <div className="flex gap-2 w-full h-[420px] overflow-hidden rounded-2xl">
      {grades.map((grade, i) => {
        const isActive = focusIdx === i;
        const accent = PANEL_COLORS[i % PANEL_COLORS.length];
        const imgUrl = gradeImageUrl(grade.grade);
        const physics = livePhysics[i];

        return (
          <motion.div
            key={grade.grade}
            layout
            animate={{ flex: isActive ? 4 : 1 }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
            className="relative overflow-hidden rounded-xl cursor-pointer select-none"
            style={{ minWidth: 64 }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => onSelect(i)}
          >
            {/* Background image */}
            <img
              src={imgUrl}
              alt={`Grade ${grade.grade}`}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: isActive ? "brightness(0.55)" : "brightness(0.3)" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=900&q=80";
              }}
            />

            {/* Dark gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: isActive
                  ? `linear-gradient(to top, rgba(0,0,0,0.92) 45%, rgba(0,0,0,0.1) 100%)`
                  : `linear-gradient(to top, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0.2) 100%)`,
              }}
            />

            {/* Accent top bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: accent }}
            />

            {/* ── COLLAPSED view: rotated grade name ── */}
            <AnimatePresence>
              {!isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-end justify-center pb-6"
                >
                  <p
                    className="font-black text-sm tracking-[0.2em] uppercase text-white"
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      transform: "rotate(180deg)",
                    }}
                  >
                    Grade {grade.grade}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── EXPANDED view: full content ── */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="absolute inset-0 flex flex-col justify-end p-5"
                >
                  {/* Badge */}
                  {i === 0 && (
                    <span
                      className="self-start text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-2"
                      style={{ background: accent, color: "#fff" }}
                    >
                      Top Pick
                    </span>
                  )}

                  {/* Grade header */}
                  <h3 className="text-white font-black text-2xl leading-tight flex items-center gap-2">
                    Grade {grade.grade}
                    <ArrowUpRight className="w-5 h-5" style={{ color: accent }} />
                  </h3>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                    {grade.type} · {grade.series} Series
                  </p>

                  {/* AI Explanation — truncated */}
                  <p className="text-slate-300 text-xs leading-relaxed line-clamp-3 mb-4">
                    {grade.ai_explanation}
                  </p>

                  {/* Key stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    <StatPill
                      icon={<Shield className="w-3 h-3" />}
                      label="Corrosion"
                      value={`${grade.corrosion_resistance}/5`}
                      color={accent}
                    />
                    <StatPill
                      icon={<Flame className="w-3 h-3" />}
                      label="Max Load"
                      value={`${physics?.bending_yield_load_kg.toLocaleString() ?? "—"} kg`}
                      color={accent}
                    />
                    <StatPill
                      icon={<Wrench className="w-3 h-3" />}
                      label="Weldability"
                      value={grade.weldability}
                      color={accent}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-lg p-2 text-center"
      style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${color}33` }}
    >
      <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color }}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-white text-xs font-bold font-mono">{value}</span>
    </div>
  );
}
