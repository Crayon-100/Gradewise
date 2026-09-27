export type Shape = "round" | "square" | "rectangular";

export interface PhysicsParams {
  shape: Shape;
  diameterMm: number; // Also used as width for square/rect
  thicknessMm?: number; // Optional wall thickness if hollow, otherwise solid
  lengthMm: number;
  loadKg: number;
  yieldStrengthMpa: number;
  elasticModulusGpa?: number; // typically 193-200 for steel
}

export interface PhysicsResults {
  crossSectionAreaMm2: number;
  momentOfInertiaMm4: number;
  sectionModulusMm3: number;
  maxDeflectionMm: number;
  bendingStressMpa: number;
  stressRatio: number; // Bending Stress / Yield Strength
  yieldLoadKg: number;
  isSafe: boolean;
}

export function calculateBendingPhysics(params: PhysicsParams): PhysicsResults {
  const { shape, diameterMm, lengthMm, loadKg, yieldStrengthMpa } = params;
  const elasticModulusMpa = (params.elasticModulusGpa || 193) * 1000;
  
  // Convert load to Newtons (1 kg = 9.81 N)
  const forceN = loadKg * 9.81;
  const L = lengthMm;

  let area = 0;
  let I = 0; // Moment of Inertia
  let Z = 0; // Section Modulus

  if (shape === "round") {
    const r = diameterMm / 2;
    area = Math.PI * r * r;
    I = (Math.PI * Math.pow(diameterMm, 4)) / 64;
    Z = (Math.PI * Math.pow(diameterMm, 3)) / 32;
  } else if (shape === "square") {
    const a = diameterMm;
    area = a * a;
    I = Math.pow(a, 4) / 12;
    Z = Math.pow(a, 3) / 6;
  } else {
    // Fallback to solid square for simple representation
    const a = diameterMm;
    area = a * a;
    I = Math.pow(a, 4) / 12;
    Z = Math.pow(a, 3) / 6;
  }

  // Max Bending Moment for a point load in the center of a simply supported beam: M = (F * L) / 4
  const M = (forceN * L) / 4;

  // Bending Stress: sigma = M / Z
  const bendingStressMpa = M / Z;

  // Max Deflection for a point load in the center: delta = (F * L^3) / (48 * E * I)
  const maxDeflectionMm = (forceN * Math.pow(L, 3)) / (48 * elasticModulusMpa * I);

  // Load that would cause yielding: F_yield = (YieldStrength * Z * 4) / L
  const yieldForceN = (yieldStrengthMpa * Z * 4) / L;
  const yieldLoadKg = yieldForceN / 9.81;

  const stressRatio = bendingStressMpa / yieldStrengthMpa;
  const isSafe = stressRatio < 1.0;

  return {
    crossSectionAreaMm2: area,
    momentOfInertiaMm4: I,
    sectionModulusMm3: Z,
    maxDeflectionMm,
    bendingStressMpa,
    stressRatio,
    yieldLoadKg,
    isSafe
  };
}
