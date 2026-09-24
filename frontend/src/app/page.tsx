"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Ruler, ArrowRight, Activity, Droplets, Weight, RotateCcw
} from "lucide-react";

import { getRecommendations, GradeRecommendation, RecommendResponse } from "../lib/api";
import { calculatePhysics } from "../lib/physics";
import DoubleStairsIntro from "../components/DoubleStairsPreloader";
import GradeAccordion from "../components/GradeAccordion";
import RadarChart from "../components/RadarChart";
import BendingVisualizer from "../components/BendingVisualizer";
import TensileVisualizer from "../components/TensileVisualizer";
import CorrosionVisualizer from "../components/CorrosionVisualizer";

// ─── Starter prompts ───────────────────────────────────────────────────────────
const STARTER_PROMPTS = [
  "STEEL RODS FOR A HEAVY GARDEN GATE HINGE",
  "EXHAUST MANIFOLD BRACKETS FOR A SPORTS CAR",
  "RAILING FOR A COASTAL BALCONY NEAR THE SEA",
];

// ─── Visual tabs ───────────────────────────────────────────────────────────────
const VISUAL_TABS = [
  { id: "bending",   label: "BEND TEST",    Icon: Weight },
  { id: "tensile",   label: "TENSILE TEST", Icon: Activity },
  { id: "corrosion", label: "CORROSION SIM", Icon: Droplets },
] as const;
type VisualTab = typeof VISUAL_TABS[number]["id"];

