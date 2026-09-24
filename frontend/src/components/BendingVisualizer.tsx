import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Weight, AlertTriangle } from "lucide-react";
import { PhysicsNumbers } from "../lib/api";

interface Props {
  physics: PhysicsNumbers;
  gradeLabel: string;
  diameter_mm: number;
  length_mm: number;
}

export default function BendingVisualizer({ physics, gradeLabel, diameter_mm, length_mm }: Props) {
  const [appliedKg, setAppliedKg] = useState(0);

  // Initialize slider to 30% of yield capacity when physics changes
  useEffect(() => {
    setAppliedKg(physics.yield_load_kg * 0.3);
  }, [physics, gradeLabel]);

  // Load percentage relative to yield (1.0 = yield point)
  const loadPct = appliedKg / physics.yield_load_kg;

  // Realistic deflection calculation (elastic region)
  const deflectionMm = physics.deflection_at_yield_mm * loadPct;

  // Visual scaling (True proportion)
  const SPAN_PX = 600; 
  const PX_PER_MM = SPAN_PX / length_mm;
  
  const drawDeflection = Math.min(60, deflectionMm * PX_PER_MM);
  
  const BEAM_H = Math.max(4, diameter_mm * PX_PER_MM);
  const arrowLen = 15 + Math.min(30, loadPct * 30);

  // Monochrome stress colors
  const stressColor = useMemo(() => {
    if (loadPct < 0.7) return "#999999"; 
    if (loadPct <= 1.0) return "#ffffff"; 
    return "#d4a017"; 
  }, [loadPct]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-[24px] tracking-[1.5px] uppercase flex items-center gap-2 text-white">
          <Weight className="w-5 h-5 text-[#666666]" />
          LOAD DEFLECTION
        </h4>
        <div className="text-right">
          <div className="font-mono text-[11px] tracking-[2px] uppercase text-[#666666]">APPLIED LOAD</div>
          <div className="font-display text-[24px] tracking-[1px] text-white">
            {Math.round(appliedKg)} KG
          </div>
        </div>
      </div>

      <div className="relative border border-[#262626] bg-[#000000] p-6 h-[200px] flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {loadPct > 1.0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 text-[#d4a017]"
              style={{ background: "rgba(212,160,23,0.1)", border: "1px solid #d4a017" }}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="font-mono text-[11px] tracking-[2px] uppercase font-bold">
                YIELD EXCEEDED
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cccccc" />
              <stop offset="100%" stopColor="#666666" />
            </linearGradient>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M-2,10 l12,-12 M-2,2 l4,-4 M6,14 l4,-4" stroke="#262626" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Supports */}
          <rect x={70} y={120} width={60} height={20} fill="url(#hatch)" />
          <rect x={670} y={120} width={60} height={20} fill="url(#hatch)" />
          <path d="M 100,120 L 85,90 L 115,90 Z" fill="#141414" stroke="#3a3a3a" />
          <path d="M 700,120 L 685,90 L 715,90 Z" fill="#141414" stroke="#3a3a3a" />

          {/* Ghost unbent beam */}
          {appliedKg > 0 && (
            <path
              d={`M 100,80 Q 400,80 700,80`}
              fill="none" stroke="#262626" strokeWidth={BEAM_H}
              strokeDasharray="8,8"
            />
          )}

          {/* Active bending beam */}
          <path
            d={`M 100,80 Q 400,${80 + drawDeflection} 700,80`}
            fill="none" stroke="url(#beamGrad)" strokeWidth={BEAM_H}
            strokeLinecap="round"
          />

          {/* Load Arrow */}
          <g transform={`translate(400, ${80 + drawDeflection - BEAM_H / 2 - 5})`}>
            <line x1={0} y1={-arrowLen} x2={0} y2={-2} stroke={stressColor} strokeWidth={2} />
            <polygon points="-4,-8 4,-8 0,0" fill={stressColor} />
            <text x={0} y={-arrowLen - 8} textAnchor="middle" fill={stressColor} className="font-mono text-[10px] tracking-[1px]">
              {Math.round(appliedKg)}kg
            </text>
          </g>

          {/* Deflection annotation */}
          {drawDeflection > 2 && (
            <g>
              <line x1={430} y1={80} x2={430} y2={80 + drawDeflection} stroke="#666666" strokeWidth={1} strokeDasharray="2,2" />
              <text x={438} y={80 + drawDeflection / 2 + 4} fill="#999999" className="font-mono text-[10px] tracking-[1px]">
                {deflectionMm > 9.9 ? Math.round(deflectionMm) : deflectionMm.toFixed(1)}mm
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between font-mono text-[11px] tracking-[2px] uppercase text-[#666666]">
          <span>0 KG</span>
          <span style={{ color: stressColor }}>
            LOAD: {(loadPct * 100).toFixed(0)}%
          </span>
          <span>{Math.round(physics.yield_load_kg * 1.5)} KG</span>
        </div>
        <input
          type="range"
          min={0}
          max={physics.yield_load_kg * 1.5}
          step={physics.yield_load_kg / 100}
          value={appliedKg}
          onChange={(e) => setAppliedKg(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-[#262626]">
        <MetricBox label="DEFLECTION" value={`${deflectionMm.toFixed(1)} mm`} color={stressColor} />
        <MetricBox label="YIELD LOAD" value={`${Math.round(physics.yield_load_kg)} kg`} color="#cccccc" />
        <MetricBox label="SAFETY FACTOR" value={loadPct > 0 ? (1 / loadPct).toFixed(1) + "x" : "∞"} color={stressColor} />
        <MetricBox label="MAX LOAD" value={`${Math.round(physics.fracture_load_kg)} kg`} color="#666666" />
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[2px] uppercase text-[#666666] mb-1">{label}</div>
      <div className="font-mono text-[16px] tracking-[1px] uppercase" style={{ color }}>{value}</div>
    </div>
  );
}
