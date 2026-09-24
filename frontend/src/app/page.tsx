"use client";

/**
 * GradeWise — Main Page
 * ======================
 * Startup flow:
 *   1. DoubleStairsIntro plays on first mount (white screen → double stairs → reveal)
 *   2. Once intro finishes, showIntro=false and the intake form fades in
 *
 * App state machine (after intro):
 *   "intake"  → conversational search form
 *   "loading" → inline spinner on the Analyze button; no full-screen overlay
 *   "results" → full dashboard: accordion cards, radar chart, physics visualizers
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Ruler, ArrowRight, Activity, ChevronDown, ChevronUp,
  Droplets, Weight, Zap, RotateCcw, Shield, Thermometer,
} from "lucide-react";

import { getRecommendations, GradeRecommendation, RecommendResponse } from "../lib/api";
import { calculatePhysics } from "../lib/physics";
import { HoverBorderGradient } from "../components/ui/hover-border-gradient";
import DoubleStairsIntro from "../components/DoubleStairsPreloader";
import GradeAccordion from "../components/GradeAccordion";
import RadarChart from "../components/RadarChart";
import BendingVisualizer from "../components/BendingVisualizer";
import TensileVisualizer from "../components/TensileVisualizer";
import CorrosionVisualizer from "../components/CorrosionVisualizer";

// ─── Starter prompts ───────────────────────────────────────────────────────────
const STARTER_PROMPTS = [
  "steel rods for a heavy garden gate hinge",
  "exhaust manifold brackets for a sports car",
  "railing for a coastal balcony near the sea",
];

// ─── Visual tabs ───────────────────────────────────────────────────────────────
const VISUAL_TABS = [
  { id: "bending",   label: "Bend Test",    Icon: Weight },
  { id: "tensile",   label: "Tensile Test", Icon: Activity },
  { id: "corrosion", label: "Corrosion Sim", Icon: Droplets },
] as const;
type VisualTab = typeof VISUAL_TABS[number]["id"];

// ─── Root component ────────────────────────────────────────────────────────────
export default function Home() {
  // ── Intro: plays once on page load ──
  const [showIntro, setShowIntro] = useState(true);

  // ── App state: ONLY "intake" or "results" — loading is a separate boolean
  //    so it never triggers AnimatePresence / motion re-renders on the intake view ──
  const [appState, setAppState] = useState<"intake" | "results">("intake");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Form state ──
  const [userNeed, setUserNeed] = useState("");
  const [shape, setShape] = useState<"round" | "square">("round");
  const [dimensionStr, setDimensionStr] = useState("");
  const [lengthStr, setLengthStr] = useState("");

  // ── Results state ──
  const [results, setResults] = useState<RecommendResponse | null>(null);

  // ── Live slider state ──
  const [activeDimension, setActiveDimension] = useState(20);
  const [activeLength, setActiveLength] = useState(1200);

  // ── UI selection state ──
  const [activeGradeIdx, setActiveGradeIdx] = useState(0);
  const [activeVisual, setActiveVisual] = useState<VisualTab>("bending");

  // ─── Live-recalculated physics for every grade ──────────────────────────────
  const livePhysics = useMemo(() => {
    if (!results) return [];
    return results.recommendations.map((g) =>
      calculatePhysics(
        shape,
        activeDimension,
        activeLength,
        g.yield_strength_mpa,
        g.tensile_strength_mpa,
        g.youngs_modulus_gpa,
        g.elongation_pct,
        g.density_kg_m3
      )
    );
  }, [results, shape, activeDimension, activeLength]);

  // ─── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userNeed.trim() || isSubmitting) return;

      const finalDim = dimensionStr ? parseFloat(dimensionStr) : 20.0;
      const finalLen = lengthStr ? parseFloat(lengthStr) : 1200.0;

      setError(null);
      setIsSubmitting(true); // ← only this changes; appState stays "intake"

      try {
        const data = await getRecommendations({
          user_need: userNeed,
          diameter_mm: finalDim,
          length_mm: finalLen,
        });
        setResults(data);
        setActiveDimension(finalDim);
        setActiveLength(finalLen);
        setActiveGradeIdx(0);
        setAppState("results"); // ← AnimatePresence transitions only here
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Request failed";
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [userNeed, dimensionStr, lengthStr, isSubmitting]
  );

  const activeGrade: GradeRecommendation | undefined =
    results?.recommendations[activeGradeIdx];

  return (
    <>
      {/* ─── Cinematic page-load intro (plays once, then disappears) ─── */}
      {showIntro && (
        <DoubleStairsIntro onComplete={() => setShowIntro(false)} />
      )}

      {/* ─── App shell ─── */}
      <div className="min-h-screen flex flex-col" style={{ background: "var(--gs-bg)" }}>
        <Header
          onLogoClick={() => setAppState("intake")}
          showBack={appState === "results"}
        />

        <main className="flex-1">
          <AnimatePresence mode="wait">
            {appState === "intake" ? (
              <motion.div
                key="intake"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <IntakeView
                  userNeed={userNeed} setUserNeed={setUserNeed}
                  shape={shape} setShape={setShape}
                  dimensionStr={dimensionStr} setDimensionStr={setDimensionStr}
                  lengthStr={lengthStr} setLengthStr={setLengthStr}
                  isLoading={isSubmitting}
                  error={error}
                  onSubmit={handleSubmit}
                />
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <ResultsView
                  results={results!}
                  livePhysics={livePhysics}
                  shape={shape} setShape={setShape}
                  activeDimension={activeDimension} setActiveDimension={setActiveDimension}
                  activeLength={activeLength} setActiveLength={setActiveLength}
                  activeGradeIdx={activeGradeIdx} setActiveGradeIdx={setActiveGradeIdx}
                  activeVisual={activeVisual} setActiveVisual={setActiveVisual}
                  activeGrade={activeGrade}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <PoweredBy />
      </div>
    </>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({
  onLogoClick,
  showBack,
}: {
  onLogoClick: () => void;
  showBack: boolean;
}) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 border-b"
      style={{
        background: "rgba(15,15,17,0.85)",
        backdropFilter: "blur(12px)",
        borderColor: "var(--gs-border)",
      }}
    >
      <button
        onClick={onLogoClick}
        className="flex items-center gap-2.5 group"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-lg transition-transform group-hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #ea580c, #9a3412)",
            boxShadow: "0 0 16px rgba(234,88,12,0.4)",
          }}
        >
          GW
        </div>
        <span className="font-black text-lg tracking-tight" style={{ color: "var(--gs-text-1)" }}>
          Grade<span style={{ color: "var(--gs-amber)" }}>Wise</span>
        </span>
      </button>

      {showBack && (
        <motion.button
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: "var(--gs-text-3)" }}
          onClick={onLogoClick}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gs-amber)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gs-text-3)")}
        >
          <RotateCcw className="w-4 h-4" />
          New Search
        </motion.button>
      )}
    </header>
  );
}

