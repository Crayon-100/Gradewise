"""
API tests for main.py — fully offline. Gemini is replaced with a fake client
via monkeypatch (the real client is only ever constructed when GEMINI_API_KEY
is set). No network calls, no API key needed.
"""

import json

import pytest
from fastapi.testclient import TestClient

import main as main_module
from main import GRADES, app, _find_grade


# ---------------------------------------------------------------------------
# Fake Gemini plumbing
# ---------------------------------------------------------------------------

class FakeText:
    def __init__(self, text):
        self.text = text


class FakeModels:
    def __init__(self, responder):
        self._responder = responder

    def generate_content(self, **kwargs):
        return self._responder(kwargs)


class FakeClient:
    """Quacks like google.genai.Client — only .models.generate_content is used."""

    def __init__(self, responder):
        self.models = FakeModels(responder)


def _ok_picks(**overrides):
    """Default responder: two well-formed picks (304 + 2205 Duplex)."""

    def responder(kwargs):
        picks = overrides.get("picks", [
            {"grade": "304", "ai_explanation": "Good all-round value for a gate."},
            {"grade": "2205 (Duplex)", "ai_explanation": "Much stronger, pricier."},
        ])
        if "raise_exc" in overrides:
            raise overrides["raise_exc"]
        return FakeText(json.dumps(picks))

    return responder


@pytest.fixture
def fake_gemini(monkeypatch):
    def install(responder=None):
        monkeypatch.setattr(main_module, "_gemini_client", FakeClient(responder or _ok_picks()))
        return main_module._gemini_client

    return install


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# Grade lookup
# ---------------------------------------------------------------------------

class TestFindGrade:
    def test_exact_match(self):
        g = _find_grade("304")
        assert g is not None and g["grade"] == "304"

    def test_case_insensitive(self):
        g = _find_grade(" 2205 (duplex) ".strip())
        assert g is not None and g["grade"] == "2205 (Duplex)"

    def test_normalised_match(self):
        # spaces / brackets / dashes stripped
        assert _find_grade("2205(Duplex)") is not None
        assert _find_grade("2205 - Duplex") is not None

    def test_unknown_returns_none(self):
        assert _find_grade("Titanium-9000") is None
        assert _find_grade("") is None

    def test_all_dataset_labels_resolve(self):
        assert len(GRADES) == 17
        for g in GRADES:
            assert _find_grade(g["grade"]) is g


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class TestRequestSchema:
    def test_diameter_mm_legacy_alias_passes_schema(self, client, monkeypatch):
        # The currently-deployed frontend still sends diameter_mm — the schema
        # must accept it (no fake Gemini here: reaching the handler proves the
        # alias validated; the handler then 503s because no key is configured).
        monkeypatch.setattr(main_module, "_gemini_client", None)
        payload = {"user_need": "garden gate hinge", "diameter_mm": 20.0, "length_mm": 1200.0}
        r = client.post("/recommend", json=payload)
        assert r.status_code == 503
        assert "GEMINI_API_KEY" in r.json()["detail"]

    def test_neither_dimension_rejected(self, client, fake_gemini):
        fake_gemini()
        r = client.post("/recommend", json={"user_need": "garden gate hinge", "length_mm": 1000.0})
        assert r.status_code == 422

    def test_both_dimensions_rejected(self, client, fake_gemini):
        fake_gemini()
        r = client.post("/recommend", json={
            "user_need": "garden gate hinge",
            "dimension_mm": 20.0,
            "diameter_mm": 20.0,
            "length_mm": 1000.0,
        })
        assert r.status_code == 422

    def test_short_user_need_rejected(self, client, fake_gemini):
        fake_gemini()
        r = client.post("/recommend", json={"user_need": "gate", "dimension_mm": 20.0})
        assert r.status_code == 422

    def test_bad_shape_rejected(self, client, fake_gemini):
        fake_gemini()
        r = client.post("/recommend", json={
            "user_need": "garden gate hinge",
            "shape": "hexagonal",
            "dimension_mm": 20.0,
        })
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Endpoint behaviour
# ---------------------------------------------------------------------------

