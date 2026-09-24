"""
GradeWise API — FastAPI Backend
================================
Two endpoints:
  GET  /health       → liveness check, always returns {"status": "ok"}
  POST /recommend    → AI grade shortlist + real physics calculations

IMPORTANT: The Gemini model is only used to READ grades.json and decide
which 2-3 grades to recommend and what plain-English trade-off text to
show. It never invents property numbers. All numerical outputs
(loads, deflections, elongations) come exclusively from calculations.py.

The service boots WITHOUT a GEMINI_API_KEY — /health and / stay up, and
/recommend returns a clean 503 until the key is configured. This keeps a
misconfigured deploy from crash-looping on startup.
"""

import json
import os
import re
import time
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from google.genai.errors import APIError
from pydantic import BaseModel, Field, model_validator

from engine.calculations import calc_rod_properties

# ---------------------------------------------------------------------------
# Boot-up: load .env, read grades once from disk
# ---------------------------------------------------------------------------

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Resolve grades.json relative to this file so it works from any cwd
_GRADES_PATH = Path(__file__).parent / "data" / "grades.json"
if not _GRADES_PATH.exists():
    raise RuntimeError(f"grades.json not found at {_GRADES_PATH}")

with open(_GRADES_PATH, "r", encoding="utf-8") as _f:
    GRADES: list[dict] = json.load(_f)

# Build a lookup dict for O(1) access: grade label → grade object
# e.g. "316" → {...}, "2205 (Duplex)" → {...}
GRADES_BY_LABEL: dict[str, dict] = {g["grade"]: g for g in GRADES}

# Gemini client is created lazily. Uses GEMINI_API_KEY automatically from env.
# If the key is missing the app still boots; /recommend returns 503 instead
# of the whole process dying at import time (which crash-looped deploys).
_gemini_client: "genai.Client | None" = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="GradeWise API",
    description="Stainless Steel Grade Recommendation & Physics Calculation Engine",
    version="1.1.0",
)

# ---------------------------------------------------------------------------
# CORS — Cross-Origin Resource Sharing
#
# TEMPORARY: allow_origins=["*"] lets any domain call this API during
# development and the Stainless Spark live demo. This is fine while the
# backend has no user data or authentication.
#
# TODO (before final hardened deployment): replace ["*"] with the explicit
# list below once the Vercel domain is known:
#
#   _cors_origins = [
#       "https://gradewise.vercel.app",   # real Vercel URL goes here
#       "http://localhost:3000",
#   ]
#
# Note: allow_credentials=True cannot be combined with allow_origins=["*"]
# per the CORS spec — browsers will reject it. We set it False for the
# wildcard case and only enable it when a specific origin list is active.
# ---------------------------------------------------------------------------

_frontend_url = os.getenv("FRONTEND_URL")  # set this in Render environment vars

