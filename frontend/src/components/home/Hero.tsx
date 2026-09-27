"use client";

import { motion } from "framer-motion";
import { AmbientSparkles } from "@/components/ui/AmbientSparkles";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { useState } from "react";

export function Hero({ onSearch }: { onSearch: (prompt: string) => void }) {
  const [query, setQuery] = useState("");

  const starterPrompts = [
    "Need maximum pitting resistance for a marine structural load...",
    "What is the most cost-effective steel for indoor appliances?",
    "I need a grade for a high-temperature exhaust system.",
    "Suggest a food-grade steel with high weldability."
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      // The Aceternity component has a particle animation.
      // We delay the onSearch callback just enough for the vanish to start feeling complete, 
      // making the transition to the loading screen feel snappy.
      setTimeout(() => {
        onSearch(query);
      }, 450);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center px-4 pt-20">
      <AmbientSparkles />
      
      {/* Heavy Industrial Headers */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 mb-12 flex flex-col items-center"
      >
        <h1 className="font-instrument text-5xl md:text-7xl lg:text-8xl font-bold text-white uppercase tracking-tight drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] ml-12 md:ml-24">
          Find <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1B8A3D] to-[#FF851B]">Your</span> Perfect Steel
        </h1>
        <p className="mt-4 font-suisse text-white text-lg md:text-xl max-w-2xl mx-auto drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] font-medium">
          Describe your need and we will find the best steel for you.
        </p>
      </motion.div>

      {/* Vanish Search Bar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-3xl z-10"
      >
        <PlaceholdersAndVanishInput 
          placeholders={starterPrompts}
          onChange={(e) => setQuery(e.target.value)}
          onSubmit={handleSubmit}
        />
        
        <div className="text-center mt-6 opacity-50 font-instrument text-sm tracking-widest text-[#C7CDD4] uppercase">
          Powered by Jindal Stainless
        </div>
      </motion.div>

    </div>
  );
}
