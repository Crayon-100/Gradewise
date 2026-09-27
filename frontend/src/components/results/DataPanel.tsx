import React from 'react';
import { motion } from 'framer-motion';
import { AIRecommendation } from '@/lib/api';
import { SteelGrade } from '@/lib/gradeData';
import { RadarChart } from './RadarChart';
import { MetricCards } from './MetricCards';

interface RecommendedGrade extends AIRecommendation {
  gradeData: SteelGrade;
}

export function DataPanel({ activeGrade }: { activeGrade: RecommendedGrade | undefined }) {
  if (!activeGrade) return null;

  return (
    <motion.div 
      key={activeGrade.grade} // force re-animation when grade changes
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#172338]/60 backdrop-blur-xl border border-[#334155] rounded-2xl p-6 shadow-2xl relative overflow-hidden"
    >
      {/* Traveling Light Border effect */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(27,138,61,0.4)_360deg)]"
        />
        <div className="absolute inset-[1px] bg-[#172338]/90 rounded-2xl backdrop-blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-end mb-6 border-b border-[#334155] pb-2">
          <div>
            <h2 className="font-instrument text-2xl font-bold text-white uppercase tracking-widest">
              Performance Analysis
            </h2>
            <p className="font-monument text-[#1B8A3D] text-sm uppercase">
              Target: {activeGrade.gradeData.grade}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="w-full md:w-1/2">
            <RadarChart grade={activeGrade.gradeData} />
          </div>
          <div className="w-full md:w-1/2">
            <MetricCards grade={activeGrade.gradeData} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
