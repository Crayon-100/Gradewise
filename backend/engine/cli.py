"""
GradeWise headless calculator CLI
=================================
Run the physics engine from the terminal — no FastAPI server, no Gemini
API key required. Works offline with any grade in grades.json.

Examples
--------
    python -m engine.cli --grade 304 --dimension 20 --length 1200
    python -m engine.cli --grade "2205 (Duplex)" --shape square --dimension 32 --json
    python -m engine.cli --list-grades

When installed via ``pip install -e .`` this is also available as the
``gradewise-calc`` console script.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Sequence

from engine.calculations import Shape, calc_rod_properties, validate_grade

# Grades.json lives either in the repo layout (backend/data/) or, when this
# module is running from an installed wheel, as package data next to it
# (engine/data/). Try the repo layout first so a checkout never reads a stale
# copy; the packaged copy makes the wheel self-contained.
_REPO_GRADES_PATH = Path(__file__).resolve().parent.parent / "data" / "grades.json"
_PACKAGED_GRADES_PATH = Path(__file__).resolve().parent / "data" / "grades.json"


def default_grades_path() -> Path:
    return _REPO_GRADES_PATH if _REPO_GRADES_PATH.exists() else _PACKAGED_GRADES_PATH


G = 9.81  # m/s², mirrors the engine


def load_grades(path: Path | str | None = None) -> list[dict]:
    """Load and sanity-check the grades dataset. Raises on missing/unusable data."""
    if path is None:
        path = default_grades_path()
    path = Path(path)  # tolerate plain strings from callers/tests
    if not path.exists():
        raise FileNotFoundError(f"grades.json not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        grades = json.load(f)
    if not isinstance(grades, list) or not grades:
        raise ValueError(f"{path} does not contain a non-empty list of grades")
    for grade in grades:
        validate_grade(grade)
    return grades


def _grade_label(g: dict) -> str:
    return str(g["grade"])


def _print_human(rod) -> None:
    t = rod.tensile
    b = rod.bending
    print(f"Grade shape/dimension/span: {rod.shape} {rod.dimension_mm} mm / {rod.length_mm} mm")
    print(f"Rod self-mass:              {rod.mass_kg} kg")
    print(f"Cross-section area:         {t.cross_section_area_mm2} mm^2")
    print()
    print("TENSILE (hanging-weight)")
    print(f"  Yield load:               {t.yield_load_n} N = {t.yield_load_kg} kg")
    print(f"  Elastic stretch:          {t.elastic_stretch_mm} mm")
    print(f"  Fracture load:            {t.fracture_load_n} N = {t.fracture_load_kg} kg")
    print(f"  Total elongation:         {t.total_elongation_mm} mm")
    print()
    print("BENDING (mid-span point load at first yield)")
    print(f"  Second moment (I):        {b.second_moment_mm4} mm^4")
    print(f"  Section modulus (Z):      {b.section_modulus_mm3} mm^3")
    print(f"  Max mid-span load:        {b.max_mid_load_n} N = {b.max_mid_load_kg} kg")
    print(f"  Deflection at yield:      {b.deflection_at_yield_mm} mm")


def _print_json(rod) -> None:
    t = rod.tensile
    b = rod.bending
    print(json.dumps({
        "shape": rod.shape,
        "dimension_mm": rod.dimension_mm,
        "length_mm": rod.length_mm,
        "rod_mass_kg": rod.mass_kg,
        "volume_m3": rod.volume_m3,
        "tensile": {
            "cross_section_area_mm2": t.cross_section_area_mm2,
            "yield_load_n": t.yield_load_n,
            "yield_load_kg": t.yield_load_kg,
            "elastic_stretch_mm": t.elastic_stretch_mm,
            "fracture_load_n": t.fracture_load_n,
            "fracture_load_kg": t.fracture_load_kg,
            "total_elongation_mm": t.total_elongation_mm,
        },
        "bending": {
            "second_moment_mm4": b.second_moment_mm4,
            "section_modulus_mm3": b.section_modulus_mm3,
            "max_mid_load_n": b.max_mid_load_n,
            "max_mid_load_kg": b.max_mid_load_kg,
            "deflection_at_yield_mm": b.deflection_at_yield_mm,
        },
    }, indent=2))


def _find_grade_by_label(grades: list[dict], label: str) -> dict | None:
    """Case-insensitive, whitespace/bracket-normalised grade lookup."""
    normalise = lambda s: "".join(ch for ch in s.lower() if ch not in " \t()\\-")
    target = normalise(label)
    for g in grades:
        if normalise(_grade_label(g)) == target:
            return g
    return None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="gradewise-calc",
        description="GradeWise physics calculator — tensile + bending loads for stainless steel rods.",
    )
    parser.add_argument("--grade", help="Grade label as it appears in grades.json (e.g. '304', '2205 (Duplex)').")
    parser.add_argument("--shape", choices=("round", "square"), default="round",
                        help="Cross-section shape (default: round).")
    parser.add_argument("--dimension", "--diameter", dest="dimension", type=float, default=20.0,
                        help="Diameter (round) or side length (square) in mm (default: 20).")
    parser.add_argument("--length", type=float, default=1200.0,
                        help="Rod / beam span in mm (default: 1200).")
    parser.add_argument("--json", action="store_true",
                        help="Emit machine-readable JSON instead of the human table.")
    parser.add_argument("--list-grades", action="store_true",
                        help="List every grade available in grades.json and exit.")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        grades = load_grades()
    except (FileNotFoundError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.list_grades:
        for g in grades:
            print(_grade_label(g))
        return 0

    if not args.grade:
        parser.error("--grade is required (use --list-grades to see available grades)")

    grade = _find_grade_by_label(grades, args.grade)
    if grade is None:
        print(f"error: unknown grade {args.grade!r} — use --list-grades to see available grades",
              file=sys.stderr)
        return 2

    if args.dimension <= 0 or args.length <= 0:
        print("error: --dimension and --length must be positive", file=sys.stderr)
        return 2

    shape: Shape = args.shape
    rod = calc_rod_properties(grade, args.dimension, args.length, shape=shape)

    if args.json:
        _print_json(rod)
    else:
        print(f"Grade: {_grade_label(grade)}")
        _print_human(rod)
    return 0


if __name__ == "__main__":
    sys.exit(main())