// ─── Intake View ──────────────────────────────────────────────────────────────
function IntakeView({
  userNeed, setUserNeed,
  shape, setShape,
  dimensionStr, setDimensionStr,
  lengthStr, setLengthStr,
  isLoading, error, onSubmit,
}: {
  userNeed: string; setUserNeed: (v: string) => void;
  shape: "round" | "square"; setShape: (v: "round" | "square") => void;
  dimensionStr: string; setDimensionStr: (v: string) => void;
  lengthStr: string; setLengthStr: (v: string) => void;
  isLoading: boolean; error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-6 pt-24 pb-32">
      {/* Hero headline */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Ambient glow orb */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(234,88,12,0.07) 0%, transparent 70%)",
          }}
        />

        <p
          className="text-xs font-black uppercase tracking-[0.3em] mb-4"
          style={{ color: "var(--gs-amber)" }}
        >
          Powered by AI · Jindal Stainless Portfolio
        </p>
        <h1 className="text-5xl font-black leading-[1.1] tracking-tight mb-5" style={{ color: "var(--gs-text-1)" }}>
          Find the perfect<br />
          <span className="text-amber-glow">stainless grade.</span>
        </h1>
        <p className="text-lg" style={{ color: "var(--gs-text-2)" }}>
          Describe what you&apos;re building. We&apos;ll shortlist the best Jindal Stainless grades
          and show you live physics simulations.
        </p>
      </motion.div>

      {/* Search form */}
      <motion.form
        onSubmit={onSubmit}
        className="space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        {/* Main textarea */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "var(--gs-surface)",
            border: "1.5px solid var(--gs-border-2)",
            boxShadow: "0 0 0 0 var(--gs-amber-glow)",
            transition: "box-shadow 0.3s",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.boxShadow = "0 0 0 3px var(--gs-amber-glow)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.boxShadow = "0 0 0 0 var(--gs-amber-glow)")
          }
        >
          <div className="absolute left-4 top-5 pointer-events-none">
            <Search className="w-5 h-5" style={{ color: "var(--gs-amber)" }} />
          </div>
          <textarea
            value={userNeed}
            onChange={(e) => setUserNeed(e.target.value)}
            placeholder="e.g. I need steel rods for a heavy garden gate that won't rust near the coast…"
            className="w-full pl-12 pr-4 pt-5 pb-16 bg-transparent text-base outline-none resize-none"
            style={{ color: "var(--gs-text-1)" }}
            rows={3}
            required
          />
          {/* Submit button inside textarea */}
          <div className="absolute bottom-4 right-4">
            <HoverBorderGradient
              as="button"
              type="submit"
              disabled={isLoading || !userNeed.trim()}
              className="flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin inline-block"
                    style={{ borderColor: "var(--gs-amber)", borderTopColor: "transparent" }}
                  />
                  Analyzing…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Analyze <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </HoverBorderGradient>
          </div>
        </div>

        {/* Starter prompt chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="text-sm font-medium mr-1" style={{ color: "var(--gs-text-3)" }}>
            Try:
          </span>
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setUserNeed(p)}
              className="text-sm px-3 py-1.5 rounded-full transition-all duration-200"
              style={{
                background: "var(--gs-surface)",
                border: "1px solid var(--gs-border)",
                color: "var(--gs-text-2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--gs-amber)";
                e.currentTarget.style.color = "var(--gs-amber)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--gs-border)";
                e.currentTarget.style.color = "var(--gs-text-2)";
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Advanced dimensions */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--gs-border)" }}
        >
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-5 py-4 transition-colors"
            style={{ background: "var(--gs-surface)" }}
          >
            <span className="flex items-center gap-2 font-semibold text-sm" style={{ color: "var(--gs-text-2)" }}>
              <Ruler className="w-4 h-4" style={{ color: "var(--gs-amber)" }} />
              Specify dimensions (Optional)
            </span>
            {showAdvanced
              ? <ChevronUp className="w-4 h-4" style={{ color: "var(--gs-text-3)" }} />
              : <ChevronDown className="w-4 h-4" style={{ color: "var(--gs-text-3)" }} />}
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div
                  className="grid grid-cols-3 gap-4 p-5"
                  style={{ borderTop: "1px solid var(--gs-border)", background: "var(--gs-surface-2)" }}
                >
                  {/* Shape toggle */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--gs-text-3)" }}>
                      Profile
                    </label>
                    <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--gs-border)" }}>
                      {(["round", "square"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setShape(s)}
                          className="flex-1 py-2 text-sm font-semibold capitalize transition-all"
                          style={{
                            background: shape === s ? "var(--gs-amber)" : "transparent",
                            color: shape === s ? "#fff" : "var(--gs-text-3)",
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dimension */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--gs-text-3)" }}>
                      {shape === "round" ? "Diameter" : "Side"} (mm)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 20"
                      value={dimensionStr}
                      onChange={(e) => setDimensionStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        background: "var(--gs-bg)",
                        border: "1px solid var(--gs-border)",
                        color: "var(--gs-text-1)",
                      }}
                    />
                  </div>

                  {/* Length */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--gs-text-3)" }}>
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1200"
                      value={lengthStr}
                      onChange={(e) => setLengthStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        background: "var(--gs-bg)",
                        border: "1px solid var(--gs-border)",
                        color: "var(--gs-text-1)",
                      }}
                    />
                  </div>
                </div>
                <p className="text-center text-xs pb-4" style={{ color: "var(--gs-text-3)" }}>
                  Leave blank to use demonstration defaults (20 mm × 1200 mm)
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl p-4 text-sm text-center"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171",
            }}
          >
            {error}
          </motion.div>
        )}
      </motion.form>
    </div>
  );
}

