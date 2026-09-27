import React from 'react';
import { motion } from 'framer-motion';
import { SteelGrade } from '@/lib/gradeData';

interface RadarChartProps {
  grade: SteelGrade | undefined;
}

export function RadarChart({ grade }: RadarChartProps) {
  if (!grade) return null;

  const metrics = [
    { label: 'YIELD', value: grade.yieldStrengthMpa, max: 1200 },
    { label: 'TENSILE', value: grade.tensileStrengthMpa, max: 1400 },
    { label: 'HEAT', value: grade.maxTempC, max: 1200 },
    { label: 'PREN', value: grade.pren, max: 45 },
    { label: 'WELD', value: grade.weldability, max: 5 },
    { label: 'MACHINE', value: grade.machinability, max: 5 },
  ];

  const size = 300;
  const center = size / 2;
  const radius = (size / 2) - 40;
  const sides = metrics.length;
  const angleStep = (Math.PI * 2) / sides;

  const gridLevels = [0.33, 0.66, 1];
  
  const getPoint = (value: number, max: number, index: number) => {
    const r = (Math.min(value, max) / max) * radius;
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const points = metrics.map((m, i) => getPoint(m.value, m.max, i));
  const pathString = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="relative w-full aspect-square flex items-center justify-center p-4">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {gridLevels.map((level, i) => {
          const gridPoints = metrics.map((_, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const r = radius * level;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');
          return (
            <polygon 
              key={`grid-${i}`}
              points={gridPoints} 
              fill="none" 
              stroke="#334155" 
              strokeWidth="1" 
              strokeDasharray="4 4"
            />
          );
        })}

        {metrics.map((m, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const endX = center + radius * Math.cos(angle);
          const endY = center + radius * Math.sin(angle);
          
          const labelR = radius + 25;
          const labelX = center + labelR * Math.cos(angle);
          const labelY = center + labelR * Math.sin(angle);
          
          return (
            <g key={`axis-${i}`}>
              <line 
                x1={center} y1={center} 
                x2={endX} y2={endY} 
                stroke="#334155" 
                strokeWidth="1" 
              />
              <text
                x={labelX}
                y={labelY}
                fill="#C7CDD4"
                fontSize="10"
                fontFamily="Share Tech Mono, monospace"
                textAnchor="middle"
                dominantBaseline="middle"
                className="tracking-wider uppercase"
              >
                {m.label}
              </text>
            </g>
          );
        })}

        <motion.path
          d={pathString}
          fill="rgba(27, 138, 61, 0.2)"
          stroke="#1B8A3D"
          strokeWidth="2"
          initial={false}
          animate={{ d: pathString }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
        />
        
        {points.map((p, i) => (
          <motion.circle
            key={`point-${i}`}
            r="4"
            fill="#FF851B"
            initial={false}
            animate={{ cx: p.x, cy: p.y }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
          />
        ))}
      </svg>
    </div>
  );
}
