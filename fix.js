const fs = require('fs');

let content = `
"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getGradeData } from "@/lib/gradeData";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const ELEMENT_NAMES: Record<string, string> = {
  c: "Carbon",
  cr: "Chromium",
  ni: "Nickel",
  mo: "Molybdenum",
  mn: "Manganese",
  si: "Silicon",
  p: "Phosphorus",
  s: "Sulfur",
  n: "Nitrogen",
  ti: "Titanium",
  cu: "Copper",
  nb: "Niobium",
  v: "Vanadium",
  w: "Tungsten",
  co: "Cobalt",
  al: "Aluminum",
  fe: "Iron"
};

const getElementName = (symbol: string) => {
  const lower = symbol.toLowerCase();
  return ELEMENT_NAMES[lower] || symbol;
};

let isHydrated = false;

export default function GradeSpecPage({ params }: { params: Promise<{ grade: string }> }) {
  const { grade } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [aiContext, setAiContext] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    isHydrated = true;
    setMounted(true);
    
    // Get grade data
    const gradeParam = grade;
    const gradeData = getGradeData(gradeParam);
    if (gradeData) {
      setData(gradeData);
    }
    
    // Get AI context if available
    const storedRecs = sessionStorage.getItem("gradewise_last_recs");
    if (storedRecs) {
      try {
        const recs = JSON.parse(storedRecs);
        const match = recs.find((r: any) => r.grade.toLowerCase() === gradeParam.toLowerCase());
        if (match) {
          setAiContext(match);
        }
      } catch (e) {}
    }
  }, [grade]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#0B1222]"></div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1222] text-white">
        <div className="text-center">
          <h1 className="text-4xl font-instrument font-bold mb-4">Grade Not Found</h1>
          <button onClick={() => router.back()} className="text-[#0074D9] font-monument uppercase text-sm hover:text-white transition-colors">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1222] text-white overflow-x-hidden relative">
      {/* Background Graphic */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1222] via-[#0B1222]/90 to-[#0B1222]" />
        <div className="absolute top-0 right-0 w-1/2 h-[50vh] bg-[#0074D9]/10 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-1/2 h-[50vh] bg-[#FF851B]/5 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        
        {/* Navigation */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors uppercase font-monument tracking-widest text-sm mb-12"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Results
        </button>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 border-b border-white/10 pb-12"
        >
          <div className="flex items-center gap-4 mb-4">
            <span className="px-4 py-1.5 bg-[#0074D9]/20 text-[#66B2FF] border border-[#0074D9]/80 rounded-full text-[10px] font-bold font-monument uppercase tracking-widest shadow-[0_0_15px_rgba(0,116,217,0.2)]">
              {data.type} ALLOY
            </span>
          </div>
          <h1 className="text-7xl md:text-9xl font-instrument font-bold tracking-tighter drop-shadow-xl">{data.grade}</h1>
          <p className="text-xl md:text-2xl font-suisse text-white/70 max-w-3xl mt-6 leading-relaxed">{data.description}</p>
        </motion.div>

        {/* Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Specs Column */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* AI Insights (If Available) */}
            {aiContext && aiContext.grade === data.grade && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0074D9]/10 backdrop-blur-md rounded-2xl p-8 border border-[#0074D9]/30 relative overflow-hidden">
                <h2 className="text-2xl font-instrument font-bold uppercase tracking-wide mb-6 text-[#0074D9] flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#0074D9] animate-pulse" /> Recommendation Context
                </h2>
                <div className="space-y-6 relative z-10">
                  <div>
                    <h3 className="text-[10px] uppercase font-monument tracking-widest text-white/50 mb-3">Why this grade?</h3>
                    <p className="text-lg font-suisse text-white/90 leading-relaxed">{aiContext.ai_explanation}</p>
                  </div>
                  <div className="p-5 bg-[#C62828]/10 rounded-xl border border-[#C62828]/20">
                    <h3 className="text-[10px] uppercase font-monument tracking-widest text-[#FF851B] mb-3 flex items-center gap-2">
                      <ShieldAlert className="w-3 h-3"/> Trade-offs to consider
                    </h3>
                    <p className="text-sm font-suisse text-[#FF851B]/90 leading-relaxed">{aiContext.trade_off_notes}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl font-instrument font-bold uppercase tracking-wide mb-6 text-white">Mechanical Properties</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-[10px] uppercase font-monument tracking-widest text-white/40 mb-2">Yield Strength</div>
                  <div className="text-3xl font-instrument text-white">{data.yieldStrengthMpa} <span className="text-sm font-suisse text-white/40">MPa</span></div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-monument tracking-widest text-white/40 mb-2">Tensile Strength</div>
                  <div className="text-3xl font-instrument text-white">{data.tensileStrengthMpa} <span className="text-sm font-suisse text-white/40">MPa</span></div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-monument tracking-widest text-white/40 mb-2">PREN (Pitting Resistance)</div>
                  <div className="text-3xl font-instrument text-white">{data.pren}</div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl font-instrument font-bold uppercase tracking-wide mb-6 text-white">Chemical Composition</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {data.composition && Object.entries(data.composition).map(([element, value]) => (
                  <div key={element} className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="text-[10px] uppercase font-monument tracking-widest text-[#0074D9] mb-2">{getElementName(element)}</div>
                    <div className="text-xl font-monument text-white">{value as string}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-8">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <h2 className="text-xl font-instrument font-bold uppercase tracking-wide mb-6 text-[#FF851B]">Environmental Ratings</h2>
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] uppercase font-monument tracking-widest text-white/40 mb-2">Max Service Temp</div>
                  <div className="text-2xl font-instrument text-white bg-black/40 px-5 py-4 rounded-lg border border-white/5">{data.maxTempC} <span className="text-sm font-suisse text-white/40">°C</span></div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-monument tracking-widest text-white/40 mb-2">Cost Tier (1-5)</div>
                  <div className="bg-black/40 px-5 py-4 rounded-lg border border-white/5 flex items-center justify-between">
                     <div className="text-2xl font-instrument text-white">{data.costTier}</div>
                     <div className="flex gap-[2px]">
                       {[1,2,3,4,5].map(tier => (
                         <div key={tier} className={`h-2.5 w-4 ${tier <= data.costTier ? "bg-[#FF851B]" : "bg-white/10"}`} />
                       ))}
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <h2 className="text-xl font-instrument font-bold uppercase tracking-wide mb-6 text-white">Fabrication</h2>
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] uppercase font-monument tracking-widest text-white/40 mb-2">Weldability (1-5)</div>
                  <div className="text-2xl font-instrument text-white bg-black/40 px-5 py-4 rounded-lg border border-white/5 flex items-center justify-between">
                    {data.weldability} <span className="text-[10px] font-monument text-white/40 uppercase tracking-widest">/ 5</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-monument tracking-widest text-white/40 mb-2">Machinability (1-5)</div>
                  <div className="text-2xl font-instrument text-white bg-black/40 px-5 py-4 rounded-lg border border-white/5 flex items-center justify-between">
                    {data.machinability} <span className="text-[10px] font-monument text-white/40 uppercase tracking-widest">/ 5</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('frontend/src/app/specs/[grade]/page.tsx', content.trim() + '\n', 'utf8');
