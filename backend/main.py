import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="GradeWise API",
    description="Stainless Steel Grade Recommendation & Physics Calculation Engine",
    version="1.0.0"
)

# CORS configuration: Allow local development frontend and deployed Vercel frontend
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

frontend_env = os.getenv("FRONTEND_URL")
if frontend_env:
    allowed_origins.append(frontend_env)

# For development flexibility, allow wildcard or configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if frontend_env else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "healthy",
        "service": "GradeWise API",
        "version": "1.0.0",
        "message": "Welcome to GradeWise backend service."
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
