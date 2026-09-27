"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface SpiderChartProps {
  corrosion: string;
  weldability: string;
  strength: number;
  maxTemp: number;
}

// Helper to convert qualitative words to 0-100 scores
const parseScore = (val: any) => {
  const s = String(val || "").toLowerCase();
  if (s.includes("excellent") || s.includes("outstanding")) return 95;
  if (s.includes("good")) return 75;
  if (s.includes("fair") || s.includes("moderate")) return 50;
  if (s.includes("poor") || s.includes("low")) return 25;
  return 60; // default
};

export function SpiderChart({ corrosion, weldability, strength, maxTemp }: SpiderChartProps) {
  // Normalize strength (assuming ~170 to 1000 MPa range)
  const strengthScore = Math.min(100, Math.max(20, (strength / 800) * 100));
  
  // Normalize temp (assuming ~200 to 1200 C range)
  const tempScore = Math.min(100, Math.max(20, (maxTemp / 1100) * 100));

  const data = [
    { subject: 'Corrosion', A: parseScore(corrosion) },
    { subject: 'Weldability', A: parseScore(weldability) },
    { subject: 'Strength', A: strengthScore },
    { subject: 'Heat Resist', A: tempScore },
    { subject: 'Machinability', A: 70 }, // Defaulting missing metric for visual balance
  ];

  return (
    <div className="w-full h-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.2)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'var(--font-monument)' }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Grade"
            dataKey="A"
            stroke="#1B8A3D"
            strokeWidth={2}
            fill="#1B8A3D"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
