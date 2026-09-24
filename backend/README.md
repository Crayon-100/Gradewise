# GradeWise - Backend (FastAPI)

FastAPI backend service for GradeWise, providing AI-powered Jindal Stainless steel grade selection and deterministic physics-based load calculations.

## Folder Structure
```text
backend/
├── data/
│   └── grades.json          # Dataset of Jindal Stainless steel grades
├── main.py                  # FastAPI server entry point & API routes
├── requirements.txt         # Python dependencies
├── .env.example             # Example environment variables
└── README.md                # Backend documentation
```

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
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:3000
```

### 4. Run the Development Server
```bash
uvicorn main:app --reload --port 8000
```
Interactive API documentation will be available at `http://localhost:8000/docs`.

## Deployment on Render
1. Connect your repository to [Render](https://render.com).
2. Set **Root Directory** to `backend`.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add `GEMINI_API_KEY` under Environment Variables.
