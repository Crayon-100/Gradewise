"use client";

import { motion } from "framer-motion";
import { PhysicsNumbers } from "@/lib/api";

export function TensileWidget({ physics }: { physics: PhysicsNumbers }) {
  // Normalize load to a 0-100% bar (assuming max 25,000kg for consumer demo scales)
  const loadPercentage = Math.min(100, (physics.yield_load_kg / 25000) * 100);

  return (
    <div className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group">
      <div className="flex items-center justify-between mb-8 z-10">
        <div>
          <h4 className="text-white font-instrument text-2xl font-bold uppercase tracking-wide">Tensile Yield</h4>
          <p className="text-white/50 font-monument text-xs tracking-[0.1em] uppercase">Axial Pull Force</p>
        </div>
        <div className="text-right">
          <span className="text-[#FF851B] font-instrument text-4xl font-bold tracking-tight">
            {physics.yield_load_kg.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xl">kg</span>
          </span>
        </div>
      </div>

      {/* Visual Bar representation */}
      <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden z-10 mt-4">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${loadPercentage}%` }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#1B8A3D] to-[#2ECC40]"
        />
      </div>
      <div className="flex justify-between mt-2 text-white/40 font-monument text-[10px] uppercase tracking-widest z-10">
        <span>0 kg</span>
        <span>Elongation: {physics.total_elongation_mm.toFixed(1)} mm</span>
      </div>

      {/* Background Graphic */}
      <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-translate-y-2">
        <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
    </div>
  );
}

export function BendingWidget({ physics }: { physics: PhysicsNumbers }) {
  // Normalize load to a 0-100% bar (assuming max 2,000kg for consumer demo scales)
  const loadPercentage = Math.min(100, (physics.bending_yield_load_kg / 2000) * 100);

  return (
    <div className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group">
      <div className="flex items-center justify-between mb-8 z-10">
        <div>
          <h4 className="text-white font-instrument text-2xl font-bold uppercase tracking-wide">Bending Yield</h4>
          <p className="text-white/50 font-monument text-xs tracking-[0.1em] uppercase">Mid-Point Deflection</p>
        </div>
        <div className="text-right">
          <span className="text-[#0074D9] font-instrument text-4xl font-bold tracking-tight">
            {physics.bending_yield_load_kg.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xl">kg</span>
          </span>
        </div>
      </div>

      {/* Visual Bar representation */}
      <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden z-10 mt-4">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${loadPercentage}%` }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#0074D9] to-[#7FDBFF]"
        />
      </div>
      <div className="flex justify-between mt-2 text-white/40 font-monument text-[10px] uppercase tracking-widest z-10">
        <span>0 kg</span>
        <span>Deflection: {physics.deflection_at_yield_mm.toFixed(1)} mm</span>
      </div>

      {/* Background Graphic */}
      <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-translate-y-2">
        <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14a10 10 0 0 1 16 0"/><path d="M2 16h20"/>
        </svg>
      </div>
    </div>
  );
}