if _frontend_url:
    # Restricted mode: only allow the configured frontend domain + local dev
    _cors_origins = [
        _frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    _cors_credentials = True
else:
    # TEMPORARY — allow all origins for local development and live demo
    _cors_origins = ["*"]
    _cors_credentials = False  # must be False when allow_origins=["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class RecommendRequest(BaseModel):
    user_need: str = Field(
        ...,
        description="Plain-English description of what the user needs the steel for.",
        examples=["steel rods for a garden gate hinge"],
        min_length=5,
        max_length=500,
    )
    shape: Literal["round", "square"] = Field(
        default="round",
        description="Cross-section shape of the rod: 'round' (solid circular bar) or 'square' (solid square bar).",
    )
    dimension_mm: float | None = Field(
        default=None,
        description="Rod dimension: outer diameter (round) or side length (square) in millimetres.",
        ge=1.0,
        le=200.0,
    )
    diameter_mm: float | None = Field(
        default=None,
        description="Legacy alias for dimension_mm (round rods) kept for older clients. Use dimension_mm instead.",
        ge=1.0,
        le=200.0,
    )
    length_mm: float = Field(
        default=1200.0,
        description="Rod or beam span in millimetres.",
        ge=50.0,
        le=10_000.0,
    )

    @model_validator(mode="after")
    def _resolve_dimension(self) -> "RecommendRequest":
        if self.dimension_mm is None and self.diameter_mm is None:
            raise ValueError("dimension_mm (or legacy diameter_mm) is required")
        if self.dimension_mm is not None and self.diameter_mm is not None:
            raise ValueError("provide either dimension_mm or diameter_mm, not both")
        if self.dimension_mm is None:
            object.__setattr__(self, "dimension_mm", self.diameter_mm)
        return self


class PhysicsNumbers(BaseModel):
    """All numbers come from calculations.py — the AI never produces these."""
    # Tensile (hanging-weight) stages
    cross_section_area_mm2: float
    yield_load_n: float
    yield_load_kg: float
    elastic_stretch_mm: float
    fracture_load_n: float
    fracture_load_kg: float
    total_elongation_mm: float
    # Bending (see-saw) results
    second_moment_mm4: float
    section_modulus_mm3: float
    bending_yield_load_n: float
    bending_yield_load_kg: float
    deflection_at_yield_mm: float
    # Rod self-mass
    rod_mass_kg: float


class GradeRecommendation(BaseModel):
    grade: str
    uns_no: str
    series: str
    type: str
    # Raw material properties (from grades.json — used by the frontend
    # for client-side physics recalculation when sliders move)
    yield_strength_mpa: float
    tensile_strength_mpa: float
    youngs_modulus_gpa: float
    elongation_pct: float
    density_kg_m3: float
    # General metrics
    corrosion_resistance: int
    cost_tier: int
    formability: int
    weldability: str
    magnetic: str
    max_service_temp_c: int
    typical_applications: str
    # AI-generated text (plain English only — no numbers)
    ai_explanation: str
    trade_off_notes: str
    # Deterministic physics outputs
    physics: PhysicsNumbers


class RecommendResponse(BaseModel):
    user_need: str
    shape: Literal["round", "square"]
    dimension_mm: float
    diameter_mm: float  # legacy mirror of dimension_mm, kept for older clients
    length_mm: float
    recommendations: list[GradeRecommendation]


# ---------------------------------------------------------------------------
# Gemini structured output schema for the AI shortlist step
# ---------------------------------------------------------------------------

# This schema tells Gemini exactly what JSON to return.
# Critically: it only asks for grade labels and text — no numbers.
_GEMINI_RESPONSE_SCHEMA = {
    "type": "ARRAY",
    "minItems": 2,
    "maxItems": 3,
    "items": {
        "type": "OBJECT",
        "required": ["grade", "ai_explanation"],
        "properties": {
            "grade": {
                "type": "STRING",
                "description": (
                    "Exact grade label as it appears in the grades dataset, "
                    "e.g. '316' or '2205 (Duplex)'."
                ),
            },
            "ai_explanation": {
                "type": "STRING",
                "description": (
                    "2-4 sentences in plain English explaining WHY this grade "
                    "suits the user's need and what the key trade-offs are. "
                    "Do NOT include any numbers — the application will add "
                    "calculated values separately."
                ),
            },
        },
    },
}


def _build_prompt(user_need: str, shape: str, dimension_mm: float, length_mm: float) -> str:
    """
    Build the Gemini prompt. Embedding the full grades.json ensures the model
    reasons only from real data and cannot hallucinate grades or properties.
    """
    grades_json_str = json.dumps(GRADES, indent=2)

    return f"""You are a stainless steel grade selection assistant for GradeWise.

TASK
----
A user needs help choosing a Jindal Stainless steel grade for their application.
Shortlist exactly 2 or 3 candidate grades from the dataset below that best match
the user's stated need. Explain in plain English why each grade is a good fit and
what they give up by choosing it.

USER NEED
---------
"{user_need}"

ROD DIMENSIONS (for context only — do NOT calculate any numbers yourself)
-----------------------------------
Shape:    {shape}
Dimension:{dimension_mm} mm
Length:   {length_mm} mm

RULES (strictly enforced)
--------------------------
1. Only recommend grades that appear in the dataset below — never invent grades.
2. Do NOT include any numbers in your ai_explanation — no MPa, no kg, no mm values.
   The application will attach all physics numbers separately from its own engine.
3. Write ai_explanation for a non-engineer audience (fabricator, buyer, first-timer).
4. Cover the real trade-offs: what you gain AND what you give up with each grade.
5. Return between 2 and 3 grades — not more, not fewer.

GRADES DATASET
--------------
{grades_json_str}
"""


# ---------------------------------------------------------------------------
# Helper: match AI-returned grade label to our dataset
# ---------------------------------------------------------------------------

def _find_grade(label: str) -> dict | None:
    """
    Look up a grade by its label. Try exact match first, then case-insensitive,
    then a normalised partial match (handles slight whitespace differences).
    Returns None if not found.
    """
    # 1. Exact match
    if label in GRADES_BY_LABEL:
        return GRADES_BY_LABEL[label]

    # 2. Case-insensitive match
    label_lower = label.strip().lower()
    for key, grade in GRADES_BY_LABEL.items():
        if key.lower() == label_lower:
            return grade

    # 3. Normalised match — strip spaces & brackets for robustness
    def _normalise(s: str) -> str:
        return re.sub(r"[\s()\-]", "", s).lower()

    label_norm = _normalise(label)
    for key, grade in GRADES_BY_LABEL.items():
        if _normalise(key) == label_norm:
            return grade

    return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "healthy",
        "service": "GradeWise API",
        "version": "1.1.0",
    }