class TestEndpoints:
    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}

    def test_root(self, client):
        r = client.get("/")
        assert r.status_code == 200
        assert r.json()["service"] == "GradeWise API"

    def test_missing_key_returns_503(self, client, monkeypatch):
        monkeypatch.setattr(main_module, "_gemini_client", None)
        r = client.post("/recommend", json={
            "user_need": "garden gate hinge",
            "dimension_mm": 20.0,
        })
        assert r.status_code == 503
        assert "GEMINI_API_KEY" in r.json()["detail"]

    def test_happy_path_round(self, client, fake_gemini):
        fake_gemini()
        r = client.post("/recommend", json={
            "user_need": "garden gate hinge",
            "shape": "round",
            "dimension_mm": 20.0,
            "length_mm": 1200.0,
        })
        assert r.status_code == 200
        body = r.json()
        assert body["shape"] == "round"
        assert body["dimension_mm"] == 20.0
        assert body["diameter_mm"] == 20.0  # legacy mirror
        assert len(body["recommendations"]) == 2
        rec = body["recommendations"][0]
        # Raw material properties present for client-side physics
        for key in ("yield_strength_mpa", "tensile_strength_mpa",
                    "youngs_modulus_gpa", "elongation_pct", "density_kg_m3"):
            assert isinstance(rec[key], (int, float))
        # Deterministic physics: round 20 mm 304 → area π·100
        assert rec["physics"]["cross_section_area_mm2"] == 314.1593
        assert rec["physics"]["rod_mass_kg"] == 3.016

    def test_happy_path_square(self, client, fake_gemini):
        fake_gemini()
        r = client.post("/recommend", json={
            "user_need": "gate rail for a deck",
            "shape": "square",
            "dimension_mm": 32.0,
            "length_mm": 2000.0,
        })
        assert r.status_code == 200
        body = r.json()
        assert body["shape"] == "square"
        recs = {rec["grade"]: rec for rec in body["recommendations"]}
        assert "304" in recs
        assert recs["304"]["physics"]["cross_section_area_mm2"] == 1024.0  # 32²
        # square is stiffer than round at equal dimension → higher bending load
        # (engine rounds I to 4 decimals: 32⁴/12 = 87381.3333…)
        assert recs["304"]["physics"]["second_moment_mm4"] == pytest.approx(32 ** 4 / 12.0, abs=0.0001)

    def test_legacy_diameter_alias_flows(self, client, fake_gemini):
        fake_gemini()
        r = client.post("/recommend", json={
            "user_need": "garden gate hinge",
            "diameter_mm": 20.0,
            "length_mm": 1200.0,
        })
        assert r.status_code == 200
        assert r.json()["dimension_mm"] == 20.0
        assert r.json()["shape"] == "round"

    def test_unknown_grade_pick_skipped(self, client, fake_gemini):
        fake_gemini(_ok_picks(picks=[
            {"grade": "Titanium-9000", "ai_explanation": "not real"},
            {"grade": "316", "ai_explanation": "marine grade"},
        ]))
        r = client.post("/recommend", json={
            "user_need": "coastal railing",
            "dimension_mm": 25.0,
        })
        assert r.status_code == 200
        assert [rec["grade"] for rec in r.json()["recommendations"]] == ["316"]

    def test_malformed_picks_skipped(self, client, fake_gemini):
        fake_gemini(_ok_picks(picks=[
            "not-a-dict",                    # schema-violating pick
            None,                            # ditto
            {"grade": "409", "ai_explanation": "budget exhaust"},
            {"ai_explanation": "no grade field"},
        ]))
        r = client.post("/recommend", json={
            "user_need": "exhaust support rods",
            "dimension_mm": 12.0,
        })
        assert r.status_code == 200
        assert [rec["grade"] for rec in r.json()["recommendations"]] == ["409"]

    def test_all_unknown_grades_422(self, client, fake_gemini):
        fake_gemini(_ok_picks(picks=[
            {"grade": "Titanium-9000", "ai_explanation": "nope"},
            {"grade": "Unobtainium", "ai_explanation": "nope"},
        ]))
        r = client.post("/recommend", json={"user_need": "garden gate hinge", "dimension_mm": 20.0})
        assert r.status_code == 422

    def test_gemini_failure_502(self, client, fake_gemini):
        fake_gemini(_ok_picks(raise_exc=RuntimeError("rate limited")))
        r = client.post("/recommend", json={"user_need": "garden gate hinge", "dimension_mm": 20.0})
        assert r.status_code == 502
        assert "rate limited" in r.json()["detail"]

    def test_gemini_unparseable_json_502(self, client, fake_gemini):
        def responder(kwargs):
            return FakeText("definitely not json {{{")
        fake_gemini(responder)
        r = client.post("/recommend", json={"user_need": "garden gate hinge", "dimension_mm": 20.0})
        assert r.status_code == 502

    def test_gemini_empty_shortlist_502(self, client, fake_gemini):
        fake_gemini(_ok_picks(picks=[]))
        r = client.post("/recommend", json={"user_need": "garden gate hinge", "dimension_mm": 20.0})
        assert r.status_code == 502

    def test_prompt_embeds_shape_and_dimension(self, client, fake_gemini):
        captured = {}
        def responder(kwargs):
            captured["contents"] = kwargs["contents"]
            return FakeText(json.dumps([{"grade": "304", "ai_explanation": "ok"}]))

        fake_gemini(responder)
        client.post("/recommend", json={
            "user_need": "garden gate hinge",
            "shape": "square",
            "dimension_mm": 32.0,
            "length_mm": 2000.0,
        })
        prompt = captured["contents"]
        assert "Shape:    square" in prompt
        assert "Dimension:32.0 mm" in prompt
        assert "Length:   2000.0 mm" in prompt
        # the full dataset must be embedded so the model cannot invent grades
        assert '"grade": "304"' in prompt

    def test_model_name_is_36_flash(self, client, fake_gemini):
        captured = {}
        def responder(kwargs):
            captured["model"] = kwargs["model"]
            return FakeText(json.dumps([{"grade": "304", "ai_explanation": "ok"}]))

        fake_gemini(responder)
        client.post("/recommend", json={"user_need": "garden gate hinge", "dimension_mm": 20.0})
        assert captured["model"] == "gemini-3.6-flash"