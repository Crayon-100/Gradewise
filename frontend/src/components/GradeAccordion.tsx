import { motion, AnimatePresence } from "framer-motion";
import { GradeRecommendation } from "../lib/api";
import { gradeImageUrl } from "../lib/gradeData";

interface Props {
  grades: GradeRecommendation[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  livePhysics?: any[];
}

// Austere monochrome palette for panels instead of bright colors
const PANEL_COLORS = ["#ffffff", "#cccccc", "#999999"];

export default function GradeAccordion({ grades, activeIdx, onSelect, livePhysics }: Props) {
  return (
    <div className="flex w-full h-[500px] overflow-hidden bg-black border border-[#262626]">
      {grades.map((grade, idx) => {
        const isActive = idx === activeIdx;
        const color = PANEL_COLORS[idx % PANEL_COLORS.length];
        const imageUrl = gradeImageUrl(grade.grade);

        return (
          <motion.div
            key={grade.grade}
            layout
            onClick={() => onSelect(idx)}
            initial={false}
            animate={{
              flex: isActive ? 3 : 1,
              opacity: isActive ? 1 : 0.6,
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full cursor-pointer overflow-hidden border-r border-[#262626] last:border-r-0 flex-shrink-0 group"
          >
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              <img
                src={imageUrl}
                alt={`Grade ${grade.grade}`}
                className="w-full h-full object-cover grayscale opacity-40 mix-blend-luminosity transition-all duration-700 group-hover:scale-105 group-hover:opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            {/* Content Layer */}
            <div className="relative z-10 w-full h-full flex items-end p-6 md:p-8">
              <AnimatePresence mode="wait">
                {isActive ? (
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="flex flex-col gap-4 w-full"
                  >
                    {idx === 0 && (
                      <span className="font-mono text-[11px] tracking-[2px] uppercase text-black bg-white px-3 py-1 self-start">
                        TOP RECOMMENDATION
                      </span>
                    )}

                    <h2 className="font-display text-[48px] leading-[1.1] tracking-[3px] uppercase text-white">
                      {grade.grade}
                    </h2>
                    
                    <p className="font-text text-[14px] text-[#cccccc] line-clamp-3 max-w-lg leading-[1.5]">
                      {grade.ai_explanation}
                    </p>

                    <div className="flex gap-2 mt-4 flex-wrap">
                      <StatPill label="CORROSION" value={`${grade.corrosion_resistance}/5`} />
                      <StatPill label="WELDABILITY" value={`${grade.weldability}/5`} />
                      {livePhysics && livePhysics[idx] && (
                        <StatPill
                          label="MAX LOAD"
                          value={`${Math.round(livePhysics[idx].yield_load_kg)} KG`}
                        />
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="collapsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center pb-8"
                  >
                    <h3 className="font-display text-[32px] tracking-[2px] text-[#999999] -rotate-90 whitespace-nowrap uppercase">
                      {grade.grade}
                    </h3>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#3a3a3a] px-4 py-2 bg-black/40 backdrop-blur-md flex items-center gap-2">
      <span className="font-mono text-[11px] tracking-[2px] uppercase text-[#999999]">{label}</span>
      <span className="font-mono text-[11px] tracking-[2px] uppercase text-white font-bold">{value}</span>
    </div>
  );
}
