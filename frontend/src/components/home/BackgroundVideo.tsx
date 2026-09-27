"use client";

import { useRef, useEffect, useState } from "react";
import { useLenis } from "lenis/react";

export function BackgroundVideo({ isLocked = false }: { isLocked?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const frameCount = 240;
  const currentFrameRef = useRef(0);

  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    
    // Pre-load all 240 frames into memory
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      const frameStr = i.toString().padStart(4, "0");
      img.src = `/bg-frames/frame_${frameStr}.jpg`;
      loadedImages.push(img);
      
      // Draw the very first frame immediately upon load so the screen isn't black
      img.onload = () => {
        if (i === 0) {
          drawFrame(0, loadedImages);
        }
      };
    }
    setImages(loadedImages);

    // Handle window resizes
    const handleResize = () => {
      drawFrame(currentFrameRef.current, loadedImages);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const drawFrame = (index: number, imgArray: HTMLImageElement[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgArray[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    // Set canvas dimensions to match viewport for high-fidelity drawing
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Calculate 'object-cover' mathematics to fill the screen flawlessly
    const imgRatio = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgRatio;
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      drawWidth = canvas.height * imgRatio;
      drawHeight = canvas.height;
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  // 2. Tie the canvas render loop strictly to the Lenis requestAnimationFrame
  useLenis(({ progress }) => {
    if (images.length === 0 || isLocked) return;
    
    // Map 0-1 scroll progress to 0-239 frames
    const frameIndex = Math.min(frameCount - 1, Math.max(0, Math.floor(progress * frameCount)));
    currentFrameRef.current = frameIndex;
    drawFrame(frameIndex, images);
  });

  return (
    <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full contrast-125 saturate-150 brightness-90"
      />
    </div>
  );
}
