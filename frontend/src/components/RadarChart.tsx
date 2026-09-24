import { useEffect, useRef, useState } from "react";
import { GradeRecommendation } from "../lib/api";
import { radarScores } from "../lib/physics";

interface Props {
  grades: GradeRecommendation[];
  activeIdx: number;
}

const AXES = [
  { label: "STRENGTH", key: 0 },
  { label: "CORROSION", key: 1 },
  { label: "COST VAL.", key: 2 },
  { label: "WORKABILITY", key: 3 },
  { label: "THERMAL", key: 4 },
];

const RADAR_COLORS = ["#ffffff", "#666666", "#3a3a3a"];

export default function RadarChart({ grades, activeIdx }: Props) {
  const [scores, setScores] = useState<number[][]>([]);
  const polyRefs = useRef<(SVGPolygonElement | null)[]>([]);

  useEffect(() => {
    const computed = grades.map(g => radarScores(g));
    setScores(computed);
  }, [grades]);

  useEffect(() => {
    polyRefs.current.forEach(poly => {
      if (!poly) return;
      const len = poly.getTotalLength();
      poly.style.strokeDasharray = `${len}`;
      poly.style.strokeDashoffset = `${len}`;
      // Trigger reflow
      poly.getBoundingClientRect();
      poly.style.transition = "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)";
      poly.style.strokeDashoffset = "0";
    });
  }, [scores]);

  if (!scores.length) return null;

  const getPoints = (data: number[]) => {
    return data.map((val, i) => {
      const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
      const r = (val / 100) * 40;
      return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
    }).join(" ");
  };

  return (
    <div className="w-full max-w-[400px] relative">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        {/* Background Web Grid */}
        {[20, 40, 60, 80, 100].map((ring) => (
          <polygon
            key={ring}
            points={AXES.map((_, i) => {
              const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
              const r = (ring / 100) * 40;
              return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
            }).join(" ")}
            fill="none"
            stroke="#262626"
            strokeWidth={0.5}
          />
        ))}

        {/* Axis Lines */}
        {AXES.map((axis, i) => {
          const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
          return (
            <g key={axis.key}>
              <line
                x1={50} y1={50}
                x2={50 + 40 * Math.cos(angle)}
                y2={50 + 40 * Math.sin(angle)}
                stroke="#3a3a3a" strokeWidth={0.5}
              />
              <text
                x={50 + 48 * Math.cos(angle)}
                y={50 + 48 * Math.sin(angle) + 2}
                textAnchor="middle"
                className="font-mono text-[4px] tracking-[1px] uppercase fill-[#999999]"
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        {/* Data Polygons */}
        {scores.map((data, idx) => {
          const isTop = idx === 0;
          const isActive = idx === activeIdx;
          const color = RADAR_COLORS[idx % RADAR_COLORS.length];
          // Hide non-active non-top grades to keep it austere, unless it's top vs active.
          const show = isTop || isActive;
          if (!show) return null;

          return (
            <polygon
              key={idx}
              ref={el => { polyRefs.current[idx] = el; }}
              points={getPoints(data)}
              fill={isTop ? "rgba(255,255,255,0.05)" : "transparent"}
              stroke={color}
              strokeWidth={isTop ? 1 : 0.5}
              style={{
                opacity: isActive ? 1 : 0.4,
                zIndex: isTop ? 10 : 0
              }}
            />
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-6">
        {grades.map((g, idx) => {
          if (idx !== 0 && idx !== activeIdx) return null;
          const color = RADAR_COLORS[idx % RADAR_COLORS.length];
          return (
            <div key={g.grade} className="flex items-center gap-2">
              <div className="w-3 h-[1px]" style={{ backgroundColor: color }} />
              <span className="font-mono text-[9px] tracking-[2px] uppercase text-[#999999]">
                {idx === 0 ? "OPTIMAL: " : "COMPARE: "}{g.grade}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
