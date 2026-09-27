"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { AIAnalysisResult } from "@/lib/api";
import { getGradeData } from "@/lib/gradeData";
import { ArrowUpRight, Maximize, Sun, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpiderChart } from "./SpiderChart";
import { TensileSimulator } from "./TensileSimulator";
import { BendingSimulator } from "./BendingSimulator";
import { CorrosionSimulator } from "./CorrosionSimulator";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ResultsAccordion({ data, onRefine }: { data: AIAnalysisResult; onRefine?: (q: string) => void }) {
  const [active, setActive] = useState(0);
  const router = useRouter();
  
  // Shared state for physics simulators (Bending and Tensile)
  const [sharedDiameter, setSharedDiameter] = useState(20);
  const [sharedLength, setSharedLength] = useState(1000);

  // Fallback images in case local images aren't found or loaded yet
  const fallbacks = [
    "/grade images/304/image.png",
    "/grade images/316/image.png",
    "/grade images/409/image.png",
    "/grade images/430/image.png",
    "/grade images/2205/image.png"
  ];

  const activeRec = data.recommendations?.[active];

  return (
    <div className="w-full flex flex-col items-center gap-8 pb-12 max-w-7xl mx-auto pt-4 relative">
      
      {/* Compare Button */}
      <div className="w-full px-4 flex justify-end">
        <button 
          onClick={() => {
            sessionStorage.setItem('compare_data', JSON.stringify(data));
            router.push('/compare');
          }}
          className="flex items-center gap-2 text-xs font-monument uppercase tracking-[0.2em] text-white bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-full transition-colors"
        >
          Compare All Results <Maximize className="w-3 h-3" />
        </button>
      </div>

      {/* --- 1. ACCORDION CARDS --- */}
      <div 
        className="flex h-[55vh] min-h-[400px] w-full gap-3 px-4"
        style={{ perspective: "2000px" }}
      >
        {data.recommendations?.map((rec, i) => {
          const isActive = active === i;
          const gradeDetails = getGradeData(rec.grade);
          
          return (
            <motion.div
              key={rec.grade}
              layout
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              whileHover={{ 
                y: -15,
                z: 40,
                rotateX: 4,
                rotateY: -2,
                scale: 1.02, 
                boxShadow: "-15px 40px 80px -20px rgba(0,0,0,1), 0 0 40px rgba(255,255,255,0.1)",
                zIndex: 20
              }}
              className={cn(
                "group relative overflow-hidden rounded-[2rem] cursor-pointer bg-[#0a0a0a] border border-[#222]",
                isActive ? "flex-[4] sm:flex-[5] z-10 shadow-2xl" : "flex-[1] z-0"
              )}
              style={{ transformStyle: "preserve-3d" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Image */}
              <motion.img
                layout
                src={`/grade images/${rec.grade}/image.png`}
                onError={(e) => { 
                  const fallbackSrc = fallbacks[i % fallbacks.length];
                  if (!e.currentTarget.src.endsWith(fallbackSrc)) {
                    e.currentTarget.src = fallbackSrc;
                  }
                }}
                className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-screen"
                alt={rec.grade}
              />

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
              {!isActive && <div className="absolute inset-0 bg-black/60 transition-colors hover:bg-black/30" />}

              {/* Top Toolbar (Visible only on active) */}
              {isActive && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 0.3 }}
                  className="absolute top-6 left-6 flex items-center gap-4 bg-black/40 backdrop-blur-md rounded-xl p-3 border border-white/10 text-white/70"
                >
                  <Maximize className="w-4 h-4 hover:text-white transition-colors cursor-pointer" />
                  <Sun className="w-4 h-4 hover:text-white transition-colors cursor-pointer" />
                  <RefreshCw className="w-4 h-4 hover:text-white transition-colors cursor-pointer" />
                </motion.div>
              )}

              {/* Content Inside Card */}
              <motion.div className="absolute bottom-0 left-0 w-full h-full p-8 flex flex-col justify-end text-white z-10 pointer-events-none">
                {isActive ? (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="font-instrument text-6xl md:text-8xl font-bold uppercase tracking-tighter drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] leading-none text-white">
                      {rec.grade}
                    </h2>
                    <span className="font-monument text-lg md:text-xl font-bold tracking-[0.3em] text-white/70 uppercase mt-2 md:mt-4 block drop-shadow-md">
                      {gradeDetails?.type || "ALLOY"}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div className="absolute bottom-8 left-0 w-full px-2 flex flex-col items-center text-center">
                    <span className="font-instrument text-4xl font-bold tracking-[0.2em] text-white opacity-90 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] uppercase">
                      {rec.grade}
                    </span>
                    <span className="font-monument text-xs font-bold tracking-widest text-white/60 uppercase mt-1 hidden sm:block">
                      {gradeDetails?.type || "ALLOY"}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* --- 2. DETAILED INFO & SIMULATION PANEL BELOW --- */}
      <AnimatePresence mode="wait">
        {activeRec && (
          <motion.div 
            key={activeRec.grade}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full px-4 flex flex-col gap-6 z-10 relative"
          >
            {/* ROW 1: Text Explanation & Spider Chart */}
            <div className="flex flex-col lg:flex-row gap-6 w-full">
              {/* Left: Text Explanation Panel */}
              <div className="flex-[2] bg-black/60 backdrop-blur-xl rounded-[2rem] border border-white/10 p-8 md:p-10 relative overflow-hidden flex flex-col justify-between">
                 {/* Subtle background glow */}
                 <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                 
                 <div className="relative z-10">
                   <span className="px-5 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-sm uppercase tracking-[0.2em] w-fit font-monument mb-6 block">
                     {getGradeData(activeRec.grade)?.type || "ALLOY"}
                   </span>
                   
                   <h3 className="text-4xl md:text-5xl font-instrument font-bold text-white mb-6 uppercase tracking-tight flex items-center gap-4">
                     {activeRec.grade}
                   </h3>
                   
                   <p className="text-[#C7CDD4] font-suisse text-lg leading-relaxed max-w-3xl">
                     {activeRec.ai_explanation}
                   </p>
                   
                   {/* Quick Metrics */}
                   <div className="flex flex-wrap gap-4 mt-8">
                     <div className="bg-black/50 border border-white/10 rounded-xl px-5 py-3 flex flex-col items-start">
                       <span className="text-white/40 font-monument text-[10px] uppercase tracking-widest mb-1">Yield Strength</span>
                       <span className="text-white font-instrument text-xl font-bold">{activeRec.yield_strength_mpa} MPa</span>
                     </div>
                     <div className="bg-black/50 border border-white/10 rounded-xl px-5 py-3 flex flex-col items-start">
                       <span className="text-white/40 font-monument text-[10px] uppercase tracking-widest mb-1">Corrosion</span>
                       <span className="text-white font-instrument text-xl font-bold">{activeRec.corrosion_resistance}</span>
                     </div>
                     <div className="bg-black/50 border border-white/10 rounded-xl px-5 py-3 flex flex-col items-start">
                       <span className="text-white/40 font-monument text-[10px] uppercase tracking-widest mb-1">Weldability</span>
                       <span className="text-white font-instrument text-xl font-bold">{activeRec.weldability}</span>
                     </div>
                   </div>

                   {activeRec.trade_off_notes && (
                     <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 max-w-3xl">
                       <h4 className="text-[#FF851B] font-monument uppercase tracking-widest text-sm mb-3 flex items-center gap-2">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                         Trade-offs to consider
                       </h4>
                       <p className="text-base text-white/80 font-suisse leading-relaxed">{activeRec.trade_off_notes}</p>
                     </div>
                   )}
                   
                   <div className="mt-8 relative z-10">
                     <Link href={`/specs/${activeRec.grade}`}>
                       <button onClick={() => sessionStorage.setItem('current_ai_rec', JSON.stringify(activeRec))} className="flex items-center gap-3 text-sm font-monument uppercase tracking-[0.2em] text-white hover:text-[#0074D9] transition-colors w-fit group border border-white/20 rounded-full px-8 py-4 hover:border-[#0074D9]/50 bg-black/50 hover:bg-black/80">
                         View Complete Data Sheet <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                       </button>
                     </Link>
                   </div>
                 </div>
              </div>

              {/* Right: Simulation / Spider Chart Panel */}
              <div className="flex-[1] bg-black/60 backdrop-blur-xl rounded-[2rem] border border-white/10 p-8 flex flex-col items-center justify-center shrink-0 min-h-[400px]">
                 <h3 className="font-monument text-sm tracking-widest text-white/50 uppercase text-center mb-6 flex items-center gap-2">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
                   Performance Matrix
                 </h3>
                 
                 <div className="w-full h-[350px]">
                   <SpiderChart 
                      corrosion={activeRec.corrosion_resistance || "Good"} 
                      weldability={activeRec.weldability || "Good"} 
                      strength={activeRec.yield_strength_mpa || 300} 
                      maxTemp={activeRec.max_service_temp_c || 500} 
                   />
                 </div>
              </div>
            </div>

            {/* Refine Search Bar */}
            {onRefine && (
              <div className="w-full flex flex-col items-center gap-4 mt-8 mb-6 relative z-20">
                <span className="text-[#0074D9] font-instrument font-bold uppercase tracking-[0.2em] text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Refine your recommendation
                </span>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const input = form.elements.namedItem("refine") as HTMLInputElement;
                    if (input.value.trim()) onRefine(input.value.trim());
                  }}
                  className="w-full md:w-3/4 flex items-center bg-[#0B1222]/80 backdrop-blur-xl border border-[#0074D9]/30 rounded-full p-2 pl-8 focus-within:border-[#0074D9] focus-within:ring-2 focus-within:ring-[#0074D9]/50 transition-all shadow-[0_0_30px_rgba(0,116,217,0.15)]"
                >
                  <input 
                    name="refine"
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. Needs to withstand sulfuric acid..."
                    className="flex-1 bg-transparent text-white font-suisse text-base md:text-lg outline-none placeholder:text-white/40"
                  />
                  <button type="submit" className="bg-[#0074D9] hover:bg-[#0074D9]/80 text-white px-8 py-3 rounded-full font-monument font-bold uppercase tracking-widest text-sm transition-colors shadow-lg ml-4">
                    Refine
                  </button>
                </form>
              </div>
            )}

            {/* ROW 2: Physics Simulations */}
            {activeRec.physics && (
              <div className="flex flex-col gap-8 w-full mt-4">
                <BendingSimulator 
                  physics={activeRec.physics} 
                  yieldStrengthMpa={activeRec.yield_strength_mpa} 
                  diameter={sharedDiameter} 
                  length={sharedLength} 
                  onDiameterChange={setSharedDiameter} 
                  onLengthChange={setSharedLength} 
                />
                <TensileSimulator 
                  physics={activeRec.physics} 
                  yieldStrengthMpa={activeRec.yield_strength_mpa} 
                  diameter={sharedDiameter} 
                  length={sharedLength} 
                  onDiameterChange={setSharedDiameter} 
                  onLengthChange={setSharedLength} 
                />
                <CorrosionSimulator corrosionGrade={activeRec.corrosion_resistance} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
