"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getGradeData } from "@/lib/gradeData";
import { ArrowLeft, ShieldAlert } from "lucide-react";

let isHydrated = false;

export default function ComparePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(() => {
    if (typeof window !== "undefined" && isHydrated) {
      const stored = sessionStorage.getItem("compare_data");
      try {
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    isHydrated = true;
    setMounted(true);
    const stored = sessionStorage.getItem("compare_data");
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-[#0B1222]"></div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1222] text-white">
        <div className="text-center">
          <h1 className="text-4xl font-instrument font-bold mb-4">No Comparison Data</h1>
          <button onClick={() => router.back()} className="text-[#0074D9] hover:underline">Go Back</button>
        </div>
      </div>
    );
  }

  const recs = data.recommendations || [];
  
  // Calculate relative stats (baseline is recs[0])
  const getRelativeColor = (val: number, baseline: number, isHigherBetter: boolean) => {
    if (val === baseline) return "text-white/60";
    if (val > baseline) return isHigherBetter ? "text-[#1B8A3D]" : "text-[#C62828]";
    return isHigherBetter ? "text-[#C62828]" : "text-[#1B8A3D]";
  };

  const getDiffLabel = (val: number, baseline: number) => {
    if (val === baseline) return "Baseline";
    const pct = Math.round(Math.abs((val - baseline) / baseline) * 100);
    return val > baseline ? `+${pct}%` : `-${pct}%`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-y-auto">
      {/* Background Graphic */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#111] to-[#0a0a0a]" />
        <div className="absolute top-0 right-0 w-1/2 h-[50vh] bg-[#0074D9]/5 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-1/2 h-[50vh] bg-[#FF851B]/5 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors uppercase font-monument tracking-widest text-sm mb-12"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Results
        </button>

        <h1 className="text-5xl md:text-7xl font-instrument font-bold uppercase tracking-tighter drop-shadow-xl mb-4">
          Detailed Analysis
        </h1>
        <p className="text-xl font-suisse text-white/60 max-w-3xl mb-16">
          A side-by-side technical breakdown of your recommended grades, assessing structural strength, environmental resilience, and trade-off context.
        </p>

        <div className="w-full overflow-x-auto rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="p-8 border-b border-white/10 w-1/4">
                  <div className="text-sm font-monument uppercase tracking-widest text-white/40">Parameter</div>
                </th>
                {recs.map((rec: any, i: number) => {
                  const gradeData = getGradeData(rec.grade);
                  return (
                    <th key={rec.grade} className={`p-8 border-b border-white/10 w-1/4 relative ${i === 0 ? "bg-white/5" : ""}`}>
                      {i === 0 && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#0074D9]" />
                      )}
                      <div className="text-4xl font-instrument font-bold text-white uppercase">{rec.grade}</div>
                      <div className="text-[10px] font-monument text-[#66B2FF] tracking-widest uppercase mt-1">{gradeData?.type || "ALLOY"}</div>
                      {i === 0 && <div className="mt-4 text-xs font-monument uppercase tracking-widest text-[#0074D9] bg-[#0074D9]/10 px-3 py-1 rounded-full w-fit">Primary Match</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-sm">
              
              {/* === AI CONTEXT === */}
              <tr>
                <td className="p-8 bg-black/20 text-white/40 font-monument uppercase tracking-widest text-xs align-top pt-10">Explanation</td>
                {recs.map((rec: any, i: number) => (
                  <td key={rec.grade} className={`p-8 align-top ${i === 0 ? "bg-white/5" : ""}`}>
                    <p className="text-sm font-suisse text-white/80 leading-relaxed">{rec.ai_explanation}</p>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-8 bg-black/20 text-[#FF851B] font-monument uppercase tracking-widest text-xs align-top pt-10">
                  <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Trade-offs</div>
                </td>
                {recs.map((rec: any, i: number) => (
                  <td key={rec.grade} className={`p-8 align-top ${i === 0 ? "bg-white/5" : ""}`}>
                    <p className="text-sm font-suisse text-[#FF851B]/80 leading-relaxed">{rec.trade_off_notes}</p>
                  </td>
                ))}
              </tr>

              {/* === STRUCTURAL === */}
              <tr>
                <td colSpan={recs.length + 1} className="px-8 py-4 bg-white/5 text-white/40 font-instrument uppercase tracking-widest text-lg font-bold">Structural Properties</td>
              </tr>
              
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="p-8 text-white/60">Yield Strength</td>
                {recs.map((rec: any, i: number) => {
                  const val = rec.yield_strength_mpa;
                  const baseline = recs[0].yield_strength_mpa;
                  const diff = getDiffLabel(val, baseline);
                  return (
                    <td key={rec.grade} className={`p-8 ${i === 0 ? "bg-white/5" : ""}`}>
                      <div className="text-2xl text-white">{val} <span className="text-sm text-white/40">MPa</span></div>
                      {i !== 0 && <div className={`text-xs mt-2 ${getRelativeColor(val, baseline, true)}`}>{diff} vs primary</div>}
                    </td>
                  );
                })}
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="p-8 text-white/60">Tensile Strength</td>
                {recs.map((rec: any, i: number) => {
                  const gradeData = getGradeData(rec.grade);
                  const val = gradeData?.tensileStrengthMpa || 0;
                  const baseline = getGradeData(recs[0].grade)?.tensileStrengthMpa || 0;
                  const diff = getDiffLabel(val, baseline);
                  return (
                    <td key={rec.grade} className={`p-8 ${i === 0 ? "bg-white/5" : ""}`}>
                      <div className="text-2xl text-white">{val} <span className="text-sm text-white/40">MPa</span></div>
                      {i !== 0 && <div className={`text-xs mt-2 ${getRelativeColor(val, baseline, true)}`}>{diff} vs primary</div>}
                    </td>
                  );
                })}
              </tr>

              {/* === ENVIRONMENTAL === */}
              <tr>
                <td colSpan={recs.length + 1} className="px-8 py-4 bg-white/5 text-white/40 font-instrument uppercase tracking-widest text-lg font-bold">Environmental Tolerance</td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="p-8 text-white/60">Corrosion (PREN)</td>
                {recs.map((rec: any, i: number) => {
                  const gradeData = getGradeData(rec.grade);
                  const val = gradeData?.pren || 0;
                  const baseline = getGradeData(recs[0].grade)?.pren || 0;
                  const diff = getDiffLabel(val, baseline);
                  return (
                    <td key={rec.grade} className={`p-8 ${i === 0 ? "bg-white/5" : ""}`}>
                      <div className="text-2xl text-white">{val}</div>
                      <div className="text-[10px] text-white/30 uppercase mt-1">Pitting Resistance Eq.</div>
                      {i !== 0 && <div className={`text-xs mt-2 ${getRelativeColor(val, baseline, true)}`}>{diff} vs primary</div>}
                    </td>
                  );
                })}
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="p-8 text-white/60">Max Service Temp</td>
                {recs.map((rec: any, i: number) => {
                  const val = rec.max_service_temp_c;
                  const baseline = recs[0].max_service_temp_c;
                  const diff = getDiffLabel(val, baseline);
                  return (
                    <td key={rec.grade} className={`p-8 ${i === 0 ? "bg-white/5" : ""}`}>
                      <div className="text-2xl text-white">{val} <span className="text-sm text-white/40">°C</span></div>
                      {i !== 0 && <div className={`text-xs mt-2 ${getRelativeColor(val, baseline, true)}`}>{diff} vs primary</div>}
                    </td>
                  );
                })}
              </tr>

              {/* === LOGISTICS === */}
              <tr>
                <td colSpan={recs.length + 1} className="px-8 py-4 bg-white/5 text-white/40 font-instrument uppercase tracking-widest text-lg font-bold">Logistics & Fab</td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="p-8 text-white/60">Cost Tier</td>
                {recs.map((rec: any, i: number) => {
                  const gradeData = getGradeData(rec.grade);
                  const val = gradeData?.costTier || 0;
                  const baseline = getGradeData(recs[0].grade)?.costTier || 0;
                  return (
                    <td key={rec.grade} className={`p-8 ${i === 0 ? "bg-white/5" : ""}`}>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(tier => (
                          <div key={tier} className={`w-4 h-4 rounded-full ${tier <= val ? "bg-[#1B8A3D]" : "bg-white/10"}`} />
                        ))}
                      </div>
                      <div className="text-[10px] text-white/30 uppercase mt-2">Lower is cheaper</div>
                      {i !== 0 && val !== baseline && (
                        <div className={`text-xs mt-2 ${val < baseline ? "text-[#1B8A3D]" : "text-[#C62828]"}`}>
                          {val < baseline ? "Cheaper" : "More expensive"} than primary
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="p-8 text-white/60">Weldability</td>
                {recs.map((rec: any, i: number) => {
                  const val = rec.weldability;
                  return (
                    <td key={rec.grade} className={`p-8 ${i === 0 ? "bg-white/5" : ""}`}>
                      <div className="text-xl text-white">{val} <span className="text-sm text-white/40">/ 5</span></div>
                    </td>
                  );
                })}
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors border-b-0">
                <td className="p-8 text-white/60">Machinability</td>
                {recs.map((rec: any, i: number) => {
                  const gradeData = getGradeData(rec.grade);
                  const val = gradeData?.machinability || 0;
                  return (
                    <td key={rec.grade} className={`p-8 ${i === 0 ? "bg-white/5" : ""}`}>
                      <div className="text-xl text-white">{val} <span className="text-sm text-white/40">/ 5</span></div>
                    </td>
                  );
                })}
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
