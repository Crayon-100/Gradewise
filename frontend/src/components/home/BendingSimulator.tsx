"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PhysicsNumbers } from "@/lib/api";
import { calculateBendingPhysics } from "@/lib/physics";

export function BendingSimulator({ 
  physics, yieldStrengthMpa, diameter, length, onDiameterChange, onLengthChange 
}: { 
  physics: PhysicsNumbers; yieldStrengthMpa: number;
  diameter: number; length: number;
  onDiameterChange: (val: number) => void; onLengthChange: (val: number) => void;
}) {
  const [load, setLoad] = useState(10);

  // Re-calculate the physics dynamically
  const dynamicPhysics = calculateBendingPhysics({
    shape: "round",
    diameterMm: diameter,
    lengthMm: length,
    loadKg: load,
    yieldStrengthMpa: yieldStrengthMpa
  });
  
  const displayBend = dynamicPhysics.maxDeflectionMm;
  const isBroken = !dynamicPhysics.isSafe;

  // Calculate visual bend curve (Q control point Y value)
  // Center is at Y=50. Max bend goes to Y=150.
  const maxVisualBend = 100; 
  const currentBend = isBroken ? maxVisualBend : dynamicPhysics.stressRatio * (maxVisualBend * 0.8);
  const controlPointY = 50 + currentBend;

  return (
    <div className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 relative overflow-hidden flex flex-col gap-8 group">
      
      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div>
          <h4 className="text-white font-instrument text-3xl font-bold uppercase tracking-wide">Bend Test</h4>
          <p className="text-white/50 font-monument text-sm tracking-[0.1em] uppercase">Simulating weight on the center of the rod</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className={`font-instrument text-5xl font-bold tracking-tight transition-colors ${isBroken ? 'text-red-500' : 'text-[#0074D9]'}`}>
            {isBroken ? 'FAILED' : 'SAFE'}
          </span>
          {isBroken && <span className="text-red-500/70 font-monument text-xs uppercase tracking-widest">Permanently Bent</span>}
        </div>
      </div>

      {/* Realistic SVG Bending Visualizer */}
      <div className="relative w-full h-48 bg-gradient-to-b from-white/5 to-transparent rounded-2xl border border-white/10 flex items-center justify-center mt-2 z-10 overflow-hidden shadow-inner">

         
         <div className="relative w-[90%] h-full flex items-center justify-center">
            {/* The SVG Canvas for the Rod */}
            <svg viewBox="0 0 400 200" className="w-full h-full overflow-visible drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
               {/* Left Support */}
               <polygon points="10,100 0,150 20,150" fill="#333" stroke="#555" strokeWidth="2" />
               {/* Right Support */}
               <polygon points="390,100 380,150 400,150" fill="#333" stroke="#555" strokeWidth="2" />
               
               {/* The Bending Rod */}
               <motion.path 
                 d={`M 10 100 Q 200 ${100 + currentBend} 390 100`}
                 fill="none"
                 stroke={isBroken ? "#FF4136" : `url(#steelGradient-${yieldStrengthMpa}-${isBroken})`}
                 strokeWidth={Math.max(4, diameter / 2.5)}
                 strokeLinecap="round"
                 animate={{ d: `M 10 100 Q 200 ${100 + currentBend} 390 100` }}
                 transition={{ type: "spring", stiffness: 120, damping: 15 }}
               />
               
               <defs>
                 <linearGradient id={`steelGradient-${yieldStrengthMpa}-${isBroken}`} gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="110">
                   <stop offset="0%" stopColor="#b0b0b0" />
                   <stop offset="50%" stopColor="#ffffff" />
                   <stop offset="100%" stopColor="#808080" />
                 </linearGradient>
               </defs>

               {/* Load Weight Graphic */}
               <motion.g
                  animate={{ y: currentBend / 2 }}
                  transition={{ type: "spring", stiffness: 120, damping: 14 }}
               >
                 <rect x="180" y="40" width="40" height="50" rx="4" fill="#0074D9" />
                 <text x="200" y="70" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                   {load}kg
                 </text>
                 <polygon points="190,90 210,90 200,98" fill="#0074D9" />
               </motion.g>
            </svg>
         </div>
      </div>

      {/* Data Readouts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10">
         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
           <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Bend Distance</div>
           <div className={`font-mono font-bold text-lg ${isBroken ? 'text-red-400' : 'text-white'}`}>{displayBend.toFixed(2)} mm</div>
         </div>
         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
           <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Internal Stress</div>
           <div className={`font-mono font-bold text-lg ${isBroken ? 'text-red-400' : 'text-white'}`}>{dynamicPhysics.bendingStressMpa.toFixed(0)} MPa</div>
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
          <input type="range" min="5" max="100" value={diameter} onChange={e => onDiameterChange(Number(e.target.value))} className="w-full accent-[#0074D9] h-2 bg-white/10 rounded-full appearance-none outline-none cursor-pointer" />
        </div>

        {/* Length Slider */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-xs font-monument text-white/70 uppercase tracking-widest">
            <span>Rod Length <span className="text-white font-bold text-sm ml-2">{length} mm</span></span>
            <span>3000 mm</span>
          </div>
          <input type="range" min="100" max="3000" step="50" value={length} onChange={e => onLengthChange(Number(e.target.value))} className="w-full accent-[#0074D9] h-2 bg-white/10 rounded-full appearance-none outline-none cursor-pointer" />
        </div>

        {/* Load Slider */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-xs font-monument text-white/70 uppercase tracking-widest">
            <span>Applied Weight <span className="text-[#FF851B] font-bold text-sm ml-2">{load} kg</span></span>
            <span>{Math.max(500, dynamicPhysics.yieldLoadKg * 1.5).toFixed(0)} kg</span>
          </div>
          <input type="range" min="10" step="10" max={Math.max(500, dynamicPhysics.yieldLoadKg * 1.5)} value={load} onChange={e => setLoad(Number(e.target.value))} className="w-full accent-[#FF851B] h-2 bg-white/10 rounded-full appearance-none outline-none cursor-pointer" />
        </div>
      </div>

    </div>
  );
}
