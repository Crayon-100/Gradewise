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
"""

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

from engine.calculations import calc_rod_properties

# ---------------------------------------------------------------------------
# Boot-up: load .env, validate API key, read grades once from disk
# ---------------------------------------------------------------------------

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is not set. Add it to your .env file or Render environment."
    )

# Resolve grades.json relative to this file so it works from any cwd
_GRADES_PATH = Path(__file__).parent / "data" / "grades.json"
if not _GRADES_PATH.exists():
    raise RuntimeError(f"grades.json not found at {_GRADES_PATH}")

with open(_GRADES_PATH, "r", encoding="utf-8") as _f:
    GRADES: list[dict] = json.load(_f)

# Build a lookup dict for O(1) access: grade label → grade object
# e.g. "316" → {...}, "2205 (Duplex)" → {...}
GRADES_BY_LABEL: dict[str, dict] = {g["grade"]: g for g in GRADES}

# Initialise Groq client
_groq_client = Groq(api_key=GROQ_API_KEY)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="GradeWise API",
    description="Stainless Steel Grade Recommendation & Physics Calculation Engine",
    version="1.0.0",
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
    diameter_mm: float = Field(
        default=20.0,
        description="Rod outer diameter in millimetres.",
        ge=1.0,
        le=200.0,
    )
    length_mm: float = Field(
        default=1200.0,
        description="Rod or beam span in millimetres.",
        ge=50.0,
        le=10_000.0,
    )


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
    diameter_mm: float
    length_mm: float
    recommendations: list[GradeRecommendation]


# ---------------------------------------------------------------------------


def _build_prompt(user_need: str, diameter_mm: float, length_mm: float) -> str:
    """
    Build the Groq prompt. Embedding the full grades.json ensures the model
    reasons only from real data and cannot hallucinate grades or properties.
    """
    grades_json_str = json.dumps(GRADES, indent=2)

    return f"""You are a stainless steel grade selection assistant for GradeWise.

TASK
----
A user needs help choosing a Jindal Stainless steel grade for their application.
Shortlist exactly 2 or 3 candidate grades from the dataset below that best match
the user's stated need.

USER NEED
---------
"{user_need}"

ROD DIMENSIONS (for context only — do NOT calculate any numbers yourself)
-----------------------------------
Diameter: {diameter_mm} mm
Length:   {length_mm} mm

RULES (strictly enforced)
--------------------------
1. Only recommend grades that appear in the dataset below — never invent grades.
2. Do NOT include any numbers in your ai_explanation — no MPa, no kg, no mm values.
3. Write ai_explanation for a non-engineer audience.
4. Cover the real trade-offs: what you gain AND what you give up with each grade.
5. You MUST output a JSON object with a single key "recommendations".
6. The value of "recommendations" must be an array of exactly 2 or 3 objects.
7. Each object must have exactly two keys: "grade" (the exact label from the dataset) and "ai_explanation" (your plain English text).

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
        "version": "1.0.0",
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

    # Ask Groq to shortlist grades (text only, no numbers)
    prompt = _build_prompt(req.user_need, req.diameter_mm, req.length_mm)

    try:
        chat_completion = _groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        ai_text = chat_completion.choices[0].message.content
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Groq API call failed: {exc}",
        )

    # Parse the structured JSON the model returned
    try:
        parsed_json = json.loads(ai_text)
        ai_picks: list[dict] = parsed_json.get("recommendations", [])
    except (json.JSONDecodeError, AttributeError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Groq returned unparseable JSON: {exc}. Raw: {ai_text}",
        )

    if not isinstance(ai_picks, list) or not ai_picks:
        raise HTTPException(
            status_code=502,
            detail="Groq returned an empty shortlist.",
        )

    # Step 3 & 4: For each AI pick, look up real grade data and run physics
    recommendations: list[GradeRecommendation] = []

    for pick in ai_picks:
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
            diameter_mm=req.diameter_mm,
            length_mm=req.length_mm,
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
        diameter_mm=req.diameter_mm,
        length_mm=req.length_mm,
        recommendations=recommendations,
    )
