"use client";
import { motion } from "framer-motion";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#0a0a0c]">
      {/* Grid texture */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Ambient Orbs */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[120px] opacity-20"
        style={{ background: "radial-gradient(circle, #ea580c 0%, transparent 70%)" }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.div
        className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[140px] opacity-10"
        style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
        animate={{
          x: [0, -100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0a0c_100%)] opacity-80" />
    </div>
  );
}
