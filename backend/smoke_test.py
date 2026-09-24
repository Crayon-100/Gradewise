"""
Quick smoke-test for main.py — checks:
  1. All imports resolve cleanly (no GEMINI_API_KEY needed to import)
  2. grades.json loads and has the expected 17 records
  3. calc_rod_properties() runs on real grade stubs for round AND square
  4. The /health and /recommend endpoints are registered on the FastAPI app

Run with:
  python backend/smoke_test.py
(from the repo root)
"""

import sys
from pathlib import Path

# Make sure we can import from the backend package tree when run from repo root
sys.path.insert(0, str(Path(__file__).parent))

print("1/4  Importing FastAPI app (no API key required)...")
from main import app, GRADES, _find_grade
print(f"     OK — {len(GRADES)} grades loaded from grades.json")

assert len(GRADES) == 17, f"Expected 17 grades, got {len(GRADES)}"

print("2/4  Checking grade lookup...")
g304 = _find_grade("304")
assert g304 is not None, "'304' not found in GRADES_BY_LABEL"
assert g304["yield_strength_mpa"] == 215, "Unexpected yield for 304"
g_duplex = _find_grade("2205 (Duplex)")
assert g_duplex is not None, "'2205 (Duplex)' not found"
print(f"     OK — 304 yield={g304['yield_strength_mpa']} MPa, 2205 yield={g_duplex['yield_strength_mpa']} MPa")

print("3/4  Running physics engine: 316 round (25 mm, 1500 mm) + 2205 square (32 mm, 2000 mm)...")
from engine.calculations import calc_rod_properties
g316 = _find_grade("316")
assert g316 is not None
rod = calc_rod_properties(g316, dimension_mm=25.0, length_mm=1500.0, shape="round")
assert rod.tensile.fracture_load_n > 0
assert rod.bending.max_mid_load_kg > 0
assert g_duplex is not None
square = calc_rod_properties(g_duplex, dimension_mm=32.0, length_mm=2000.0, shape="square")
assert square.tensile.cross_section_area_mm2 == 1024.0, "square area should be d^2 = 1024"
assert round(square.bending.section_modulus_mm3, 4) == round(32 ** 3 / 6.0, 4)
print(f"     OK — round fracture={rod.tensile.fracture_load_kg} kg, bending yield={rod.bending.max_mid_load_kg} kg")
print(f"     OK — square area={square.tensile.cross_section_area_mm2} mm^2, Z={square.bending.section_modulus_mm3} mm^3")

print("4/4  Checking FastAPI routes...")
routes = {r.path for r in app.routes}
assert "/health" in routes, "/health route missing"
assert "/recommend" in routes, "/recommend route missing"
print(f"     OK — routes: {sorted(routes)}")

print("\nAll smoke tests passed.")