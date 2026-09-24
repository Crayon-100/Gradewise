/**
 * GradeWise Client-Side Physics Engine
 * ======================================
 * Mirrors the formulas in backend/engine/calculations.py exactly.
 * Runs in the browser with 0ms latency so sliders can recalculate
 * all physics numbers without touching the network.
 *
 * Supports solid round (circular) and solid square cross-sections.
 */

import type { PhysicsNumbers } from "./api";

const G = 9.81; // m/s² — standard gravity

export function calculatePhysics(
  shape: "round" | "square",
  dimension_mm: number,
  length_mm: number,
  yield_strength_mpa: number,
  tensile_strength_mpa: number,
  youngs_modulus_gpa: number,
  elongation_pct: number,
  density_kg_m3: number
): PhysicsNumbers {
  const sigma_y = yield_strength_mpa;           // N/mm²
  const sigma_u = tensile_strength_mpa;          // N/mm²
  const E = youngs_modulus_gpa * 1_000.0;        // N/mm²  (GPa → MPa)

  // ── Geometry ────────────────────────────────────────────────────────────
  let A_mm2: number;   // cross-section area
  let I_mm4: number;   // second moment of area
  let Z_mm3: number;   // section modulus
  let volume_m3: number;

  if (shape === "round") {
    A_mm2     = (Math.PI * dimension_mm ** 2) / 4;
    I_mm4     = (Math.PI * dimension_mm ** 4) / 64;
    Z_mm3     = (Math.PI * dimension_mm ** 3) / 32;
    const r_m = (dimension_mm / 2) / 1_000;
    volume_m3 = Math.PI * r_m ** 2 * (length_mm / 1_000);
  } else {
    // solid square
    A_mm2     = dimension_mm ** 2;
    I_mm4     = dimension_mm ** 4 / 12;
    Z_mm3     = dimension_mm ** 3 / 6;
    volume_m3 = (dimension_mm / 1_000) ** 2 * (length_mm / 1_000);
  }

  // ── Tensile (hanging-weight) ────────────────────────────────────────────
  const yield_load_n        = sigma_y * A_mm2;
  const elastic_stretch_mm  = (sigma_y * length_mm) / E;           // Hooke's Law
  const fracture_load_n     = sigma_u * A_mm2;
  const total_elongation_mm = (elongation_pct / 100) * length_mm;

  // ── Bending (simply-supported, central point load) ──────────────────────
  // Max mid-span load before outer fibre reaches σ_y: F = 4 σ_y Z / L
  const bending_yield_load_n  = (4 * sigma_y * Z_mm3) / length_mm;
  // Mid-span deflection at that load: δ = F L³ / (48 E I)
  const deflection_at_yield_mm =
    (bending_yield_load_n * length_mm ** 3) / (48 * E * I_mm4);

  const rod_mass_kg = volume_m3 * density_kg_m3;

  return {
    cross_section_area_mm2:  round(A_mm2,  4),
    yield_load_n:            round(yield_load_n,  2),
    yield_load_kg:           round(yield_load_n / G,  2),
    elastic_stretch_mm:      round(elastic_stretch_mm,  4),
    fracture_load_n:         round(fracture_load_n,  2),
    fracture_load_kg:        round(fracture_load_n / G,  2),
    total_elongation_mm:     round(total_elongation_mm,  2),
    second_moment_mm4:       round(I_mm4,  4),
    section_modulus_mm3:     round(Z_mm3,  4),
    bending_yield_load_n:    round(bending_yield_load_n,  2),
    bending_yield_load_kg:   round(bending_yield_load_n / G,  2),
    deflection_at_yield_mm:  round(deflection_at_yield_mm,  4),
    rod_mass_kg:             round(rod_mass_kg,  3),
  };
}

/** Round to n decimal places */
function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

/**
 * Normalise a raw grade value to a 0–100 radar axis score.
 * Intentionally exported so the RadarChart component can use it.
 */
export function radarScores(grade: {
  yield_strength_mpa: number;
  tensile_strength_mpa: number;
  corrosion_resistance: number;
  cost_tier: number;
  formability: number;
  max_service_temp_c: number;
}): [number, number, number, number, number] {
  // Axis 1: Mechanical Strength  (yield 170–690 MPa range across JSL portfolio)
  const strength = Math.min(100, (grade.yield_strength_mpa / 700) * 100);
  // Axis 2: Corrosion Resistance  (already 1–5)
  const corrosion = (grade.corrosion_resistance / 5) * 100;
  // Axis 3: Cost Efficiency  (lower tier = better value, invert)
  const costValue = ((5 - grade.cost_tier + 1) / 5) * 100;
  // Axis 4: Workability / Formability  (1–5)
  const workability = (grade.formability / 5) * 100;
  // Axis 5: Thermal Endurance  (350–1100 °C range)
  const thermal = Math.min(100, ((grade.max_service_temp_c - 300) / 900) * 100);
  return [strength, corrosion, costValue, workability, thermal];
}
