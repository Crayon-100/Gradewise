import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { AIRecommendation } from '@/lib/api';
import { SteelGrade } from '@/lib/gradeData';

interface RecommendedGrade extends AIRecommendation {
  gradeData: SteelGrade;
}

interface GradeAccordionProps {
  recommendations: RecommendedGrade[];
  activeIndex: number;
  onHover: (index: number) => void;
}

function AccordionCard({ 
  rec, 
  isActive, 
  onEnter 
}: { 
  rec: RecommendedGrade, 
  isActive: boolean, 
  onEnter: () => void 
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={onEnter}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className="relative cursor-pointer mb-4"
    >
      <motion.div 
        animate={{ 
          height: isActive ? "auto" : "80px",
          borderColor: isActive ? "#FF851B" : "#334155"
        }}
        className="overflow-hidden rounded-xl border bg-[#0B1222]/90 backdrop-blur-md shadow-2xl relative"
        style={{ transform: "translateZ(30px)" }}
      >
        <div className="flex items-center p-4">
          <div className="flex-1">
            <h3 className="font-instrument text-2xl font-bold text-white mb-1">
              {rec.gradeData.grade}
            </h3>
            <p className="font-suisse text-sm text-[#8E9BAE] truncate max-w-[280px]">
              {rec.gradeData.type} Stainless Steel
            </p>
          </div>
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#334155] flex-shrink-0">
            <img 
              src={rec.gradeData.image} 
              alt={rec.gradeData.grade}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        {/* Expanded Content */}
        <motion.div 
          initial={false}
          animate={{ opacity: isActive ? 1 : 0 }}
          className="px-4 pb-4"
        >
          <div className="w-full h-px bg-[#334155] mb-4" />
          <p className="font-suisse text-sm text-[#C7CDD4] mb-3">
            <strong className="text-[#FF851B]">Why:</strong> {rec.ai_explanation}
          </p>
          <p className="font-suisse text-sm text-[#C7CDD4] mb-6">
            <strong className="text-[#1B8A3D]">Trade-offs:</strong> {rec.trade_off_notes}
          </p>
          
          <div className="w-full flex justify-end">
             <button className="bg-gradient-to-r from-[#1B8A3D] to-[#25b550] text-[#0B1222] font-instrument font-bold px-6 py-2 rounded-full hover:shadow-[0_0_20px_rgba(27,138,61,0.4)] transition-all uppercase tracking-wider text-sm flex justify-center items-center gap-2">
                View Details <span>?</span>
             </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function GradeAccordion({ recommendations, activeIndex, onHover }: GradeAccordionProps) {
  return (
    <div className="w-full perspective-1000 flex flex-col gap-2">
      <h2 className="font-instrument text-3xl font-bold text-white mb-6 uppercase tracking-widest border-b border-[#334155] pb-2">
        Recommended Grades
      </h2>
      {recommendations.map((rec, idx) => (
        <AccordionCard 
          key={rec.grade}
          rec={rec}
          isActive={activeIndex === idx}
          onEnter={() => onHover(idx)}
        />
      ))}
    </div>
  );
}
