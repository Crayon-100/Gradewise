/**
 * Amber-Slate HoverBorderGradient
 * ================================
 * Adapted from the Aceternity / Skiper UI "Hover Border Gradient" pattern.
 * The moving radial gradient is recolored to GradeWise's molten-amber palette
 * instead of the original blue.
 */
"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: unknown[]) {
  return twMerge(clsx(inputs));
}

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const movingMap: Record<Direction, string> = {
  TOP:    "radial-gradient(20.7% 50% at 50% 0%,    hsl(24, 80%, 65%) 0%, rgba(234,88,12,0) 100%)",
  LEFT:   "radial-gradient(16.6% 43.1% at 0% 50%,  hsl(24, 80%, 65%) 0%, rgba(234,88,12,0) 100%)",
  BOTTOM: "radial-gradient(20.7% 50% at 50% 100%,  hsl(24, 80%, 65%) 0%, rgba(234,88,12,0) 100%)",
  RIGHT:  "radial-gradient(16.2% 41.2% at 100% 50%, hsl(24, 80%, 65%) 0%, rgba(234,88,12,0) 100%)",
};

// The bloom when hovered — full amber glow
const highlight =
  "radial-gradient(75% 181% at 50% 50%, #ea580c 0%, rgba(234,88,12,0) 100%)";

interface HoverBorderGradientProps {
  as?: React.ElementType;
  containerClassName?: string;
  className?: string;
  duration?: number;
  clockwise?: boolean;
  children: React.ReactNode;
  [key: string]: unknown;
}

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Element = "button",
  duration = 1.2,
  clockwise = true,
  ...props
}: HoverBorderGradientProps) {
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState<Direction>("BOTTOM");

  const rotateDirection = (cur: Direction): Direction => {
    const dirs: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const idx = dirs.indexOf(cur);
    return clockwise
      ? dirs[(idx - 1 + dirs.length) % dirs.length]
      : dirs[(idx + 1) % dirs.length];
  };

  useEffect(() => {
    if (hovered) return;
    const id = setInterval(
      () => setDirection((d) => rotateDirection(d)),
      duration * 1000
    );
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered, duration]);

  return (
    <Element
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex h-min w-fit items-center justify-center",
        "overflow-visible rounded-xl border border-transparent",
        "bg-[#0f0f11]/60 p-px backdrop-blur-sm",
        "transition-all duration-300",
        containerClassName
      )}
      {...props}
    >
      {/* Inner content layer */}
      <div
        className={cn(
          "relative z-10 w-auto rounded-[inherit] bg-[#1a1a1f]",
          "px-6 py-3 font-semibold text-white",
          className
        )}
      >
        {children}
      </div>

      {/* Animated border gradient */}
      <motion.div
        className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
        style={{ filter: "blur(2px)", width: "100%", height: "100%" }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered
            ? [movingMap[direction], highlight]
            : movingMap[direction],
        }}
        transition={{ ease: "linear", duration }}
      />

      {/* Dark background fill (sits between the gradient and content) */}
      <div className="absolute inset-[1px] z-[1] rounded-[inherit] bg-[#1a1a1f]" />
    </Element>
  );
}
