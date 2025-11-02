
  # Candidate Experience Design

  This is a code bundle for Candidate Experience Design. The original project is available at https://www.figma.com/design/WCXHzo7Qscj1Q0PUMLjszj/Candidate-Experience-Design.

  ## Running the code

  - One command (frontend + backend): `npm start`
    - Starts FastAPI backend on http://localhost:8000 and Vite dev server on http://localhost:3000
    - The runner will install Node dev deps (if missing) and Python deps from `backend/requirements.txt` (if Python is available on PATH)

  - Alternatively, run separately:
    - Frontend: `npm i` then `npm run dev`
    - Backend: `pip install -r backend/requirements.txt` then `uvicorn backend.main:app --reload --port 8000`
  
