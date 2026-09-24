"""
Physics engine tests — every expected value below is a hand-derived / classic
formula literal (cross-checked independently), not an echo of the engine.

Reference case (grade 304: σy=215 MPa, σu=505 MPa, E=193 GPa, el=40%,
ρ=8000 kg/m³ — rod 20 mm × 1200 mm):
  A_round = π·20²/4            = 314.1593 mm²
  A_square = 20²               = 400 mm²
  I_round  = π·20⁴/64          = 7853.9816 mm⁴
  Z_round  = π·20³/32          = 785.3982 mm³
  I_square = 20⁴/12            = 13333.3333 mm⁴
  Z_square = 20³/6             = 1333.3333 mm³
  F_yield(round)  = 215·A      = 67544.24 N = 6885.24 kg
  F_fracture(round)= 505·A     = 158650.43 N = 16172.32 kg
  elastic stretch  = σ·L/E     = 1.3368 mm
  total elongation = 40%·1200  = 480.0 mm
  bending F(round) = 4·215·Z/L = 562.87 N = 57.38 kg
  deflection(round)= F·L³/48EI = 13.3679 mm
  volume(round)    = π·r²·L    = 0.00037699 m³ → mass = 3.016 kg
  volume(square)   = d²·L      = 0.00048 m³ → mass = 3.84 kg
"""

import math

import pytest

from engine.calculations import (
    REQUIRED_GRADE_KEYS,
    calc_bending_yield,
    calc_rod_properties,
    calc_tensile_failure,
    cross_section_geometry,
    validate_grade,
)

GRADE_304 = {
    "grade": "304",
    "yield_strength_mpa": 215,
    "tensile_strength_mpa": 505,
    "youngs_modulus_gpa": 193,
    "elongation_pct": 40,
    "density_kg_m3": 8000,
}

G = 9.81


# ---------------------------------------------------------------------------
# cross_section_geometry
# ---------------------------------------------------------------------------

class TestCrossSectionGeometry:
    def test_round_values(self):
        A, I, Z, vol_per_mm = cross_section_geometry("round", 20.0)
        assert round(A, 4) == 314.1593
        assert round(I, 4) == 7853.9816
        assert round(Z, 4) == 785.3982
        # π·(0.01 m)² per metre of rod → per mm: π·(0.01)²/1000
        assert vol_per_mm == pytest.approx(math.pi * 0.01 ** 2 / 1000.0)

    def test_square_values(self):
        A, I, Z, vol_per_mm = cross_section_geometry("square", 20.0)
        assert round(A, 4) == 400.0
        assert round(I, 4) == 13333.3333
        assert round(Z, 4) == 1333.3333
        assert vol_per_mm == pytest.approx((0.02 ** 2) / 1000.0)

    def test_section_modulus_identity(self):
        """Z must equal I/(d/2) for BOTH shapes (outermost-fibre distance)."""
        for shape in ("round", "square"):
            A, I, Z, _ = cross_section_geometry(shape, 12.0)
            assert Z == pytest.approx(I / (12.0 / 2.0))
        assert A > 0

    def test_square_stiffer_per_area(self):
        """Same 'dimension', square has a bigger second moment than round."""
        _, I_r, _, _ = cross_section_geometry("round", 20.0)
        _, I_sq, _, _ = cross_section_geometry("square", 20.0)
        assert I_sq > I_r

    def test_bad_shape_raises(self):
        with pytest.raises(ValueError, match="round.*square"):
            cross_section_geometry("triangle", 20.0)  # type: ignore[arg-type]

    @pytest.mark.parametrize("bad", [0.0, -5.0])
    def test_non_positive_dimension_raises(self, bad):
        with pytest.raises(ValueError, match="positive"):
            cross_section_geometry("round", bad)


# ---------------------------------------------------------------------------
# calc_tensile_failure
# ---------------------------------------------------------------------------

class TestTensile:
    def test_round_304_exact_literals(self):
        t = calc_tensile_failure(215, 505, 193, 40, 20.0, 1200.0, shape="round")
        assert t.cross_section_area_mm2 == 314.1593
        assert t.yield_load_n == 67544.24
        assert t.yield_load_kg == 6885.24
        assert t.elastic_stretch_mm == 1.3368
        assert t.fracture_load_n == 158650.43
        assert t.fracture_load_kg == 16172.32
        assert t.total_elongation_mm == 480.0

    def test_square_304_area_and_loads(self):
        t = calc_tensile_failure(215, 505, 193, 40, 20.0, 1200.0, shape="square")
        assert t.cross_section_area_mm2 == 400.0
        assert t.yield_load_n == 86000.0
        assert t.yield_load_kg == 8766.56
        assert t.fracture_load_n == 202000.0
        assert t.fracture_load_kg == 20591.23

    def test_default_shape_is_round(self):
        t_with = calc_tensile_failure(215, 505, 193, 40, 20.0, 1200.0, shape="round")
        t_default = calc_tensile_failure(215, 505, 193, 40, 20.0, 1200.0)
        assert t_default == t_with

    def test_elastic_stretch_matches_hooke(self):
        """delta = σL/E: doubling σ doubles the stretch; doubling L doubles it."""
        base = calc_tensile_failure(215, 505, 193, 40, 20.0, 1200.0)
        taller = calc_tensile_failure(215, 505, 193, 40, 20.0, 2400.0)
        assert taller.elastic_stretch_mm == pytest.approx(2 * base.elastic_stretch_mm)

    def test_elongation_scales_with_length(self):
        base = calc_tensile_failure(215, 505, 193, 40, 20.0, 800.0)
        assert base.total_elongation_mm == 320.0

    def test_kg_conversion_uses_981(self):
        t = calc_tensile_failure(215, 505, 193, 40, 20.0, 1200.0)
        assert t.yield_load_kg == pytest.approx(t.yield_load_n / G, abs=0.01)

    def test_non_positive_length_raises(self):
        with pytest.raises(ValueError, match="positive"):
            calc_tensile_failure(215, 505, 193, 40, 20.0, 0.0)


