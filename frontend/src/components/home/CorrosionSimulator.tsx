"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

export function CorrosionSimulator({ corrosionGrade }: { corrosionGrade: string }) {
  const [environment, setEnvironment] = useState<"Freshwater" | "Saltwater" | "Acidic">("Freshwater");
  const [temperature, setTemperature] = useState(20);
  const [years, setYears] = useState(1);

  // Convert qualitative or numeric grade to a base resistance score (0-100)
  let baseResistance = 50;
  const g = String(corrosionGrade || "").toLowerCase().trim();
  
  if (g.includes("outstand") || g.includes("extreme") || g === "5") baseResistance = 100;
  else if (g.includes("excellent") || g === "4") baseResistance = 85;
  else if (g.includes("good") || g === "3") baseResistance = 65;
  else if (g.includes("fair") || g.includes("moderate") || g === "2") baseResistance = 40;
  else if (g.includes("poor") || g === "1") baseResistance = 20;

  // Calculate damage
  // Acid = huge multiplier, Salt = medium, Fresh = low
  const envMultiplier = environment === "Acidic" ? 4.0 : environment === "Saltwater" ? 2.0 : 0.5;
  
  // Temp multiplier (higher temp = faster corrosion, baseline 25C)
  const tempMultiplier = Math.max(0.5, temperature / 25);

  // Damage accumulates over time
  const accumulatedDamage = (years * envMultiplier * tempMultiplier * 10);
  
  // Final health (0 to 100)
  const surfaceHealth = Math.max(0, baseResistance - (accumulatedDamage / 5));
  const healthLost = baseResistance - surfaceHealth;
  
  // A steel fails if it has taken massive damage OR its health is critically low (and it has actually started rusting)
  const isFailed = surfaceHealth <= 20 && healthLost > 2;
  
  // Pitting occurs if it has lost a noticeable amount of health, or if its health has dipped into the danger zone
  const hasPitting = !isFailed && (healthLost > 15 || (surfaceHealth <= 45 && healthLost > 2));

  // Rust Opacity (0 to 1)
  const rustOpacity = 1 - (surfaceHealth / 100);

  return (
    <div className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 relative overflow-hidden flex flex-col gap-8 group">
      
      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div>
          <h4 className="text-white font-instrument text-3xl font-bold uppercase tracking-wide">Corrosion Test</h4>
          <p className="text-white/50 font-monument text-sm tracking-[0.1em] uppercase">Simulating rust and surface pitting over time</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className={`font-instrument text-5xl font-bold tracking-tight transition-colors ${isFailed ? 'text-[#FF4136]' : hasPitting ? 'text-[#FF851B]' : 'text-[#2ECC40]'}`}>
            {isFailed ? 'SEVERE RUST' : hasPitting ? 'PITTING' : 'CLEAN'}
          </span>
          {isFailed ? (
            <span className="text-[#FF4136]/70 font-monument text-xs uppercase tracking-widest mt-1">Structural Integrity Lost</span>
          ) : hasPitting ? (
            <span className="text-[#FF851B]/70 font-monument text-xs uppercase tracking-widest mt-1">Localized Surface Cavities</span>
          ) : null}
        </div>
      </div>

      {/* Physics Context Note */}
      <div className="mt-2 bg-white/5 border border-white/10 rounded-xl p-5 flex gap-4 z-10 items-start shadow-lg">
        <Info className="w-6 h-6 text-[#0074D9] flex-shrink-0 mt-0.5" />
        <div>
          <h5 className="text-white font-monument uppercase tracking-widest text-sm mb-2">Assumption: 100% Constant Immersion</h5>
          <p className="text-white/80 font-suisse text-sm leading-relaxed">
            This simulator demonstrates a "worst-case scenario" of continuous submersion. Stainless steel relies on atmospheric oxygen to maintain its protective layer. Constant immersion restricts oxygen access, accelerating pitting significantly compared to intermittent exposure (like rain) where the steel can dry out and self-heal.
          </p>
        </div>
      </div>

      {/* Realistic Visualizer */}
      <div className="relative w-full h-48 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-center mt-2 z-10 overflow-hidden shadow-inner">

         
         <div className="relative w-[80%] h-[70%] rounded-xl overflow-hidden shadow-2xl border border-white/20">
            {/* Clean Steel Base */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500" />
            
            {/* Scratches / Base Texture */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />

            {/* Rust Layer overlay */}
            <motion.div 
               animate={{ opacity: rustOpacity }}
               transition={{ duration: 0.5 }}
               className="absolute inset-0 bg-gradient-to-br from-[#8A3324] via-[#CD5C5C] to-[#4A0404] mix-blend-multiply"
            />

            {/* Pitting Holes (only visible if health < 50) */}
            <motion.div 
               animate={{ opacity: hasPitting ? (1 - surfaceHealth/50) : 0 }}
               transition={{ duration: 0.5 }}
               className="absolute inset-0"
            >
               <div className="absolute top-[20%] left-[30%] w-3 h-3 bg-black/80 rounded-full blur-[1px]" />
               <div className="absolute top-[60%] left-[70%] w-4 h-4 bg-black/90 rounded-full blur-[1px]" />
               <div className="absolute top-[40%] left-[80%] w-2 h-2 bg-black/70 rounded-full blur-[1px]" />
               <div className="absolute top-[70%] left-[20%] w-5 h-5 bg-black/95 rounded-full blur-[2px]" />
               <div className="absolute top-[30%] left-[50%] w-2 h-2 bg-black/80 rounded-full blur-[1px]" />
            </motion.div>
         </div>
      </div>

      {/* Data Readouts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10">
         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
           <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Base Resistance</div>
           <div className="font-mono font-bold text-lg text-white">{baseResistance}/100</div>
         </div>
         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
           <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Environment Factor</div>
           <div className="font-mono font-bold text-lg text-white">{envMultiplier.toFixed(1)}x</div>
         </div>
         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
           <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Accumulated Damage</div>
           <div className="font-mono font-bold text-white/80 text-lg">{accumulatedDamage.toFixed(0)}</div>
         </div>
         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
           <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Surface Health</div>
           <div className={`font-mono font-bold text-lg ${isFailed ? 'text-[#FF4136]' : hasPitting ? 'text-[#FF851B]' : 'text-[#2ECC40]'}`}>{surfaceHealth.toFixed(0)}%</div>
         </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-6 z-10 mt-2 bg-black/30 p-6 rounded-2xl border border-white/5">
        
        {/* Environment Toggle */}
        <div className="flex flex-col gap-3">
          <div className="text-xs font-monument text-white/70 uppercase tracking-widest">Liquid Environment</div>
          <div className="flex gap-2">
            {(["Freshwater", "Saltwater", "Acidic"] as const).map(env => (
              <button 
                key={env}
                onClick={() => setEnvironment(env)}
                className={`flex-1 py-2 rounded-lg text-sm font-instrument font-bold tracking-wider transition-colors ${environment === env ? 'bg-[#FF851B] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        {/* Temperature Slider */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-xs font-monument text-white/70 uppercase tracking-widest">
            <span>Fluid Temperature <span className="text-white font-bold text-sm ml-2">{temperature}°C</span></span>
            <span>100°C</span>
          </div>
          <input type="range" min="0" max="100" value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-full accent-[#FF851B] h-2 bg-white/10 rounded-full appearance-none outline-none cursor-pointer" />
        </div>

        {/* Time Slider */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-xs font-monument text-white/70 uppercase tracking-widest">
            <span>Exposure Time <span className="text-[#0074D9] font-bold text-sm ml-2">{years} Years</span></span>
            <span>50 Years</span>
          </div>
          <input type="range" min="1" max="50" value={years} onChange={e => setYears(Number(e.target.value))} className="w-full accent-[#0074D9] h-2 bg-white/10 rounded-full appearance-none outline-none cursor-pointer" />
        </div>
      </div>

    </div>
  );
}
