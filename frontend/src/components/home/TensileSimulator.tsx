"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PhysicsNumbers } from "@/lib/api";

function calculateTensilePhysics(diameterMm: number, lengthMm: number, loadKg: number, yieldStrengthMpa: number) {
  const forceN = loadKg * 9.81;
  const radius = diameterMm / 2;
  const area = Math.PI * radius * radius;
  const stressMpa = forceN / area;
  const elasticModulusMpa = 193000;
  const stretchMm = (forceN * lengthMm) / (area * elasticModulusMpa);
  const yieldForceN = yieldStrengthMpa * area;
  const yieldLoadKg = yieldForceN / 9.81;
  const isSafe = stressMpa < yieldStrengthMpa;
  const stressRatio = stressMpa / yieldStrengthMpa;

  return { area, stressMpa, stretchMm, yieldLoadKg, isSafe, stressRatio };
}

export function TensileSimulator({ 
  physics, yieldStrengthMpa, diameter, length, onDiameterChange, onLengthChange 
}: { 
  physics: PhysicsNumbers; yieldStrengthMpa: number;
  diameter: number; length: number;
  onDiameterChange: (val: number) => void; onLengthChange: (val: number) => void;
}) {
  const [load, setLoad] = useState(50);

  const dynamicPhysics = calculateTensilePhysics(diameter, length, load, yieldStrengthMpa);
  const isBroken = !dynamicPhysics.isSafe;
  const displayStretch = dynamicPhysics.stretchMm;
  
  // Visual stretch mapping
  const maxVisualStretch = 40;
  const visualStretch = isBroken ? maxVisualStretch * 1.5 : dynamicPhysics.stressRatio * maxVisualStretch;
  const visualThickness = isBroken ? Math.max(2, (diameter/100) * 30 * 0.4) : Math.max(4, (diameter/100) * 30 * (1 - (dynamicPhysics.stressRatio * 0.3))); 

  return (
    <div className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 relative overflow-hidden flex flex-col gap-8 group">
      
      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div>
          <h4 className="text-white font-instrument text-3xl font-bold uppercase tracking-wide">Stretch Test</h4>
          <p className="text-white/50 font-monument text-sm tracking-[0.1em] uppercase">Force pulling the rod apart</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className={`font-instrument text-5xl font-bold tracking-tight transition-colors ${isBroken ? 'text-red-500' : 'text-[#1B8A3D]'}`}>
            {isBroken ? 'FAILED' : 'SAFE'}
          </span>
          {isBroken && <span className="text-red-500/70 font-monument text-xs uppercase tracking-widest">Rod Snapped</span>}
        </div>
      </div>

      {/* Realistic 2D Visualizer */}
      <div className="relative w-full h-48 bg-gradient-to-b from-white/5 to-transparent rounded-2xl border border-white/10 flex items-center justify-center mt-2 z-10 overflow-hidden shadow-inner">

         
         <div className="relative w-[100%] h-full flex flex-col items-center justify-start py-4">
            
            {/* Top Anchor (Clamp) */}
            <div className="w-24 h-4 bg-gradient-to-b from-gray-700 to-gray-800 rounded-b-md shadow-lg border-b border-gray-500 z-20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gray-900 border border-gray-600" />
              <div className="w-4 h-4 rounded-full bg-gray-900 border border-gray-600 ml-4" />
            </div>
            
            {/* The Top Half of the Rod */}
            <motion.div 
               animate={{ 
                 height: 40 + (visualStretch / 2),
                 width: visualThickness
               }}
               transition={{ type: "spring", stiffness: 100, damping: 10 }}
               className={`shadow-[0_0_15px_rgba(255,255,255,0.2)] ${isBroken ? 'bg-gradient-to-b from-[#e0e0e0] to-[#ff4444] rounded-b-full' : 'bg-gradient-to-b from-[#e0e0e0] via-[#888888] to-[#e0e0e0]'}`}
               style={{ minHeight: "20px" }}
            />

            {/* The Snap Gap (Only visible if broken) */}
            {isBroken && (
              <motion.div 
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 20, opacity: 1 }}
                 className="w-full relative flex items-center justify-center"
              >
                <div className="absolute text-red-500 font-bold text-xs">SNAP!</div>
              </motion.div>
            )}

            {/* The Bottom Half of the Rod */}
            <motion.div 
               animate={{ 
                 height: 40 + (visualStretch / 2),
                 width: visualThickness
               }}
               transition={{ type: "spring", stiffness: 100, damping: 10 }}
               className={`shadow-[0_0_15px_rgba(255,255,255,0.2)] ${isBroken ? 'bg-gradient-to-t from-[#e0e0e0] to-[#ff4444] rounded-t-full' : 'hidden'}`}
               style={{ minHeight: "20px" }}
            />

            {/* Bottom Anchor (Pulling weight) */}
            <motion.div 
               animate={{ y: isBroken ? 20 : 0 }}
               transition={{ type: "spring", stiffness: 100, damping: 10 }}
               className="z-20 flex flex-col items-center"
            >
              <div className="w-24 h-4 bg-gradient-to-t from-gray-700 to-gray-800 rounded-t-md shadow-lg border-t border-gray-500 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-gray-900 border border-gray-600" />
                <div className="w-4 h-4 rounded-full bg-gray-900 border border-gray-600 ml-4" />
              </div>
              <div className="mt-2 px-6 py-2 bg-[#1B8A3D] text-white font-mono font-bold text-sm rounded shadow-lg flex items-center gap-2">
                ↓ {load} kg ↓
              </div>
            </motion.div>

         </div>
      </div>

      {/* Data Readouts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10">
         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
           <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Stretch Distance</div>
           <div className={`font-mono font-bold text-lg ${isBroken ? 'text-red-400' : 'text-white'}`}>{displayStretch.toFixed(3)} mm</div>
         </div>
         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
           <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Internal Stress</div>
           <div className={`font-mono font-bold text-lg ${isBroken ? 'text-red-400' : 'text-white'}`}>{dynamicPhysics.stressMpa.toFixed(0)} MPa</div>
         </div>
         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
           <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Max Safe Load</div>
           <div className="font-mono font-bold text-white/80 text-lg">{dynamicPhysics.yieldLoadKg.toFixed(0)} kg</div>
         </div>
         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
           <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Safety Margin</div>
           <div className={`font-mono font-bold text-lg ${isBroken ? 'text-red-400' : 'text-green-400'}`}>{load === 0 ? "Infinite" : (dynamicPhysics.yieldLoadKg / load).toFixed(2) + "x"}</div>
         </div>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-6 z-10 mt-2 bg-black/30 p-6 rounded-2xl border border-white/5">
        {/* Diameter Slider */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-xs font-monument text-white/70 uppercase tracking-widest">
            <span>Rod Thickness <span className="text-white font-bold text-sm ml-2">{diameter} mm</span></span>
            <span>100 mm</span>
          </div>
          <input type="range" min="5" max="100" value={diameter} onChange={e => onDiameterChange(Number(e.target.value))} className="w-full accent-[#1B8A3D] h-2 bg-white/10 rounded-full appearance-none outline-none cursor-pointer" />
        </div>

        {/* Length Slider */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-xs font-monument text-white/70 uppercase tracking-widest">
            <span>Rod Length <span className="text-white font-bold text-sm ml-2">{length} mm</span></span>
            <span>3000 mm</span>
          </div>
          <input type="range" min="100" max="3000" step="50" value={length} onChange={e => onLengthChange(Number(e.target.value))} className="w-full accent-[#1B8A3D] h-2 bg-white/10 rounded-full appearance-none outline-none cursor-pointer" />
        </div>

        {/* Load Slider */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-xs font-monument text-white/70 uppercase tracking-widest">
            <span>Pulling Weight <span className="text-[#FF851B] font-bold text-sm ml-2">{load} kg</span></span>
            <span>{Math.max(5000, dynamicPhysics.yieldLoadKg * 1.5).toFixed(0)} kg</span>
          </div>
          <input type="range" min="50" max={Math.max(5000, dynamicPhysics.yieldLoadKg * 1.5)} step="50" value={load} onChange={e => setLoad(Number(e.target.value))} className="w-full accent-[#FF851B] h-2 bg-white/10 rounded-full appearance-none outline-none cursor-pointer" />
        </div>
      </div>

    </div>
  );
}