// ─── Results View ─────────────────────────────────────────────────────────────
function ResultsView({
  results,
  livePhysics,
  shape, setShape,
  activeDimension, setActiveDimension,
  activeLength, setActiveLength,
  activeGradeIdx, setActiveGradeIdx,
  activeVisual, setActiveVisual,
  activeGrade,
}: {
  results: RecommendResponse;
  livePhysics: ReturnType<typeof calculatePhysics>[];
  shape: "round" | "square"; setShape: (v: "round" | "square") => void;
  activeDimension: number; setActiveDimension: (v: number) => void;
  activeLength: number; setActiveLength: (v: number) => void;
  activeGradeIdx: number; setActiveGradeIdx: (v: number) => void;
  activeVisual: VisualTab; setActiveVisual: (v: VisualTab) => void;
  activeGrade: GradeRecommendation | undefined;
}) {
  const activePhysics = livePhysics[activeGradeIdx];

  return (
    <div className="max-w-7xl mx-auto px-5 pt-6 pb-24 space-y-8">
      {/* Query summary banner */}
      <div
        className="rounded-xl px-5 py-3 flex items-center gap-3"
        style={{ background: "var(--gs-surface)", border: "1px solid var(--gs-border)" }}
      >
        <Zap className="w-4 h-4 shrink-0" style={{ color: "var(--gs-amber)" }} />
        <p className="text-sm" style={{ color: "var(--gs-text-2)" }}>
          <span className="font-bold" style={{ color: "var(--gs-text-1)" }}>
            &ldquo;{results.user_need}&rdquo;
          </span>
          {" "}— {results.recommendations.length} grades shortlisted
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          TOP ROW: Accordion Cards  +  Radar Chart
          ───────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grade accordion cards (L) */}
        <div className="lg:col-span-8">
          <SectionLabel>Recommended Grades</SectionLabel>
          <GradeAccordion
            grades={results.recommendations}
            activeIdx={activeGradeIdx}
            onSelect={setActiveGradeIdx}
            livePhysics={livePhysics}
          />
        </div>

        {/* Radar chart (R) */}
        <div
          className="lg:col-span-4 rounded-2xl p-5"
          style={{ background: "var(--gs-surface)", border: "1px solid var(--gs-border)" }}
        >
          <RadarChart grades={results.recommendations} />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          MIDDLE ROW: Live Parameters
          ───────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--gs-surface)", border: "1px solid var(--gs-border)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: "var(--gs-amber)" }} />
            <h3 className="font-bold" style={{ color: "var(--gs-text-1)" }}>
              Live Parameters
            </h3>
          </div>
          <span
            className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md"
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.3)",
              color: "#10b981",
            }}
          >
            ● Real-time Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Shape selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--gs-text-3)" }}>
              Cross-Section Profile
            </label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--gs-border)" }}>
              {(["round", "square"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setShape(s)}
                  className="flex-1 py-2.5 text-sm font-semibold capitalize transition-all duration-200"
                  style={{
                    background: shape === s ? "var(--gs-amber)" : "var(--gs-surface-2)",
                    color: shape === s ? "#fff" : "var(--gs-text-3)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension slider */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--gs-text-3)" }}>
                {shape === "round" ? "Diameter" : "Side Width"}
              </label>
              <span className="font-mono font-bold text-sm" style={{ color: "var(--gs-amber)" }}>
                {activeDimension} mm
              </span>
            </div>
            <input
              type="range"
              min={5} max={100} step={1}
              value={activeDimension}
              onChange={(e) => setActiveDimension(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Length slider */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--gs-text-3)" }}>
                Length / Span
              </label>
              <span className="font-mono font-bold text-sm" style={{ color: "var(--gs-amber)" }}>
                {activeLength} mm
              </span>
            </div>
            <input
              type="range"
              min={100} max={5000} step={50}
              value={activeLength}
              onChange={(e) => setActiveLength(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          BOTTOM ROW: Physics Visualizer  +  Grade Detail Panel
          ───────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Physics visualizer stage (L) */}
        <div
          className="lg:col-span-7 rounded-2xl overflow-hidden"
          style={{ background: "var(--gs-surface)", border: "1px solid var(--gs-border)" }}
        >
          {/* Tab bar */}
          <div
            className="flex"
            style={{ borderBottom: "1px solid var(--gs-border)", background: "var(--gs-surface-2)" }}
          >
            {VISUAL_TABS.map(({ id, label, Icon }) => {
              const active = activeVisual === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveVisual(id)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all duration-200"
                  style={{
                    color: active ? "var(--gs-amber)" : "var(--gs-text-3)",
                    borderBottom: active ? "2px solid var(--gs-amber)" : "2px solid transparent",
                    background: active ? "rgba(234,88,12,0.05)" : "transparent",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Grade selector within visualizer */}
          <div
            className="flex gap-2 px-5 py-3"
            style={{ borderBottom: "1px solid var(--gs-border)" }}
          >
            {results.recommendations.map((g, i) => (
              <button
                key={g.grade}
                onClick={() => setActiveGradeIdx(i)}
                className="px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200"
                style={{
                  background: activeGradeIdx === i ? "var(--gs-amber)" : "var(--gs-surface-2)",
                  color: activeGradeIdx === i ? "#fff" : "var(--gs-text-3)",
                  border: `1px solid ${activeGradeIdx === i ? "var(--gs-amber)" : "var(--gs-border)"}`,
                }}
              >
                Grade {g.grade}
              </button>
            ))}
          </div>

          {/* Visualizer content */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              {activePhysics && activeGrade && (
                <motion.div
                  key={`${activeVisual}-${activeGradeIdx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeVisual === "bending" && (
                    <BendingVisualizer
                      physics={activePhysics}
                      gradeLabel={activeGrade.grade}
                      diameter_mm={activeDimension}
                      length_mm={activeLength}
                    />
                  )}
                  {activeVisual === "tensile" && (
                    <TensileVisualizer
                      physics={activePhysics}
                      gradeLabel={activeGrade.grade}
                      diameter_mm={activeDimension}
                      length_mm={activeLength}
                    />
                  )}
                  {activeVisual === "corrosion" && (
                    <CorrosionVisualizer
                      gradeLabel={activeGrade.grade}
                      corrosionResistance={activeGrade.corrosion_resistance}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Grade Detail Panel (R) */}
        {activeGrade && (
          <motion.div
            key={activeGradeIdx}
            className="lg:col-span-5 space-y-4"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <SectionLabel>Grade Profile</SectionLabel>
            <GradeDetailPanel
              grade={activeGrade}
              physics={activePhysics}
              isBest={activeGradeIdx === 0}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Grade Detail Panel ───────────────────────────────────────────────────────
function GradeDetailPanel({
  grade,
  physics,
  isBest,
}: {
  grade: GradeRecommendation;
  physics: ReturnType<typeof calculatePhysics> | undefined;
  isBest: boolean;
}) {
  const [showPro, setShowPro] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--gs-surface)",
        border: `1px solid ${isBest ? "var(--gs-amber)" : "var(--gs-border)"}`,
        boxShadow: isBest ? "0 0 24px rgba(234,88,12,0.1)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{
          borderBottom: "1px solid var(--gs-border)",
          background: isBest ? "rgba(234,88,12,0.05)" : "var(--gs-surface-2)",
        }}
      >
        <div className="flex justify-between items-start">
          <div>
            {isBest && (
              <span
                className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-2"
                style={{ background: "var(--gs-amber)", color: "#fff" }}
              >
                Top Recommendation
              </span>
            )}
            <h3 className="text-2xl font-black" style={{ color: "var(--gs-text-1)" }}>
              Grade {grade.grade}
              <span
                className="ml-2 text-sm font-bold px-2 py-0.5 rounded-md"
                style={{ background: "var(--gs-surface)", color: "var(--gs-text-2)" }}
              >
                {grade.type}
              </span>
            </h3>
            <p className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: "var(--gs-text-3)" }}>
              {grade.series} Series · UNS {grade.uns_no}
            </p>
          </div>
          {/* Cost tier dots */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-right" style={{ color: "var(--gs-text-3)" }}>
              Cost
            </p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: i <= grade.cost_tier ? "var(--gs-amber)" : "var(--gs-border)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* AI Explanation */}
        <p className="text-sm leading-relaxed" style={{ color: "var(--gs-text-2)" }}>
          {grade.ai_explanation}
        </p>

        {/* Trade-off box */}
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(245,158,11,0.07)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#f59e0b" }}>
            Trade-off
          </p>
          <p className="text-sm" style={{ color: "#fbbf24" }}>
            {grade.trade_off_notes}
          </p>
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <QuickStat icon={<Shield className="w-3.5 h-3.5" />} label="Corrosion" value={`${grade.corrosion_resistance}/5`} />
          <QuickStat icon={<Thermometer className="w-3.5 h-3.5" />} label="Max Temp" value={`${grade.max_service_temp_c}°C`} />
          <QuickStat icon={<Zap className="w-3.5 h-3.5" />} label="Weldability" value={grade.weldability} />
        </div>

        {/* Pro toggle */}
        <button
          onClick={() => setShowPro(!showPro)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{
            background: showPro ? "rgba(234,88,12,0.1)" : "var(--gs-surface-2)",
            border: "1px solid var(--gs-border)",
            color: "var(--gs-amber)",
          }}
        >
          {showPro ? "Hide" : "View"} Professional Data
          {showPro ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Pro data expansion */}
        <AnimatePresence>
          {showPro && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div
                className="rounded-xl p-4 space-y-4"
                style={{ background: "var(--gs-surface-2)", border: "1px solid var(--gs-border)" }}
              >
                {/* Material properties */}
                <div>
                  <ProSectionLabel>Material Properties</ProSectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <ProRow label="Yield Strength" value={`${grade.yield_strength_mpa} MPa`} />
                    <ProRow label="Tensile Strength" value={`${grade.tensile_strength_mpa} MPa`} />
                    <ProRow label="Young's Modulus" value={`${grade.youngs_modulus_gpa} GPa`} />
                    <ProRow label="Elongation" value={`${grade.elongation_pct}%`} />
                    <ProRow label="Density" value={`${grade.density_kg_m3} kg/m³`} />
                    <ProRow label="Magnetic" value={grade.magnetic} />
                  </div>
                </div>

                {/* Live physics */}
                {physics && (
                  <div>
                    <ProSectionLabel>Calculated Physics (live)</ProSectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <ProRow label="Section Area A" value={`${physics.cross_section_area_mm2} mm²`} highlight />
                      <ProRow label="Moment of Inertia I" value={`${physics.second_moment_mm4} mm⁴`} />
                      <ProRow label="Section Modulus Z" value={`${physics.section_modulus_mm3} mm³`} />
                      <ProRow label="Rod Mass" value={`${physics.rod_mass_kg} kg`} />
                      <ProRow label="Yield Load (Axial)" value={`${physics.yield_load_kg.toLocaleString()} kg`} highlight />
                      <ProRow label="Fracture Load" value={`${physics.fracture_load_kg.toLocaleString()} kg`} highlight />
                      <ProRow label="Elastic Stretch" value={`${physics.elastic_stretch_mm} mm`} />
                      <ProRow label="Total Elongation" value={`${physics.total_elongation_mm} mm`} />
                      <ProRow label="Bending Yield Load" value={`${physics.bending_yield_load_kg.toLocaleString()} kg`} highlight />
                      <ProRow label="Deflection @ Yield" value={`${physics.deflection_at_yield_mm} mm`} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: "var(--gs-text-3)" }}>
      {children}
    </p>
  );
}

function QuickStat({
  icon, label, value,
}: {
  icon: React.ReactNode; label: string; value: string;
}) {
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{ background: "var(--gs-surface-2)", border: "1px solid var(--gs-border)" }}
    >
      <div className="flex items-center justify-center gap-1 mb-1" style={{ color: "var(--gs-amber)" }}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-mono font-bold text-sm" style={{ color: "var(--gs-text-1)" }}>
        {value}
      </span>
    </div>
  );
}

function ProSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-widest mb-2 pb-1"
      style={{ color: "var(--gs-text-3)", borderBottom: "1px solid var(--gs-border)" }}>
      {children}
    </p>
  );
}

function ProRow({
  label, value, highlight = false,
}: {
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--gs-text-3)" }}>
        {label}
      </span>
      <span
        className="font-mono text-xs font-bold"
        style={{ color: highlight ? "var(--gs-amber)" : "var(--gs-text-1)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── "Powered by Jindal Stainless" — bottom-right corner ─────────────────────
function PoweredBy() {
  return (
    <div className="fixed bottom-5 right-6 flex items-center gap-2 select-none pointer-events-none z-50">
      <span
        className="text-[9px] font-bold uppercase tracking-[0.2em]"
        style={{ color: "var(--gs-text-3)" }}
      >
        Powered by
      </span>
      <span
        className="text-[11px] font-black uppercase tracking-wider"
        style={{ color: "var(--gs-amber)" }}
      >
        Jindal Stainless
      </span>
    </div>
  );
}