@app.get("/health")
def health_check():
    """Liveness probe — Render and the frontend poll this to confirm the service is up."""
    return {"status": "ok"}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    """
    Main recommendation endpoint.

    Flow:
      1. Build a prompt embedding grades.json and the user's need.
      2. Call Gemini with a strict JSON schema — it returns grade labels + plain text.
      3. For each shortlisted grade, look it up in grades.json (never use AI numbers).
      4. Run calc_rod_properties() to get real bending + tensile physics numbers.
      5. Assemble and return the combined JSON response.
    """

    # Step 0: /recommend is the only endpoint that needs Gemini — fail cleanly
    # if the key was never configured instead of crash-looping the whole app.
    if _gemini_client is None:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server. "
                   "Set it in the environment and restart to enable recommendations.",
        )

    # The model validator resolves dimension_mm from the legacy diameter_mm
    # alias when needed; this guard keeps the type narrow and the invariant
    # explicit (unreachable in practice — 422 otherwise).
    dimension_mm: float = req.dimension_mm  # type: ignore[assignment]
    if dimension_mm is None:
        raise HTTPException(
            status_code=422,
            detail="A rod dimension is required: send dimension_mm (or legacy diameter_mm).",
        )

    # Step 1 & 2: Ask Gemini to shortlist grades (text only, no numbers)
    prompt = _build_prompt(req.user_need, req.shape, dimension_mm, req.length_mm)

    # Google's servers for 3.6-flash occasionally throw 503 High Demand errors
    # on the free tier — retry up to 3 times with a short delay.
    max_retries = 3
    ai_response = None

    for attempt in range(max_retries):
        try:
            ai_response = _gemini_client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_json_schema=_GEMINI_RESPONSE_SCHEMA,
                    temperature=0.3,   # lower temp = more consistent grade selection
                    max_output_tokens=1024,
                ),
            )
            break  # Success! Exit the retry loop
        except APIError as exc:
            if attempt < max_retries - 1:
                time.sleep(2)  # Wait 2 seconds before retrying
                continue
            raise HTTPException(
                status_code=502,
                detail=f"Gemini API call failed after {max_retries} attempts: {exc}",
            ) from None
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Gemini API call failed: {exc}",
            ) from None

    assert ai_response is not None  # loop raised on every attempt otherwise

    # Parse the structured JSON the model returned
    try:
        ai_picks: list[dict] = json.loads(ai_response.text)
    except (json.JSONDecodeError, AttributeError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini returned unparseable JSON: {exc}. Raw: {getattr(ai_response, 'text', '—')}",
        ) from None

    if not isinstance(ai_picks, list) or not ai_picks:
        raise HTTPException(
            status_code=502,
            detail="Gemini returned an empty shortlist.",
        )

    # Step 3 & 4: For each AI pick, look up real grade data and run physics
    recommendations: list[GradeRecommendation] = []

    for pick in ai_picks:
        # A schema-violating pick (non-dict / None) must be skipped, not 500.
        if not isinstance(pick, dict):
            continue

        grade_label: str = pick.get("grade", "").strip()
        ai_explanation: str = pick.get("ai_explanation", "").strip()

        # Look up grade in our dataset (AI cannot fabricate this)
        grade_data = _find_grade(grade_label)
        if grade_data is None:
            # Skip unknown grades rather than crashing — shouldn't happen with
            # the strict prompt, but defensive code matters for a live demo
            continue

        # Run the deterministic physics engine — AI never touches these numbers
        rod = calc_rod_properties(
            grade_data=grade_data,
            dimension_mm=dimension_mm,
            length_mm=req.length_mm,
            shape=req.shape,
        )

        physics = PhysicsNumbers(
            # Tensile
            cross_section_area_mm2=rod.tensile.cross_section_area_mm2,
            yield_load_n=rod.tensile.yield_load_n,
            yield_load_kg=rod.tensile.yield_load_kg,
            elastic_stretch_mm=rod.tensile.elastic_stretch_mm,
            fracture_load_n=rod.tensile.fracture_load_n,
            fracture_load_kg=rod.tensile.fracture_load_kg,
            total_elongation_mm=rod.tensile.total_elongation_mm,
            # Bending
            second_moment_mm4=rod.bending.second_moment_mm4,
            section_modulus_mm3=rod.bending.section_modulus_mm3,
            bending_yield_load_n=rod.bending.max_mid_load_n,
            bending_yield_load_kg=rod.bending.max_mid_load_kg,
            deflection_at_yield_mm=rod.bending.deflection_at_yield_mm,
            # Rod mass
            rod_mass_kg=rod.mass_kg,
        )

        recommendations.append(
            GradeRecommendation(
                grade=grade_data["grade"],
                uns_no=grade_data["uns_no"],
                series=grade_data["series"],
                type=grade_data["type"],
                # Raw material properties for client-side physics
                yield_strength_mpa=grade_data["yield_strength_mpa"],
                tensile_strength_mpa=grade_data["tensile_strength_mpa"],
                youngs_modulus_gpa=grade_data["youngs_modulus_gpa"],
                elongation_pct=grade_data["elongation_pct"],
                density_kg_m3=grade_data["density_kg_m3"],
                corrosion_resistance=grade_data["corrosion_resistance"],
                cost_tier=grade_data["cost_tier"],
                formability=grade_data["formability"],
                weldability=grade_data["weldability"],
                magnetic=grade_data["magnetic"],
                max_service_temp_c=grade_data["max_service_temp_c"],
                typical_applications=grade_data["typical_applications"],
                ai_explanation=ai_explanation,
                trade_off_notes=grade_data["trade_off_notes"],  # from JSON, not AI
                physics=physics,
            )
        )

    if not recommendations:
        raise HTTPException(
            status_code=422,
            detail=(
                "No valid grades could be matched from the AI shortlist. "
                "The model may have returned unrecognised grade labels."
            ),
        )

    return RecommendResponse(
        user_need=req.user_need,
        shape=req.shape,
        dimension_mm=dimension_mm,
        diameter_mm=dimension_mm,  # legacy mirror
        length_mm=req.length_mm,
        recommendations=recommendations,
    )