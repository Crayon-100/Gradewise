import React from 'react';
import { SteelGrade } from '@/lib/gradeData';

export function MetricCards({ grade }: { grade: SteelGrade | undefined }) {
  if (!grade) return null;

  const metrics = [
    { label: 'YIELD STRENGTH', value: `${grade.yieldStrengthMpa} MPa` },
    { label: 'TENSILE STRENGTH', value: `${grade.tensileStrengthMpa} MPa` },
    { label: 'MAX TEMP', value: `${grade.maxTempC} °C` },
    { label: 'PREN (CORROSION)', value: grade.pren },
    { label: 'WELDABILITY', value: `${grade.weldability}/5` },
    { label: 'COST TIER', value: `${grade.costTier}/5` },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {metrics.map((m, i) => (
        <div key={i} className="bg-[#0B1222]/80 border border-[#334155] rounded p-3 flex flex-col justify-between">
          <span className="font-instrument text-xs text-[#8E9BAE] uppercase tracking-wider mb-1">
            {m.label}
          </span>
          <span className="font-monument text-[#1B8A3D] text-lg font-bold">
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}
