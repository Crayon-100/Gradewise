/**
 * GradeWise API Client
 * 
 * All API calls use NEXT_PUBLIC_BACKEND_URL.
 * Defaults to http://localhost:8000 for local development.
 */

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "http://localhost:8000";

export interface RecommendRequest {
  user_need: string;
  diameter_mm: number;
  length_mm: number;
}

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

export interface GradeRecommendation {
  grade: string;
  uns_no: string;
  series: string;
  type: string;
  corrosion_resistance: number;
  cost_tier: number;
  formability: number;
  weldability: string;
  magnetic: string;
  max_service_temp_c: number;
  typical_applications: string;
  ai_explanation: string;
  trade_off_notes: string;
  physics: PhysicsNumbers;
}

export interface RecommendResponse {
  user_need: string;
  diameter_mm: number;
  length_mm: number;
  recommendations: GradeRecommendation[];
}

/**
 * Health check probe to test backend connectivity
 */
export async function checkBackendHealth(): Promise<{ status: string }> {
  const response = await fetch(`${BACKEND_URL}/health`);
  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch grade recommendations + deterministic physics numbers
 */
export async function getRecommendations(
  req: RecommendRequest
): Promise<RecommendResponse> {
  const response = await fetch(`${BACKEND_URL}/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Recommendation request failed (${response.status}): ${errorBody || response.statusText}`
    );
  }

  return response.json();
}
