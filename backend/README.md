# GradeWise - Backend (FastAPI)

FastAPI backend service for GradeWise, providing AI-powered Jindal Stainless steel grade selection and deterministic physics-based load calculations.

## Folder Structure
```text
backend/
├── data/
│   └── grades.json          # Dataset of Jindal Stainless steel grades
├── engine/
│   ├── calculations.py      # Deterministic physics engine (round + square)
│   ├── cli.py               # Headless calculator CLI (engine.cli)
│   └── data/grades.json     # Packaged copy used by the installed CLI
├── main.py                  # FastAPI server entry point & API routes
├── convert_grades.py        # Excel datasheet → grades.json converter
├── requirements.txt         # Python dependencies
├── pyproject.toml           # Packaging (engine) + dev tooling config
├── .env.example             # Example environment variables
└── README.md                # Backend documentation
```

## Physics Engine

The engine (`engine/calculations.py`) is pure deterministic maths — no network,
no AI, no randomness. It computes the full tensile + bending profile for a solid
**round** (circular bar) or **square** bar of any grade:

- Tensile (hanging weight): cross-section area, yield load, elastic stretch
  (Hooke's Law), fracture load, total elongation at break.
- Bending (simply-supported beam, mid-span point load): second moment of area,
  section modulus, load at first yield, mid-span deflection.
- Rod self-mass from density.

Every function supports `shape="round"` (default) or `shape="square"`; for the
same dimension a square bar has a larger second moment of area and section
modulus than a round one, so it carries a higher bending load.

## Headless CLI (`gradewise-calc`)

Use the physics engine from the terminal — no server, no API key, fully offline:

```bash
# From the backend directory
python -m engine.cli --grade 304 --dimension 20 --length 1200
python -m engine.cli --grade "2205 (Duplex)" --shape square --dimension 32 --length 2000 --json
python -m engine.cli --list-grades

# Or install the package and use the console script from anywhere
pip install -e .
gradewise-calc --grade 316 --shape round --dimension 25 --length 1500
```

Flags: `--grade` (label as in grades.json), `--shape {round,square}`, `--dimension`
(alias `--diameter`), `--length`, `--json` (machine-readable output), `--list-grades`.

## Local Development

### 1. Create and Activate Virtual Environment
```bash
python -m venv venv
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Mac/Linux:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt        # runtime deps (Render uses this)
pip install -e ".[dev]"                 # + pytest, ruff, httpx for development
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:3000
```

> The server boots **without** `GEMINI_API_KEY` — `/` and `/health` stay up and
> `/recommend` returns a clean `503` until the key is configured. A missing key
> no longer crash-loops the whole service at startup.

### 4. Run the Development Server
```bash
uvicorn main:app --reload --port 8000
```
Interactive API documentation will be available at `http://localhost:8000/docs`.

## API

`POST /recommend` accepts `shape` plus `dimension_mm` (round: diameter, square:
side length). The legacy `diameter_mm` field is still accepted as an alias for
round rods, so older clients keep working:

```json
{
  "user_need": "steel rods for a garden gate hinge",
  "shape": "round",
  "dimension_mm": 20,
  "length_mm": 1200
}
```

Each recommendation includes the raw material properties (`yield_strength_mpa`,
`tensile_strength_mpa`, `youngs_modulus_gpa`, `elongation_pct`, `density_kg_m3`)
alongside deterministic `physics` numbers — the AI only produces grade labels
and plain-English text, never numbers.

## Tests

```bash
pytest tests/ -v
```

The suite is fully offline: Gemini is stubbed with a fake client, the physics
tests use hand-derived expected values, and the Excel converter is tested against
synthetic workbooks. All 82 tests pass with ruff clean (`ruff check .`).

## Deployment on Render
1. Connect your repository to [Render](https://render.com).
2. Set **Root Directory** to `backend`.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add `GEMINI_API_KEY` under Environment Variables.