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
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
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

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

app = FastAPI(
    title="GradeWise API",
    description="Stainless Steel Grade Recommendation & Physics Calculation Engine",
    version="1.0.0",
)

# Crucial for Render: Trust the X-Forwarded-For header so we don't rate limit the Render Load Balancer
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# Set up rate limiting
def get_real_ip(request: Request):
    # Fallback that explicitly checks headers if proxy middleware didn't catch it
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

limiter = Limiter(key_func=get_real_ip)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

# Open CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
    # Raw material properties — sent so the frontend JS engine can
    # recalculate physics live when sliders move (zero API round-trips)
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
    # Deterministic physics outputs (initial values for the submitted dimensions)
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
1. NEVER output a grade name directly! We use a deterministic character mapping system.
2. Select the matching grade by outputting its exact 5-string 'character_id' combination from the dataset.
3. The valid semantic strings are: ["STRENGTH", "CORROSION", "HEAT", "ECONOMY", "WELDING", "FORMING", "HARDNESS"].
4. You MUST completely ignore and NEVER output the following 4 unused combinations:
   - ["CORROSION", "HEAT", "ECONOMY", "FORMING", "HARDNESS"]
   - ["CORROSION", "HEAT", "WELDING", "FORMING", "HARDNESS"]
   - ["CORROSION", "ECONOMY", "WELDING", "FORMING", "HARDNESS"]
   - ["HEAT", "ECONOMY", "WELDING", "FORMING", "HARDNESS"]
5. Do NOT include any numbers in your ai_explanation — no MPa, no kg, no mm values.
6. Write ai_explanation for a non-engineer audience.
7. Cover the real trade-offs: what you gain AND what you give up with each grade.
8. You MUST output a JSON object with a single key "recommendations".
9. The value of "recommendations" must be an array of exactly 2 or 3 objects.
10. Each object must have exactly three keys: 
    - "character_id" (An array of exactly 5 uppercase strings representing the grade you chose)
    - "ai_explanation" (your plain English text on why it's chosen)
    - "trade_off_notes" (explicitly state what downside this choice has directly compared to the OTHER choices in this response).
11. CRITICAL: If the USER NEED is completely unrelated to steel, metal, materials, or structural engineering (e.g., asking about recipes, weather, politics, people), YOU MUST return an empty array for "recommendations" (i.e. {{"recommendations": []}}).

GRADES DATASET
--------------
{grades_json_str}
"""


# ---------------------------------------------------------------------------
# Helper: match AI-returned grade label to our dataset
# ---------------------------------------------------------------------------

def _find_grade_by_character_id(char_id: list) -> dict | None:
    """
    Look up a grade by its deterministic 5-string combination.
    Returns None if not found.
    """
    if not isinstance(char_id, list) or len(char_id) != 5:
        return None
        
    char_id_sorted = sorted([str(s).upper() for s in char_id])
    
    for grade in GRADES:
        g_char_id = grade.get("character_id")
        if isinstance(g_char_id, list) and sorted([str(s).upper() for s in g_char_id]) == char_id_sorted:
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
@limiter.limit("20/minute")
def recommend(request: Request, req: RecommendRequest):
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
            model="qwen/qwen3.8-27b",
            temperature=0.3,
            max_tokens=600,
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
            status_code=400,
            detail="OUT_OF_CONTEXT",
        )

    # Step 3 & 4: For each AI pick, look up real grade data and run physics
    recommendations: list[GradeRecommendation] = []

    for pick in ai_picks:
        char_id: list[str] = pick.get("character_id", [])
        ai_explanation: str = pick.get("ai_explanation", "").strip()
        trade_off_notes: str = pick.get("trade_off_notes", "").strip()

        # Look up grade via deterministic character_id
        grade_data = _find_grade_by_character_id(char_id)
        if grade_data is None:
            # The AI hallucinated a bad combination or returned a dead combo
            continue
            
        grade_label = grade_data["grade"]

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
                # Raw material properties for client-side live physics
                yield_strength_mpa=grade_data["yield_strength_mpa"],
                tensile_strength_mpa=grade_data["tensile_strength_mpa"],
                youngs_modulus_gpa=grade_data["youngs_modulus_gpa"],
                elongation_pct=grade_data.get("elongation_pct", 40),
                density_kg_m3=grade_data["density_kg_m3"],
                corrosion_resistance=grade_data["corrosion_resistance"],
                cost_tier=grade_data["cost_tier"],
                formability=grade_data["formability"],
                weldability=grade_data["weldability"],
                magnetic=grade_data["magnetic"],
                max_service_temp_c=grade_data["max_service_temp_c"],
                typical_applications=grade_data["typical_applications"],
                ai_explanation=ai_explanation,
                trade_off_notes=trade_off_notes,
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
