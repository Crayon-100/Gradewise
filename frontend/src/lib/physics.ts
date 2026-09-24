import { PhysicsNumbers } from "./api";

/**
 * Client-Side Physics Engine
 * Recalculates all physics in real-time when sliders move.
 * Supports both solid circular (round) and solid square rods.
 */
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
  // Convert basic properties
  const sigma_y = yield_strength_mpa; // N/mm^2
  const sigma_u = tensile_strength_mpa; // N/mm^2
  const E = youngs_modulus_gpa * 1000.0; // N/mm^2
  const g = 9.81; // m/s^2

  // 1. Geometry Calculations
  let A_mm2 = 0;
  let I_mm4 = 0;
  let Z_mm3 = 0;
  let volume_m3 = 0;

  if (shape === "round") {
    A_mm2 = (Math.PI * Math.pow(dimension_mm, 2)) / 4.0;
    I_mm4 = (Math.PI * Math.pow(dimension_mm, 4)) / 64.0;
    Z_mm3 = (Math.PI * Math.pow(dimension_mm, 3)) / 32.0;
    const radius_m = dimension_mm / 2.0 / 1000.0;
    volume_m3 = Math.PI * Math.pow(radius_m, 2) * (length_mm / 1000.0);
  } else {
    // square
    A_mm2 = Math.pow(dimension_mm, 2);
    I_mm4 = Math.pow(dimension_mm, 4) / 12.0;
    Z_mm3 = Math.pow(dimension_mm, 3) / 6.0;
    volume_m3 = Math.pow(dimension_mm / 1000.0, 2) * (length_mm / 1000.0);
  }

  const rod_mass_kg = volume_m3 * density_kg_m3;

  // 2. Tensile Calculations (Hanging Weight)
  const yield_load_n = sigma_y * A_mm2;
  const yield_load_kg = yield_load_n / g;
  const elastic_stretch_mm = (sigma_y * length_mm) / E;

  const fracture_load_n = sigma_u * A_mm2;
  const fracture_load_kg = fracture_load_n / g;
  const total_elongation_mm = (elongation_pct / 100.0) * length_mm;

  // 3. Bending Calculations (See-saw / Supported Beam)
  const bending_yield_load_n = (4.0 * sigma_y * Z_mm3) / length_mm;
  const bending_yield_load_kg = bending_yield_load_n / g;
  const deflection_at_yield_mm =
    (bending_yield_load_n * Math.pow(length_mm, 3)) / (48.0 * E * I_mm4);

  return {
    cross_section_area_mm2: Number(A_mm2.toFixed(4)),
    yield_load_n: Number(yield_load_n.toFixed(2)),
    yield_load_kg: Number(yield_load_kg.toFixed(2)),
    elastic_stretch_mm: Number(elastic_stretch_mm.toFixed(4)),
    fracture_load_n: Number(fracture_load_n.toFixed(2)),
    fracture_load_kg: Number(fracture_load_kg.toFixed(2)),
    total_elongation_mm: Number(total_elongation_mm.toFixed(2)),
    second_moment_mm4: Number(I_mm4.toFixed(4)),
    section_modulus_mm3: Number(Z_mm3.toFixed(4)),
    bending_yield_load_n: Number(bending_yield_load_n.toFixed(2)),
    bending_yield_load_kg: Number(bending_yield_load_kg.toFixed(2)),
    deflection_at_yield_mm: Number(deflection_at_yield_mm.toFixed(4)),
    rod_mass_kg: Number(rod_mass_kg.toFixed(3)),
  };
}
