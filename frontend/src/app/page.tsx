"use client";
/**
 * GradeWise — Main Page (Premium Scroll Experience)
 * ==================================================
 * Re-architected for a seamless, scrollable narrative flow.
 * - Framer Motion scroll reveals (whileInView)
 * - Premium AI Chatbot-style hero
 * - Ambient animated background
 * - Expanded, distinct sections for each physics engine
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Search, ArrowRight, ArrowDown, Activity, Settings2, Droplets, Weight,
  Zap, Shield, Thermometer, Info, ChevronDown
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
import AnimatedBackground from "../components/AnimatedBackground";

const STARTER_PROMPTS = [
  "steel rods for a heavy garden gate hinge",
  "exhaust manifold brackets for a sports car",
  "railing for a coastal balcony near the sea",
];

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userNeed, setUserNeed] = useState("");
  const [shape, setShape] = useState<"round" | "square">("round");
  const [dimensionStr, setDimensionStr] = useState("");
  const [lengthStr, setLengthStr] = useState("");

  const [results, setResults] = useState<RecommendResponse | null>(null);
  const [activeDimension, setActiveDimension] = useState(20);
  const [activeLength, setActiveLength] = useState(1200);
  const [activeGradeIdx, setActiveGradeIdx] = useState(0);

  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Parallax for hero
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  const livePhysics = useMemo(() => {
    if (!results) return [];
    return results.recommendations.map((g) =>
      calculatePhysics(
        shape, activeDimension, activeLength,
        g.yield_strength_mpa, g.tensile_strength_mpa,
        g.youngs_modulus_gpa, g.elongation_pct, g.density_kg_m3
      )
    );
  }, [results, shape, activeDimension, activeLength]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
      
      // Smooth scroll to results after a tiny delay to allow render
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [userNeed, dimensionStr, lengthStr, isSubmitting]);

  const activeGrade = results?.recommendations[activeGradeIdx];
  const activePhysics = livePhysics[activeGradeIdx];

  return (
    <>
      <AnimatedBackground />
      {showIntro && <DoubleStairsIntro onComplete={() => setShowIntro(false)} />}

      <div className="min-h-screen flex flex-col font-sans selection:bg-amber-500/30 text-slate-200">
        
        {/* ─── HEADER ─── */}
        <header className="fixed top-0 inset-x-0 z-40 h-20 flex items-center px-8 bg-[#0a0a0c]/60 backdrop-blur-xl border-b border-white/5 transition-all">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg bg-gradient-to-br from-amber-600 to-amber-900 shadow-lg group-hover:shadow-amber-500/20 transition-all">
              GW
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white group-hover:text-amber-500 transition-colors">
              GradeWise
            </h1>
          </div>
        </header>

        {/* ─── HERO INTAKE ─── */}
        <motion.main 
          className="relative flex-1 flex flex-col items-center justify-center pt-24 pb-12 px-6 min-h-screen"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="w-full max-w-4xl mx-auto space-y-12">
            <div className="space-y-6 text-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-bold tracking-widest uppercase mb-4"
              >
                <Zap className="w-3.5 h-3.5" />
                AI-Powered Material Intelligence
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
                className="text-5xl sm:text-7xl font-bold tracking-tight bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text text-transparent leading-tight"
              >
                What are you building?
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-light"
              >
                Describe your project, environment, and physical constraints. We'll run the physics and find the perfect stainless steel grade.
              </motion.p>
            </div>

            <motion.form 
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
              className="relative group w-full"
            >
              {/* Glowing aura */}
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-600/30 via-orange-500/30 to-blue-600/30 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
              
              <div className="relative flex flex-col sm:flex-row items-center bg-[#131316]/90 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] p-3 shadow-2xl gap-3">
                <div className="flex-1 flex items-center w-full px-4">
                  <Search className="w-6 h-6 text-slate-500 mr-3" />
                  <input
                    type="text"
                    required
                    value={userNeed}
                    onChange={(e) => setUserNeed(e.target.value)}
                    placeholder="e.g. exhaust manifold brackets for a sports car..."
                    className="w-full bg-transparent text-lg sm:text-xl outline-none placeholder:text-slate-600 text-white font-medium py-4"
                    disabled={isSubmitting}
                  />
                </div>
                
                <HoverBorderGradient
                  containerClassName="w-full sm:w-auto"
                  as="button"
                  type="submit"
                  className="w-full sm:w-auto bg-[#ea580c] text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#f97316] transition-colors"
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>Analyze <ArrowRight className="w-4 h-4" /></>
                  )}
                </HoverBorderGradient>
              </div>

              {/* Parameters placed below the main search bar */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shape</span>
                  <select 
                    value={shape} onChange={(e) => setShape(e.target.value as "round" | "square")}
                    className="bg-[#131316] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold text-amber-500 outline-none cursor-pointer hover:border-white/20 transition-colors"
                  >
                    <option value="round">Round</option>
                    <option value="square">Square</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Diameter (mm)</span>
                  <input 
                    type="number" placeholder="20" value={dimensionStr} onChange={e => setDimensionStr(e.target.value)}
                    className="w-20 bg-[#131316] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold text-white outline-none placeholder:text-slate-700 hover:border-white/20 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Length (mm)</span>
                  <input 
                    type="number" placeholder="1200" value={lengthStr} onChange={e => setLengthStr(e.target.value)}
                    className="w-20 bg-[#131316] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold text-white outline-none placeholder:text-slate-700 hover:border-white/20 transition-colors"
                  />
                </div>
              </div>
            </motion.form>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex flex-wrap justify-center gap-3"
            >
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setUserNeed(prompt)}
                  className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-xs text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300"
                >
                  {prompt}
                </button>
              ))}
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-red-400 bg-red-400/10 border border-red-400/20 px-6 py-4 rounded-xl text-center text-sm font-medium mx-auto max-w-lg"
              >
                {error}
              </motion.div>
            )}

            {results && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center pt-12 text-slate-500 animate-bounce cursor-pointer"
                onClick={() => resultsRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest mb-2">Scroll to Results</span>
                <ArrowDown className="w-4 h-4" />
              </motion.div>
            )}
          </div>
        </motion.main>

        {/* ─── RESULTS DASHBOARD (Scrolling Experience) ─── */}
        {results && activeGrade && activePhysics && (
          <div ref={resultsRef} className="relative w-full bg-[#0a0a0c]/95 border-t border-white/5 pb-32">
            
            {/* No Global Context Bar anymore, controls moved to specific sections */}

            <div className="max-w-6xl mx-auto px-6 pt-16 space-y-32">
              
              {/* SECTION: Candidates */}
              <ScrollSection title="RECOMMENDATIONS" subtitle="What we recommend">
                <div className="mb-8">
                  <p className="text-xl text-slate-300 font-light leading-relaxed mb-6">
                    Based on your requirements, we've shortlisted these stainless steel grades. 
                    <strong className="text-white font-semibold"> Select a grade to visualize its physical limits below.</strong>
                  </p>
                  <GradeAccordion 
                    grades={results.recommendations}
                    activeIdx={activeGradeIdx}
                    onSelect={setActiveGradeIdx}
                    livePhysics={livePhysics}
                  />
                </div>
              </ScrollSection>

              {/* SECTION: Selected Grade Deep Dive (Radar + AI Notes) */}
              <ScrollSection title="PERFORMANCE PROFILE" subtitle={`Grade ${activeGrade.grade} Analysis`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="order-2 lg:order-1 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-amber-500/5 rounded-full blur-3xl -z-10" />
                    <RadarChart grades={results.recommendations.filter((_, i) => i === activeGradeIdx)} />
                  </div>
                  <div className="order-1 lg:order-2 space-y-8">
                    <div>
                      <h3 className="text-3xl font-bold tracking-tight text-white mb-4">Why {activeGrade.grade}?</h3>
                      <p className="text-lg text-slate-400 font-light leading-relaxed">
                        {activeGrade.ai_explanation}
                      </p>
                    </div>
                    
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Info className="w-24 h-24 text-amber-500" />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Trade-offs to consider</h4>
                      <p className="text-amber-200/80 leading-relaxed font-medium relative z-10">
                        {activeGrade.trade_off_notes}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <MetricCard icon={<Shield/>} label="Corrosion" value={`${activeGrade.corrosion_resistance}/5`} />
                       <MetricCard icon={<Thermometer/>} label="Max Temp" value={`${activeGrade.max_service_temp_c}°C`} />
                       <MetricCard icon={<Zap/>} label="Weldability" value={activeGrade.weldability} />
                       <MetricCard icon={<Activity/>} label="Yield Strength" value={`${activeGrade.yield_strength_mpa} MPa`} />
                    </div>
                  </div>
                </div>
              </ScrollSection>

              {/* SECTION: Bending Physics */}
              <ScrollSection title="STRUCTURAL DEFLECTION" subtitle="3-Point Bending Simulation">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  <div className="lg:col-span-5 space-y-6">
                    <h3 className="text-3xl font-bold tracking-tight text-white">Flexibility & Yielding</h3>
                    <p className="text-slate-400 font-light leading-relaxed text-lg">
                      Visualizing the elastic curve of a span under a central point load. 
                      Adjust the physical dimensions below to see how geometry affects stiffness.
                    </p>

                    {/* Parameters Control Panel for Bending */}
                    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4 shadow-inner">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Test Parameters</h4>
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-400">Span Length (mm)</span>
                          <span className="text-sm font-mono font-bold text-white">{activeLength}</span>
                        </div>
                        <input type="range" min="100" max="5000" step="10" value={activeLength} onChange={e => setActiveLength(Number(e.target.value))} className="w-full accent-amber-500" />
                        
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-semibold text-slate-400">Cross Section</span>
                          <div className="flex items-center gap-2">
                            <select value={shape} onChange={e => setShape(e.target.value as "round"|"square")} className="bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs font-bold text-amber-500 outline-none cursor-pointer">
                              <option value="round">Round</option>
                              <option value="square">Square</option>
                            </select>
                            <span className="text-sm font-mono font-bold text-white ml-2">{activeDimension} mm</span>
                          </div>
                        </div>
                        <input type="range" min="5" max="100" step="1" value={activeDimension} onChange={e => setActiveDimension(Number(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                    </div>

                    <ul className="space-y-3 text-sm text-slate-500 pt-2">
                      <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"/> Below 70% yield: Infinite elastic life</li>
                      <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"/> 70% - 100%: Critical stress zone</li>
                      <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-red-500"/> &gt;100%: Permanent plastic deformation</li>
                    </ul>
                  </div>
                  <div className="lg:col-span-7 bg-[#111114] border border-white/5 rounded-3xl p-6 shadow-2xl">
                    <BendingVisualizer 
                      physics={activePhysics} gradeLabel={activeGrade.grade} 
                      diameter_mm={activeDimension} length_mm={activeLength} 
                    />
                  </div>
                </div>
              </ScrollSection>

              {/* SECTION: Tensile Physics */}
              <ScrollSection title="AXIAL STRESS" subtitle="Tensile Failure Simulation">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  <div className="lg:col-span-6 order-2 lg:order-1 bg-[#111114] border border-white/5 rounded-3xl p-6 shadow-2xl flex justify-center">
                    <div className="w-full max-w-sm">
                      <TensileVisualizer 
                        physics={activePhysics} gradeLabel={activeGrade.grade} 
                        diameter_mm={activeDimension} length_mm={activeLength} 
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
                    <h3 className="text-3xl font-bold tracking-tight text-white">Pulling to Destruction</h3>
                    <p className="text-slate-400 font-light leading-relaxed text-lg">
                      Axial loads stress the entire cross-section uniformly. We simulate the transition from elastic stretching to plastic necking and ultimate fracture.
                    </p>

                    {/* Parameters Control Panel for Tensile */}
                    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4 shadow-inner mt-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Geometry</h4>
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-400">Specimen Length (mm)</span>
                          <span className="text-sm font-mono font-bold text-white">{activeLength}</span>
                        </div>
                        <input type="range" min="100" max="5000" step="10" value={activeLength} onChange={e => setActiveLength(Number(e.target.value))} className="w-full accent-amber-500" />
                        
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-semibold text-slate-400">Cross Section</span>
                          <div className="flex items-center gap-2">
                            <select value={shape} onChange={e => setShape(e.target.value as "round"|"square")} className="bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs font-bold text-amber-500 outline-none cursor-pointer">
                              <option value="round">Round</option>
                              <option value="square">Square</option>
                            </select>
                            <span className="text-sm font-mono font-bold text-white ml-2">{activeDimension} mm</span>
                          </div>
                        </div>
                        <input type="range" min="5" max="100" step="1" value={activeDimension} onChange={e => setActiveDimension(Number(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                       <MetricCard label="Yield Load (Axial)" value={`${activePhysics.yield_load_kg.toLocaleString()} kg`} highlight />
                       <MetricCard label="Fracture Load" value={`${activePhysics.fracture_load_kg.toLocaleString()} kg`} highlight />
                       <MetricCard label="Max Elongation" value={`${activePhysics.total_elongation_mm} mm`} />
                       <MetricCard label="Cross Section Area" value={`${activePhysics.cross_section_area_mm2} mm²`} />
                    </div>
                  </div>
                </div>
              </ScrollSection>

              {/* SECTION: Corrosion */}
              <ScrollSection title="ENVIRONMENTAL DECAY" subtitle="Surface Degradation Model">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  <div className="lg:col-span-5 space-y-6">
                    <h3 className="text-3xl font-bold tracking-tight text-white">The Test of Time</h3>
                    <p className="text-slate-400 font-light leading-relaxed text-lg">
                      Stainless steel relies on a microscopic Chromium Oxide (Cr₂O₃) passive film. When environmental aggressiveness overcomes the Pitting Resistance Equivalent Number (PREN), localized corrosion initiates.
                    </p>
                    <p className="text-sm text-slate-500">
                      Use the timeline to see how this grade's surface breaks down across different atmospheric conditions.
                    </p>
                  </div>
                  <div className="lg:col-span-7 bg-[#111114] border border-white/5 rounded-3xl p-6 shadow-2xl">
                    <CorrosionVisualizer gradeLabel={activeGrade.grade} corrosionResistance={activeGrade.corrosion_resistance} />
                  </div>
                </div>
              </ScrollSection>

            </div>
          </div>
        )}

        <div className="fixed bottom-5 right-6 flex items-center gap-2 select-none pointer-events-none z-50">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Powered by</span>
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-500">Jindal Stainless</span>
        </div>
      </div>
    </>
  );
}

// ─── Scroll Reveal Wrapper ───
function ScrollSection({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <div className="mb-10">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-amber-500 mb-2">{title}</h2>
        <h3 className="text-4xl font-light tracking-tight text-white">{subtitle}</h3>
      </div>
      {children}
    </motion.section>
  );
}

// ─── Small Metric Card ───
function MetricCard({ icon, label, value, highlight }: { icon?: React.ReactNode, label: string, value: string, highlight?: boolean }) {
  return (
    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-500">
        {icon && <div className="text-amber-500">{icon}</div>}
        <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <span className={`font-mono text-xl font-bold ${highlight ? 'text-amber-500' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
