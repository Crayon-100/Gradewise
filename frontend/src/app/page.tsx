"use client";

import { useState } from "react";
import {
  getRecommendations,
  RecommendResponse,
  GradeRecommendation,
} from "../lib/api";
import { calculatePhysics } from "../lib/physics";
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Ruler,
  Weight,
  FlaskConical,
  Wrench,
  Loader2,
} from "lucide-react";
import clsx from "clsx";

export default function Home() {
  // Input State
  const [userNeed, setUserNeed] = useState("");
  const [shape, setShape] = useState<"round" | "square">("round");
  const [dimensionMm, setDimensionMm] = useState<number>(20);
  const [lengthMm, setLengthMm] = useState<number>(1200);

  // App State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [response, setResponse] = useState<RecommendResponse | null>(null);

  // Visuals Tab State
  const [activeTab, setActiveTab] = useState<"tensile" | "bending" | "corrosion">(
    "bending"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNeed.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await getRecommendations({
        user_need: userNeed,
        shape,
        dimension_mm: dimensionMm,
        length_mm: lengthMm,
      });
      setResponse(res);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to fetch recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get real-time physics based on slider states, not the static backend response.
  const getLivePhysics = (grade: GradeRecommendation) => {
    return calculatePhysics(
      shape,
      dimensionMm,
      lengthMm,
      grade.yield_strength_mpa,
      grade.tensile_strength_mpa,
      grade.youngs_modulus_gpa,
      grade.elongation_pct,
      grade.density_kg_m3
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center font-bold text-white tracking-tighter">
              GW
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              GradeWise
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Jindal Stainless Selector
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Controls & Visual Stage */}
        <div className="lg:col-span-5 space-y-6">
          {/* CONTROL BOX */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all duration-300">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
              <Wrench className="w-5 h-5 text-blue-600" />
              Application Parameters
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isSubmitted && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Describe your need in plain English
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-3"
                    placeholder="e.g. steel rods for a garden gate in a coastal town..."
                    value={userNeed}
                    onChange={(e) => setUserNeed(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Rod Shape
                  </label>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShape("round")}
                      className={clsx(
                        "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                        shape === "round"
                          ? "bg-white text-blue-700 shadow"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Round
                    </button>
                    <button
                      type="button"
                      onClick={() => setShape("square")}
                      className={clsx(
                        "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                        shape === "square"
                          ? "bg-white text-blue-700 shadow"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Square
                    </button>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <div className="flex justify-between">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {shape === "round" ? "Diameter" : "Side"} (mm)
                    </label>
                    <span className="text-sm font-mono text-blue-600 font-bold">
                      {dimensionMm}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    className="w-full accent-blue-600"
                    value={dimensionMm}
                    onChange={(e) => setDimensionMm(Number(e.target.value))}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <div className="flex justify-between">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Length (mm)
                    </label>
                    <span className="text-sm font-mono text-blue-600 font-bold">
                      {lengthMm}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="6000"
                    step="100"
                    className="w-full accent-blue-600"
                    value={lengthMm}
                    onChange={(e) => setLengthMm(Number(e.target.value))}
                  />
                </div>
              </div>

              {!isSubmitted && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Find the Right Grade"
                  )}
                </button>
              )}
            </form>
          </section>

          {/* VISUAL STAGE (Shows after submit) */}
          {isSubmitted && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("bending")}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors",
                    activeTab === "bending"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <Activity className="w-4 h-4" /> Bending Test
                </button>
                <button
                  onClick={() => setActiveTab("tensile")}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors",
                    activeTab === "tensile"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <Weight className="w-4 h-4" /> Tensile Test
                </button>
                <button
                  onClick={() => setActiveTab("corrosion")}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors",
                    activeTab === "corrosion"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <FlaskConical className="w-4 h-4" /> Corrosion
                </button>
              </div>

              {/* VISUAL PLACEHOLDER STAGE (To be replaced with Phase 2 canvas/svg) */}
              <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 relative overflow-hidden">
                <div className="text-center p-6">
                  <div className="animate-pulse mb-4">
                    {activeTab === "bending" && (
                      <Activity className="w-12 h-12 mx-auto text-blue-500" />
                    )}
                    {activeTab === "tensile" && (
                      <Weight className="w-12 h-12 mx-auto text-blue-500" />
                    )}
                    {activeTab === "corrosion" && (
                      <FlaskConical className="w-12 h-12 mx-auto text-blue-500" />
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2 capitalize">
                    {activeTab} Simulation Loading...
                  </h3>
                  <p className="text-sm max-w-sm">
                    Phase 2: This box will contain the live, 60fps React animated
                    visualization showing the real-time physical reaction of the
                    selected grades.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: Results */}
        <div className="lg:col-span-7">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 font-medium text-sm">
              {error}
            </div>
          )}

          {!isSubmitted && !isLoading && !error && (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Ruler className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">
                Discover the Perfect Grade
              </h2>
              <p className="text-slate-500 max-w-sm">
                Describe your application, and our AI will shortlist the best
                Jindal Stainless grades while our physics engine calculates real
                structural limits.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="h-full flex flex-col items-center justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="font-semibold text-slate-600 animate-pulse">
                Analyzing requirements & calculating physics...
              </p>
            </div>
          )}

          {isSubmitted && response && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Top Recommendations
                </h2>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800"
                >
                  New Query
                </button>
              </div>

              {response.recommendations.map((grade, idx) => (
                <GradeCard
                  key={grade.grade}
                  grade={grade}
                  idx={idx}
                  livePhysics={getLivePhysics(grade)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grade Card Component (handles Base View vs Pro View toggle internally)
// ---------------------------------------------------------------------------

function GradeCard({
  grade,
  idx,
  livePhysics,
}: {
  grade: GradeRecommendation;
  idx: number;
  livePhysics: ReturnType<typeof calculatePhysics>;
}) {
  const [showPro, setShowPro] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* CARD HEADER */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-sm">
            #{idx + 1}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Grade {grade.grade}
              <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                {grade.type}
              </span>
            </h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {grade.series} Series • UNS {grade.uns_no}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-700 flex items-center gap-1 justify-end">
            Cost Tier {grade.cost_tier}/5
          </div>
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <div
                key={star}
                className={clsx(
                  "w-3 h-3 rounded-full",
                  star <= grade.cost_tier ? "bg-emerald-500" : "bg-slate-200"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CARD BODY (Base View) */}
      <div className="p-6">
        <div className="mb-6">
          <p className="text-base leading-relaxed text-slate-700 font-medium">
            {grade.ai_explanation}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <h4 className="text-amber-900 font-bold mt-0 mb-1 text-sm uppercase tracking-wide">
              The Trade-off
            </h4>
            <p className="text-amber-800 m-0 leading-relaxed text-sm font-medium">
              {grade.trade_off_notes}
            </p>
          </div>
        </div>

        {/* Quick Base Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Metric title="Corrosion" value={`${grade.corrosion_resistance}/5`} />
          <Metric title="Max Load (Bend)" value={`${livePhysics.bending_yield_load_kg} kg`} />
          <Metric title="Max Load (Snap)" value={`${livePhysics.fracture_load_kg} kg`} />
          <Metric title="Rod Weight" value={`${livePhysics.rod_mass_kg} kg`} />
        </div>

        {/* PRO VIEW TOGGLE */}
        <button
          onClick={() => setShowPro(!showPro)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          {showPro ? (
            <>
              Hide Professional Data <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              View Professional Data <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>

        {/* PRO VIEW (Expanded) */}
        {showPro && (
          <div className="mt-6 pt-6 border-t border-slate-200 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              {/* Material Properties */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                  Raw Material Properties
                </h4>
                <ul className="space-y-2 text-sm">
                  <ProRow label="Yield Strength" value={`${grade.yield_strength_mpa} MPa`} />
                  <ProRow label="Tensile Strength" value={`${grade.tensile_strength_mpa} MPa`} />
                  <ProRow label="Young's Modulus (E)" value={`${grade.youngs_modulus_gpa} GPa`} />
                  <ProRow label="Elongation" value={`${grade.elongation_pct}%`} />
                  <ProRow label="Density" value={`${grade.density_kg_m3} kg/m³`} />
                  <ProRow label="Weldability" value={grade.weldability} />
                  <ProRow label="Magnetic" value={grade.magnetic} />
                  <ProRow label="Max Service Temp" value={`${grade.max_service_temp_c} °C`} />
                </ul>
              </div>

              {/* Calculated Physics */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                  Calculated Mechanics
                </h4>
                <ul className="space-y-2 text-sm">
                  <ProRow label="Cross-Section Area (A)" value={`${livePhysics.cross_section_area_mm2} mm²`} />
                  <ProRow label="Moment of Inertia (I)" value={`${livePhysics.second_moment_mm4} mm⁴`} />
                  <ProRow label="Section Modulus (Z)" value={`${livePhysics.section_modulus_mm3} mm³`} />
                  <div className="h-2" />
                  <ProRow label="Yield Load (Axial)" value={`${livePhysics.yield_load_n} N`} />
                  <ProRow label="Fracture Load (Axial)" value={`${livePhysics.fracture_load_n} N`} />
                  <ProRow label="Elastic Stretch Limit" value={`${livePhysics.elastic_stretch_mm} mm`} />
                  <ProRow label="Total Elongation (Break)" value={`${livePhysics.total_elongation_mm} mm`} />
                  <div className="h-2" />
                  <ProRow label="Yield Load (Bending)" value={`${livePhysics.bending_yield_load_n} N`} />
                  <ProRow label="Deflection at Yield" value={`${livePhysics.deflection_at_yield_mm} mm`} />
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
      <div className="text-xs font-bold text-slate-500 mb-1">{title}</div>
      <div className="font-mono font-bold text-slate-900 text-sm">{value}</div>
    </div>
  );
}

function ProRow({ label, value }: { label: string; value: string | number }) {
  return (
    <li className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="font-mono text-slate-900 font-bold">{value}</span>
    </li>
  );
}