# ---------------------------------------------------------------------------
# calc_bending_yield
# ---------------------------------------------------------------------------

class TestBending:
    def test_round_304_exact_literals(self):
        b = calc_bending_yield(215, 193, 20.0, 1200.0, shape="round")
        assert b.second_moment_mm4 == 7853.9816
        assert b.section_modulus_mm3 == 785.3982
        assert b.max_mid_load_n == 562.87
        assert b.max_mid_load_kg == 57.38
        assert b.deflection_at_yield_mm == 13.3679

    def test_square_304_exact_literals(self):
        b = calc_bending_yield(215, 193, 20.0, 1200.0, shape="square")
        assert b.second_moment_mm4 == 13333.3333
        assert b.section_modulus_mm3 == 1333.3333
        assert b.max_mid_load_n == 955.56
        assert b.max_mid_load_kg == 97.41
        # Z = I/(d/2) holds for square → deflection formula identical
        assert b.deflection_at_yield_mm == 13.3679

    def test_bending_formula_echo(self):
        """F = 4σZ/L and δ = FL³/48EI, direct."""
        sigma_y, E, d, L = 250.0, 200_000.0, 15.0, 1000.0
        A, I, Z, _ = cross_section_geometry("round", d)
        F = 4.0 * sigma_y * Z / L
        delta = F * L ** 3 / (48.0 * E * I)
        b = calc_bending_yield(sigma_y, E / 1000.0, d, L)
        assert b.max_mid_load_n == pytest.approx(F, abs=0.005)
        assert b.deflection_at_yield_mm == pytest.approx(delta, abs=0.0001)

    def test_longer_span_weaker(self):
        short = calc_bending_yield(215, 193, 20.0, 600.0)
        long = calc_bending_yield(215, 193, 20.0, 2400.0)
        assert long.max_mid_load_kg < short.max_mid_load_kg

    def test_non_positive_span_raises(self):
        with pytest.raises(ValueError, match="positive"):
            calc_bending_yield(215, 193, 20.0, -1.0)


# ---------------------------------------------------------------------------
# calc_rod_properties
# ---------------------------------------------------------------------------

class TestRodProperties:
    def test_round_304_full_profile(self):
        r = calc_rod_properties(GRADE_304, 20.0, 1200.0, shape="round")
        assert r.shape == "round"
        assert r.dimension_mm == 20.0
        assert r.length_mm == 1200.0
        assert r.volume_m3 == 0.00037699
        assert r.mass_kg == 3.016
        assert r.tensile.cross_section_area_mm2 == 314.1593
        assert r.bending.max_mid_load_kg == 57.38

    def test_square_304_full_profile(self):
        r = calc_rod_properties(GRADE_304, 20.0, 1200.0, shape="square")
        assert r.volume_m3 == 0.00048
        assert r.mass_kg == 3.84
        assert r.tensile.cross_section_area_mm2 == 400.0

    def test_default_shape_round(self):
        assert calc_rod_properties(GRADE_304, 20.0, 1200.0).shape == "round"

    def test_stress_is_shape_independent(self):
        """Elastic stretch / elongation depend only on σ, L, E — not shape."""
        r_r = calc_rod_properties(GRADE_304, 20.0, 1200.0, shape="round")
        r_s = calc_rod_properties(GRADE_304, 20.0, 1200.0, shape="square")
        assert r_s.tensile.elastic_stretch_mm == r_r.tensile.elastic_stretch_mm
        assert r_s.tensile.total_elongation_mm == r_r.tensile.total_elongation_mm

    def test_mass_scales_with_density(self):
        double = dict(GRADE_304, density_kg_m3=16000)
        r = calc_rod_properties(double, 20.0, 1200.0)
        assert r.mass_kg == pytest.approx(2 * 3.016, abs=0.001)

    def test_calls_validate_grade(self):
        bad = dict(GRADE_304)
        del bad["density_kg_m3"]
        with pytest.raises(ValueError, match="density_kg_m3"):
            calc_rod_properties(bad, 20.0, 1200.0)


# ---------------------------------------------------------------------------
# validate_grade
# ---------------------------------------------------------------------------

class TestValidateGrade:
    def test_valid_grade_passes(self):
        assert validate_grade(GRADE_304) is GRADE_304

    def test_missing_key_names_all(self):
        bad = dict(GRADE_304)
        del bad["youngs_modulus_gpa"]
        del bad["elongation_pct"]
        with pytest.raises(ValueError) as exc:
            validate_grade(bad)
        msg = str(exc.value)
        assert "youngs_modulus_gpa" in msg
        assert "elongation_pct" in msg

    def test_non_numeric_field_rejected(self):
        bad = dict(GRADE_304, yield_strength_mpa="high")
        with pytest.raises(ValueError, match="yield_strength_mpa"):
            validate_grade(bad)

    def test_bool_rejected_as_numeric(self):
        # bool passes isinstance(int) — the density field must stay a real number
        bad = dict(GRADE_304, density_kg_m3=True)
        with pytest.raises(ValueError):
            validate_grade(bad)

    def test_required_keys_exist_in_dataset(self):
        """The committed grades.json must satisfy the engine schema."""
        import json
        from pathlib import Path

        data = json.loads((Path(__file__).parent.parent / "data" / "grades.json").read_text())
        assert len(data) == 17
        for g in data:
            validate_grade(g)
            assert all(key in g for key in REQUIRED_GRADE_KEYS)