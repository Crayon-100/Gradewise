import { TraitTag } from "./gradeData";

export interface PhysicsNumbers {
  cross_section_area_mm2: number;
  yield_load_n: number;
  yield_load_kg: number;
  elastic_stretch_mm: number;
  fracture_load_n: number;
  fracture_load_kg: number;
  total_elongation_mm: number;
  second_moment_mm4: number;
  section_modulus_mm3: number;
  bending_yield_load_n: number;
  bending_yield_load_kg: number;
  deflection_at_yield_mm: number;
  rod_mass_kg: number;
}

export interface AIRecommendation {
  grade: string;
  ai_explanation: string;
  trade_off_notes: string;
  corrosion_resistance: string;
  max_service_temp_c: number;
  weldability: string;
  yield_strength_mpa: number;
  physics?: PhysicsNumbers;
}

export interface AIAnalysisResult {
  character_id: TraitTag[]; // 5-word array returned instantly or at start
  recommendations: AIRecommendation[];
}

export async function analyzePrompt(prompt: string): Promise<AIAnalysisResult> {
  // Inject the specific context the user requested so the AI always knows the domain
  const enrichedPrompt = `I am looking for a stainless steel type from your database for the following application or keyword: ${prompt}. Please recommend the best options.`;

  try {
    const rawUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const API_URL = rawUrl.replace(/\/+$/, "");
    
    // Hit the real FastAPI backend endpoint
    console.log(`Sending to: ${API_URL}/recommend`);
    const res = await fetch(`${API_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_need: enrichedPrompt }),
    });
    
    console.log(`Response status: ${res.status}`);
    if (res.ok) {
      return await res.json();
    }
    
    // Throw an error so the UI handles it and shows the 404 popup overlay!
    console.error(`Backend returned HTTP ${res.status}`);
    throw new Error("OUT_OF_CONTEXT");
    
  } catch (error) {
    console.error("API Error:", error);
    throw error; // Throw upward to page.tsx
  }

  // MOCK FALLBACK for development if backend is offline
  return new Promise((resolve) => {
    setTimeout(() => {
      // Determine pseudo-character ID based on prompt keywords
      const charId: TraitTag[] = [];
      const p = prompt.toLowerCase();
      if (p.includes("sea") || p.includes("salt") || p.includes("marine")) charId.push("MARINE", "CORROSIVE");
      if (p.includes("heat") || p.includes("hot") || p.includes("fire")) charId.push("HIGH_TEMP", "EXHAUST");
      if (p.includes("cheap") || p.includes("budget")) charId.push("BUDGET");
      if (p.includes("car") || p.includes("auto")) charId.push("AUTOMOTIVE", "EXHAUST");
      
      // Pad to 5
      const defaults: TraitTag[] = ["STRUCTURAL", "WELDABLE", "MACHINABLE", "AESTHETIC", "WEAR_RESISTANT"];
      while (charId.length < 5) {
        charId.push(defaults.shift()!);
      }

      const mockPhysics: PhysicsNumbers = {
        cross_section_area_mm2: 314,
        yield_load_n: 65000,
        yield_load_kg: 6625,
        elastic_stretch_mm: 1.5,
        fracture_load_n: 120000,
        fracture_load_kg: 12232,
        total_elongation_mm: 400,
        second_moment_mm4: 7853,
        section_modulus_mm3: 785,
        bending_yield_load_n: 2150,
        bending_yield_load_kg: 219,
        deflection_at_yield_mm: 45,
        rod_mass_kg: 2.5
      };

      resolve({
        character_id: charId.slice(0, 5),
        recommendations: [
          {
            grade: "316L",
            ai_explanation: "For marine or high-corrosion environments, 316L provides the necessary molybdenum to resist chloride pitting.",
            trade_off_notes: "More expensive than 304, slightly lower yield strength.",
            corrosion_resistance: "Excellent",
            max_service_temp_c: 870,
            weldability: "Excellent",
            yield_strength_mpa: 170,
            physics: mockPhysics
          },
          {
            grade: "2205",
            ai_explanation: "If you need both extreme strength and marine-grade corrosion resistance, Duplex 2205 is the premium choice.",
            trade_off_notes: "Very expensive, harder to machine.",
            corrosion_resistance: "Outstanding",
            max_service_temp_c: 300,
            weldability: "Good",
            yield_strength_mpa: 450,
            physics: { ...mockPhysics, yield_load_kg: 14000, bending_yield_load_kg: 400, deflection_at_yield_mm: 35 }
          }
        ]
      });
    }, 2500); // 2.5s delay to show off the morphing spinner
  });
}
