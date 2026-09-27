# GradeWise ⚙️
**An AI-Powered Steel Grade Selection Platform**

*Developed as a project submission for a competition hosted by **Jindal Stainless**.*

![GradeWise Banner](https://img.shields.io/badge/Jindal_Stainless-Competition_Submission-0074D9?style=for-the-badge) 
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi)

## 📌 Overview

**GradeWise** bridges the gap between engineering requirements and materials science by allowing users to find the exact stainless steel grade they need using natural language. 

Instead of searching through static PDFs or filtering complex data tables, users simply describe their use case (e.g., *"I need maximum pitting resistance for a marine structural load"*). The AI backend processes the request against a curated metallurgical dataset of Jindal Stainless grades, applies real physics constraints, and returns highly tailored recommendations.

## ✨ Key Features

- **🧠 Natural Language Search Interface:** Powered by the Google Gemini API, it interprets complex engineering intent, structural parameters, and environmental constraints.
- **⚡ Real Physics Calculations:** The backend doesn't hallucinate numbers. It parses the intent, selects the best 3 grades from the database, and runs deterministic structural/physics calculations (loads, deflections, elongations) before returning results.
- **🎨 Luxury/Brutalist UI Design:** Designed using strict "UI/UX Pro Max" principles, featuring edge-to-edge typography, strict bento grids, and high-contrast styling.
- **🌌 3D Framer Motion Interactions:** Expanding accordion results cards, 3D tilt effects, dissolve-on-search animations, and morphing loading states.
- **📊 Interactive Spec & Comparison Sheets:** 
  - Dynamic comparison grids with engineered UI treatments.
  - Detailed grade specs covering mechanical properties, chemical composition, fabrication, and environmental ratings.

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion, Aceternity UI components
- **Typography:** Instrument Serif, Suisse Int'l, Monument Grotesk Mono

### Backend
- **Framework:** Python / FastAPI
- **AI Engine:** Google Gemini API (for NLP intent parsing)
- **Data Engine:** Deterministic physics calculator + `grades.json` dataset

## 📂 Repository Structure

```text
/
├── backend/
│   ├── main.py                # FastAPI endpoints (/health, /recommend)
│   ├── calculations.py        # Core physics & load calculation engine
│   └── data/
│       └── grades.json        # Curated Jindal Stainless steel grade database
│
├── frontend/
│   ├── src/app/               # Next.js App Router pages (Home, /compare, /specs)
│   ├── src/components/        # Reusable UI components (Accordion, VanishInput, etc.)
│   ├── src/lib/               # Frontend data mapping & utils
│   └── public/                # Static assets, fonts, and grade imagery
│
└── website_features.md        # Extended architectural mapping & documentation
```

## 🚀 Getting Started

### 1. Run the Backend
Requires Python 3.9+
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*(Ensure you have your `.env` file set up with a valid `GEMINI_API_KEY`)*

### 2. Run the Frontend
Requires Node.js 18+
```bash
cd frontend
npm install
npm run dev
```

The application will now be running on `http://localhost:3000`.

## 📜 Acknowledgements
This project was conceptualized and engineered for the **Jindal Stainless** competition. Special thanks to the organizers for providing a challenging and highly technical domain to innovate within!