// ─── Root component ────────────────────────────────────────────────────────────
export default function Home() {
  const [showIntro, setShowIntro] = useState(true);

  // App state & Data
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecommendResponse | null>(null);

  // Form state
  const [userNeed, setUserNeed] = useState("");
  const [shape, setShape] = useState<"round" | "square">("round");
  const [dimensionStr, setDimensionStr] = useState("");
  const [lengthStr, setLengthStr] = useState("");

  // Live slider state
  const [activeDimension, setActiveDimension] = useState(20);
  const [activeLength, setActiveLength] = useState(1200);

  // UI selection state
  const [activeGradeIdx, setActiveGradeIdx] = useState(0);
  const [activeVisual, setActiveVisual] = useState<VisualTab>("bending");

  const resultsRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userNeed.trim() || isSubmitting) return;

      const finalDim = dimensionStr ? parseFloat(dimensionStr) : 20.0;
      const finalLen = lengthStr ? parseFloat(lengthStr) : 1200.0;

      setError(null);
      setIsSubmitting(true);

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

        // Smooth scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [userNeed, dimensionStr, lengthStr, isSubmitting]
  );

  const handleReset = () => {
    setResults(null);
    setUserNeed("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeGrade: GradeRecommendation | undefined =
    results?.recommendations[activeGradeIdx];

  return (
    <>
      {showIntro && <DoubleStairsIntro onComplete={() => setShowIntro(false)} />}

      <div className="min-h-screen flex flex-col bg-black text-white selection:bg-white selection:text-black">
        {/* Top Nav */}
        <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-8 h-14 bg-black/60 backdrop-blur-md">
          <div className="font-mono text-[12px] tracking-[2px] uppercase">Menu</div>
          <button onClick={handleReset} className="font-display text-[14px] tracking-[6px] uppercase hover:opacity-80 transition-opacity">
            BUGATTI <span className="opacity-50 line-through mr-2"></span> GRADEWISE
          </button>
          <div className="font-mono text-[12px] tracking-[2px] uppercase flex gap-4">
            {results && (
              <button onClick={handleReset} className="hover:text-[#c3d9f3] transition-colors flex items-center gap-2">
                <RotateCcw className="w-3 h-3" />
                RESTART
              </button>
            )}
            <span>STORE</span>
          </div>
        </header>

        {/* Hero Section (Always Visible) */}
        <main className="flex-1 flex flex-col">
          <section className="relative min-h-screen flex flex-col justify-center px-8 md:px-24 py-[120px]">
            {/* Full Bleed Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=2560&q=80"
                alt="Steel Factory"
                className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
            </div>

            <div className="relative z-10 max-w-4xl">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="font-display text-[64px] leading-[1.1] tracking-[4px] uppercase"
              >
                ENGINEERED PRECISION.<br />
                NO COMPROMISES.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="font-text text-[16px] text-[#cccccc] mt-6 max-w-2xl"
              >
                Describe your engineering requirements, environmental conditions, and structural loads. 
                Our simulation engine evaluates the Jindal Stainless portfolio to recommend the exact grade for your application.
              </motion.p>

              <motion.form 
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-12 space-y-8 bg-[#141414]/80 backdrop-blur-sm p-8 max-w-3xl"
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center text-[#666666]">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={userNeed}
                    onChange={(e) => setUserNeed(e.target.value)}
                    placeholder="E.g. Marine grade steel for coastal balcony railing..."
                    className="w-full bg-transparent border-b border-[#3a3a3a] text-white font-text text-[16px] pl-10 pb-3 focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="font-mono text-[11px] tracking-[2px] uppercase text-[#999999] flex items-center gap-2">
                      <div className="w-3 h-3 border border-[#3a3a3a]" /> Profile
                    </label>
                    <select
                      value={shape}
                      onChange={(e) => setShape(e.target.value as "round" | "square")}
                      className="w-full bg-transparent border-b border-[#3a3a3a] text-white font-text text-[16px] pb-2 focus:outline-none focus:border-white transition-colors appearance-none"
                    >
                      <option value="round" className="bg-[#141414]">Round Bar</option>
                      <option value="square" className="bg-[#141414]">Square Bar</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="font-mono text-[11px] tracking-[2px] uppercase text-[#999999] flex items-center gap-2">
                      <Ruler className="w-3 h-3" /> Dimension (mm)
                    </label>
                    <input
                      type="number"
                      value={dimensionStr}
                      onChange={(e) => setDimensionStr(e.target.value)}
                      placeholder="20"
                      className="w-full bg-transparent border-b border-[#3a3a3a] text-white font-text text-[16px] pb-2 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="font-mono text-[11px] tracking-[2px] uppercase text-[#999999] flex items-center gap-2">
                      <ArrowRight className="w-3 h-3" /> Length (mm)
                    </label>
                    <input
                      type="number"
                      value={lengthStr}
                      onChange={(e) => setLengthStr(e.target.value)}
                      placeholder="1200"
                      className="w-full bg-transparent border-b border-[#3a3a3a] text-white font-text text-[16px] pb-2 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                {error && <div className="font-mono text-[#d4a017] text-[11px] tracking-[2px] uppercase">{error}</div>}

                <div className="pt-4 flex flex-col sm:flex-row items-center gap-6">
                  <button
                    type="submit"
                    disabled={isSubmitting || !userNeed.trim()}
                    className="h-[44px] px-[32px] rounded-full border border-white bg-transparent text-white font-mono text-[14px] tracking-[2.5px] uppercase hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white flex items-center gap-3"
                  >
                    {isSubmitting ? "CALCULATING..." : "ANALYZE REQUIREMENTS"}
                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                  </button>

                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-[11px] tracking-[2px] uppercase text-[#666666]">SUGGESTIONS</span>
                    <div className="flex gap-4">
                      {STARTER_PROMPTS.slice(0, 2).map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setUserNeed(p.toLowerCase())}
                          className="font-mono text-[11px] tracking-[2px] uppercase text-[#999999] hover:text-[#c3d9f3] text-left max-w-[200px] truncate"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.form>
            </div>
          </section>

          {/* Results Section (Scroll Reveal) */}
          {results && activeGrade && (
            <section ref={resultsRef} className="bg-black py-[120px] px-8 md:px-24 min-h-screen">
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="max-w-7xl mx-auto space-y-[120px]"
              >
                
                {/* Top Recommendation Header */}
                <div className="space-y-4">
                  <h3 className="font-mono text-[11px] tracking-[2px] uppercase text-[#999999]">OPTIMAL GRADE</h3>
                  <h2 className="font-display text-[48px] leading-[1.15] tracking-[3px] uppercase">
                    GRADE {activeGrade.grade}
                  </h2>
                  <p className="font-text text-[16px] text-[#cccccc] max-w-3xl leading-[1.5]">
                    {activeGrade.ai_explanation}
                  </p>
                </div>

                {/* Grade Selection Accordion */}
                <div>
                  <h3 className="font-mono text-[11px] tracking-[2px] uppercase text-[#999999] mb-6">PORTFOLIO COMPARISON</h3>
                  <div className="border-t border-[#262626]">
                    <GradeAccordion
                      grades={results.recommendations}
                      activeIdx={activeGradeIdx}
                      onSelect={setActiveGradeIdx}
                      livePhysics={livePhysics}
                    />
                  </div>
                </div>

                {/* Technical Specs & Radar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[40px] lg:gap-[120px] items-center">
                  <div className="space-y-8">
                    <h3 className="font-display text-[32px] leading-[1.2] tracking-[2px] uppercase">
                      MATERIAL SPECIFICATIONS
                    </h3>
                    <div className="border-y border-[#262626] divide-y divide-[#262626]">
                      <SpecRow label="YIELD STRENGTH" value={`${activeGrade.yield_strength_mpa} MPA`} />
                      <SpecRow label="TENSILE STRENGTH" value={`${activeGrade.tensile_strength_mpa} MPA`} />
                      <SpecRow label="ELONGATION" value={`${activeGrade.elongation_pct}%`} />
                      <SpecRow label="MAX SERVICE TEMP" value={`${activeGrade.max_service_temp_c}°C`} />
                      <SpecRow label="COST TIER" value={`${activeGrade.cost_tier}/5`} />
                    </div>
                  </div>
                  <div className="bg-[#141414] p-8 aspect-square flex items-center justify-center">
                    <RadarChart grades={results.recommendations} activeIdx={activeGradeIdx} />
                  </div>
                </div>

                {/* Live Physics Simulators */}
                <div className="space-y-8">
                  <div className="flex justify-between items-end border-b border-[#262626] pb-4">
                    <h3 className="font-display text-[32px] leading-[1.2] tracking-[2px] uppercase">
                      SIMULATION ENGINE
                    </h3>
                    <div className="flex gap-4">
                      {VISUAL_TABS.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveVisual(tab.id)}
                          className={`font-mono text-[11px] tracking-[2px] uppercase pb-4 -mb-4 transition-colors ${
                            activeVisual === tab.id 
                              ? "text-white border-b-2 border-white" 
                              : "text-[#666666] hover:text-[#999999]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0d0d0d] p-8 lg:p-12 border border-[#262626]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeVisual}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4 }}
                      >
                        {activeVisual === "bending" && (
                          <BendingVisualizer
                            physics={livePhysics[activeGradeIdx]}
                            gradeLabel={activeGrade.grade}
                            diameter_mm={activeDimension}
                            length_mm={activeLength}
                          />
                        )}
                        {activeVisual === "tensile" && (
                          <TensileVisualizer
                            physics={livePhysics[activeGradeIdx]}
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
                    </AnimatePresence>
                  </div>
                </div>

              </motion.div>
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-black border-t border-[#262626] py-[64px] px-8 md:px-24 flex flex-col items-center gap-8">
          <h1 className="font-display text-[24px] tracking-[6px] text-[#666666]">GRADEWISE</h1>
          <p className="font-text text-[14px] text-[#666666]">
            © {new Date().getFullYear()} Jindal Stainless Limited. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-6">
      <span className="font-mono text-[11px] tracking-[2px] uppercase text-[#999999]">{label}</span>
      <span className="font-display text-[20px] tracking-[1px] uppercase text-white">{value}</span>
    </div>
  );
}
