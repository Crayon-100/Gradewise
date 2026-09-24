"use client";

import { useState } from "react";
import { getRecommendations, RecommendResponse, GradeRecommendation } from "../lib/api";
import { 
  Search, Ruler, ArrowRight, Activity, Shield, 
  ChevronDown, ChevronUp, Droplets, Info, Weight, TestTube
} from "lucide-react";

export default function Home() {
  // Navigation State
  const [view, setView] = useState<"intake" | "results">("intake");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [userNeed, setUserNeed] = useState("");
  const [shape, setShape] = useState<"round" | "square">("round");
  // We use string for input fields to allow empty state, but they convert to numbers
  const [dimension, setDimension] = useState<string>(""); 
  const [length, setLength] = useState<string>("");

  // Results State
  const [results, setResults] = useState<RecommendResponse | null>(null);
  
  // Real-time slider state (cloned from original results so we can mutate them later without re-fetching)
  const [activeDimension, setActiveDimension] = useState<number>(20);
  const [activeLength, setActiveLength] = useState<number>(1200);

  // Active Visual Tab
  const [activeVisual, setActiveVisual] = useState<"tensile" | "bending" | "corrosion">("bending");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNeed.trim()) return;

    setIsLoading(true);
    setError(null);

    // Default values if user leaves them blank (as requested, assume appropriate for demonstration)
    const finalDimension = dimension ? parseFloat(dimension) : 20.0;
    const finalLength = length ? parseFloat(length) : 1200.0;

    try {
      const data = await getRecommendations({
        user_need: userNeed,
        diameter_mm: finalDimension,
        length_mm: finalLength,
      });
      
      setResults(data);
      setActiveDimension(finalDimension);
      setActiveLength(finalLength);
      setView("results");
    } catch (err: any) {
      setError(err.message || "Failed to fetch recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView("intake")}>
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl">
            G
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">GradeWise</h1>
        </div>
        {view === "results" && (
          <button 
            onClick={() => setView("intake")}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Start New Search
          </button>
        )}
      </header>

      {/* View Router */}
      {view === "intake" ? (
        <IntakeView 
          userNeed={userNeed} setUserNeed={setUserNeed}
          shape={shape} setShape={setShape}
          dimension={dimension} setDimension={setDimension}
          length={length} setLength={setLength}
          isLoading={isLoading} error={error}
          onSubmit={handleSubmit}
        />
      ) : (
        <ResultsView 
          results={results!}
          activeDimension={activeDimension} setActiveDimension={setActiveDimension}
          activeLength={activeLength} setActiveLength={setActiveLength}
          shape={shape} setShape={setShape}
          activeVisual={activeVisual} setActiveVisual={setActiveVisual}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// 1. INTAKE VIEW (The Conversational Search Page)
// ---------------------------------------------------------------------------
function IntakeView({ 
  userNeed, setUserNeed, 
  shape, setShape, 
  dimension, setDimension, 
  length, setLength, 
  isLoading, error, onSubmit 
}: any) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Pre-baked prompts for judges
  const starterPrompts = [
    "steel rods for a heavy garden gate hinge",
    "exhaust manifold support brackets for a sports car",
    "railing for a coastal balcony exposed to salt spray",
  ];

  return (
    <div className="max-w-3xl mx-auto mt-20 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
          Find the perfect stainless steel grade.
        </h2>
        <p className="text-lg text-slate-600">
          Describe what you're building in plain English. We'll recommend the best 
          Jindal Stainless grades and show you exactly how they'll perform.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Main Input */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <textarea
            value={userNeed}
            onChange={(e) => setUserNeed(e.target.value)}
            placeholder="e.g. I need steel rods for a heavy garden gate that won't rust in the rain..."
            className="w-full pl-14 pr-32 py-5 bg-white border-2 border-slate-200 rounded-2xl text-lg shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
            rows={3}
            required
          />
          <div className="absolute bottom-4 right-4">
            <button
              type="submit"
              disabled={isLoading || !userNeed.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              {isLoading ? "Analyzing..." : "Analyze"}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <span className="text-sm text-slate-500 font-medium mr-2">Try:</span>
          {starterPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setUserNeed(prompt)}
              className="text-sm bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 px-3 py-1.5 rounded-full transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Advanced Dimensions Toggle */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mx-auto"
          >
            <Ruler className="w-5 h-5" />
            Specify physical dimensions (Optional)
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showAdvanced && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Profile Shape</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShape("round")}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${shape === "round" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Round
                  </button>
                  <button
                    type="button"
                    onClick={() => setShape("square")}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${shape === "square" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Square
                  </button>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {shape === "round" ? "Diameter (mm)" : "Side Width (mm)"}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 20"
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Length / Span (mm)</label>
                <input
                  type="number"
                  placeholder="e.g. 1200"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}
          
          {showAdvanced && (
            <p className="text-center text-sm text-slate-400 mt-4">
              Leave blank to let GradeWise assume appropriate demonstration values.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm text-center">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. RESULTS VIEW (Post-Submission Dashboard)
// ---------------------------------------------------------------------------
function ResultsView({
  results,
  activeDimension, setActiveDimension,
  activeLength, setActiveLength,
  shape, setShape,
  activeVisual, setActiveVisual
}: any) {
  
  return (
    <div className="max-w-7xl mx-auto mt-6 px-6 pb-20 animate-in fade-in duration-500 grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* LEFT COLUMN: Controls & Visualizer */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Real-time Parameters Control Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Live Parameters
            </h3>
            <span className="text-xs font-semibold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">
              Real-time Sync
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dimension Slider */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-slate-700">
                  {shape === "round" ? "Diameter" : "Side Width"}
                </label>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    value={activeDimension}
                    onChange={(e) => setActiveDimension(Number(e.target.value))}
                    className="w-16 text-right text-sm font-bold bg-slate-100 rounded px-2 py-1 focus:outline-blue-500"
                  />
                  <span className="text-sm text-slate-500 font-medium">mm</span>
                </div>
              </div>
              <input 
                type="range" 
                min="5" max="100" step="1"
                value={activeDimension}
                onChange={(e) => setActiveDimension(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Length Slider */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-slate-700">Length / Span</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    value={activeLength}
                    onChange={(e) => setActiveLength(Number(e.target.value))}
                    className="w-20 text-right text-sm font-bold bg-slate-100 rounded px-2 py-1 focus:outline-blue-500"
                  />
                  <span className="text-sm text-slate-500 font-medium">mm</span>
                </div>
              </div>
              <input 
                type="range" 
                min="100" max="5000" step="50"
                value={activeLength}
                onChange={(e) => setActiveLength(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Visualizer Stage (Phase 2 Placeholder) */}
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 flex flex-col h-[500px]">
          {/* Tabs */}
          <div className="flex bg-slate-950 border-b border-slate-800">
            {[
              { id: "bending", label: "Bend Test (Yield)", icon: <Weight className="w-4 h-4" /> },
              { id: "tensile", label: "Tensile Test (Snap)", icon: <Activity className="w-4 h-4" /> },
              { id: "corrosion", label: "Corrosion Sim", icon: <Droplets className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveVisual(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                  activeVisual === tab.id 
                    ? "text-blue-400 border-b-2 border-blue-500 bg-slate-900/50" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Stage Area */}
          <div className="flex-1 relative flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-900">
            <div className="text-center text-slate-500">
              <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Interactive Visualizer</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">
                (Phase 2: The WebGL / SVG physics simulation will render here, 
                reacting instantly to the sliders above.)
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Grade Recommendations */}
      <div className="lg:col-span-5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Top Candidates</h2>
          <span className="text-sm font-medium text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
            {results.recommendations.length} found
          </span>
        </div>

        <div className="space-y-4">
          {results.recommendations.map((grade: GradeRecommendation, idx: number) => (
            <GradeCard key={grade.grade} grade={grade} isBest={idx === 0} />
          ))}
        </div>
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. GRADE CARD COMPONENT (Handles Normal vs Pro view)
// ---------------------------------------------------------------------------
function GradeCard({ grade, isBest }: { grade: GradeRecommendation, isBest: boolean }) {
  const [showPro, setShowPro] = useState(false);

  return (
    <div className={`bg-white rounded-2xl border transition-all ${isBest ? "border-blue-400 shadow-md ring-1 ring-blue-400/20" : "border-slate-200 shadow-sm"}`}>
      
      {/* Header */}
      <div className={`px-5 py-4 border-b ${isBest ? "border-blue-100 bg-blue-50/50 rounded-t-2xl" : "border-slate-100"}`}>
        <div className="flex justify-between items-start">
          <div>
            {isBest && (
              <span className="inline-block text-[10px] uppercase font-bold tracking-widest text-blue-600 bg-blue-100 px-2 py-0.5 rounded mb-1">
                Top Recommendation
              </span>
            )}
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              Grade {grade.grade}
              <span className="text-sm font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                {grade.type}
              </span>
            </h3>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cost Tier</div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full ${i <= grade.cost_tier ? "bg-green-500" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Normal View Body */}
      <div className="p-5 space-y-4">
        {/* AI Explanation (Plain English) */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> Why this fits
          </h4>
          <p className="text-slate-700 leading-relaxed text-sm">
            {grade.ai_explanation}
          </p>
        </div>

        {/* Trade-offs */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
            Trade-off to consider
          </h4>
          <p className="text-amber-900 text-sm">
            {grade.trade_off_notes}
          </p>
        </div>

        {/* Quick Highlights */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Shield className="w-4 h-4 text-blue-500" /> 
            Corrosion: <span className="font-bold text-slate-900">{grade.corrosion_resistance}/5</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="w-4 h-4 flex items-center justify-center font-black text-[10px] bg-slate-200 rounded text-slate-600">W</div>
            Weldability: <span className="font-bold text-slate-900">{grade.weldability}</span>
          </div>
        </div>
      </div>

      {/* Pro Toggle Button */}
      <button 
        onClick={() => setShowPro(!showPro)}
        className="w-full px-5 py-3 border-t border-slate-100 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        {showPro ? "Hide Professional Data" : "View Professional Data"}
        {showPro ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Pro View Expansion */}
      {showPro && (
        <div className="border-t border-slate-100 bg-slate-50 p-5 text-sm animate-in slide-in-from-top-2 duration-300 rounded-b-2xl">
          <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Technical Specifications</h4>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
            <ProStat label="UNS Designation" value={grade.uns_no} />
            <ProStat label="Series" value={grade.series} />
            <ProStat label="Max Temp" value={`${grade.max_service_temp_c}°C`} />
            <ProStat label="Magnetic" value={grade.magnetic} />
          </div>

          <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Calculated Physics Limits</h4>
          <div className="space-y-4">
            
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Tensile (Axial Load)</div>
              <div className="grid grid-cols-2 gap-2">
                <ProStat label="Elastic Limit (Yield)" value={`${grade.physics.yield_load_kg.toLocaleString()} kg`} highlight />
                <ProStat label="Ultimate Fracture" value={`${grade.physics.fracture_load_kg.toLocaleString()} kg`} highlight />
                <ProStat label="Max Elastic Stretch" value={`${grade.physics.elastic_stretch_mm} mm`} />
                <ProStat label="Elongation at Break" value={`${grade.physics.total_elongation_mm} mm`} />
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Bending (Simply Supported)</div>
              <div className="grid grid-cols-2 gap-2">
                <ProStat label="Load at First Yield" value={`${grade.physics.bending_yield_load_kg.toLocaleString()} kg`} highlight />
                <ProStat label="Deflection at Yield" value={`${grade.physics.deflection_at_yield_mm} mm`} />
                <ProStat label="Section Modulus (Z)" value={`${grade.physics.section_modulus_mm3} mm³`} />
                <ProStat label="Moment of Inertia (I)" value={`${grade.physics.second_moment_mm4} mm⁴`} />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function ProStat({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`font-mono ${highlight ? "font-bold text-blue-700" : "font-medium text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}
