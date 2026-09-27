"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export function AmbientSparkles() {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const arr = [];
    for (let i = 0; i < 120; i++) {
      arr.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 6 + 6, // 6s to 12s (faster, more active)
        delay: Math.random() * 5,
      });
    }
    setSparkles(arr);
  }, []);

  if (sparkles.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-[#FF851B] shadow-[0_0_12px_rgba(255,133,27,1)]"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
          }}
          animate={{
            y: [0, -100, -200],
            x: [0, Math.random() * 20 - 10, Math.random() * 40 - 20], // slight horizontal drift
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0.5],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
