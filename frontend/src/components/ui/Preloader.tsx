"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function Preloader() {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (sessionStorage.getItem("gradewise_has_visited")) {
      setIsAnimating(false);
      return;
    }
    
    // Component unmounts itself after animation completes
    const timer = setTimeout(() => {
      sessionStorage.setItem("gradewise_has_visited", "true");
      setIsAnimating(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Force exact match on first hydration pass
  if (mounted && !isAnimating) return null;

  const columns = 25;

  return (
    <div id="gradewise-preloader" className="fixed inset-0 z-[9999] pointer-events-none flex w-full h-full">
      {/* Intro Text */}
      <div className="absolute inset-0 flex items-center justify-center z-50">
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-instrument text-3xl md:text-5xl font-bold tracking-widest uppercase text-[#0B1222]"
        >
          <motion.span
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 1.4 }}
          >
            Steel decisions, made visible.
          </motion.span>
        </motion.h1>
      </div>

      {/* The White "Stairs" Columns (Split Top & Bottom) */}
      {[...Array(columns)].map((_, i) => (
        <div key={i} className="relative h-full flex-1 flex flex-col">
          {/* Top Half */}
          <motion.div
            className="w-full h-1/2 bg-white"
            initial={{ y: "0%" }}
            animate={{ y: "-100%" }}
            transition={{ 
              duration: 0.8, 
              delay: 1.5 + (i * 0.035), 
              ease: [0.76, 0, 0.24, 1] 
            }}
          />
          {/* Bottom Half */}
          <motion.div
            className="w-full h-1/2 bg-white"
            initial={{ y: "0%" }}
            animate={{ y: "100%" }}
            transition={{ 
              duration: 0.8, 
              delay: 1.5 + (i * 0.035), 
              ease: [0.76, 0, 0.24, 1] 
            }}
          />
        </div>
      ))}
    </div>
  );
}
