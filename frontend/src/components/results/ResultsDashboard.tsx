import React, { useState } from 'react';
import { AIAnalysisResult } from '@/lib/api';
import { getGradeData, SteelGrade } from '@/lib/gradeData';
import { GradeAccordion } from './GradeAccordion';
import { DataPanel } from './DataPanel';
import { ArrowLeft, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecommendedGrade {
  grade: string;
  ai_explanation: string;
  trade_off_notes: string;
  corrosion_resistance: string;
  max_service_temp_c: number;
  weldability: string;
  yield_strength_mpa: number;
  gradeData: SteelGrade;
}

export function ResultsDashboard({ results, onReset }: { results: AIAnalysisResult, onReset: () => void }) {
  const recommendations: RecommendedGrade[] = results.recommendations.map(r => ({
    ...r,
    gradeData: getGradeData(r.grade)!
  })).filter(r => r.gradeData !== undefined);

  const [activeGradeIndex, setActiveGradeIndex] = useState(0);
  const [followUp, setFollowUp] = useState("");

  const handleFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUp.trim()) return;
    console.log("Follow up:", followUp);
    // In a real app, this would hit the API again with conversation history
    setFollowUp("");
  };

  if (recommendations.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[1400px] mx-auto min-h-screen pt-24 px-4 flex flex-col gap-8 pb-32 relative z-10"
    >
      <button 
        onClick={onReset}
        className="flex items-center gap-2 text-[#8E9BAE] hover:text-[#FF851B] transition-colors font-suisse w-fit"
      >
        <ArrowLeft size={16} /> Back to Search
      </button>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="w-full lg:w-5/12 flex flex-col gap-8">
           <GradeAccordion 
              recommendations={recommendations} 
              activeIndex={activeGradeIndex}
              onHover={setActiveGradeIndex} 
           />
           
           {/* Follow-up Chat */}
           <div className="bg-[#172338]/60 backdrop-blur-md border border-[#334155] p-4 rounded-xl shadow-lg mt-auto">
              <h3 className="font-instrument text-sm font-bold text-[#8E9BAE] uppercase tracking-widest mb-3">Refine Requirements</h3>
              <form onSubmit={handleFollowUp} className="relative flex items-center">
                <input 
                  type="text" 
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="e.g. Actually, I need it to be cheaper..." 
                  className="w-full bg-[#0B1222] border border-[#334155] rounded-lg px-4 py-3 text-sm text-[#C7CDD4] focus:outline-none focus:border-[#FF851B] font-suisse transition-colors"
                />
                <button type="submit" className="absolute right-2 p-2 text-[#8E9BAE] hover:text-[#1B8A3D] transition-colors">
                  <Send size={18} />
                </button>
              </form>
           </div>
        </div>

        <div className="w-full lg:w-7/12 sticky top-24 h-fit">
           <DataPanel 
              activeGrade={recommendations[activeGradeIndex]} 
           />
        </div>
      </div>
    </motion.div>
  );
}
