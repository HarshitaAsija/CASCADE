# CASCADE

What-if simulator for cascading urban infrastructure failure. Demo: Yamuna flood in a New Delhi study area.

## Hard rules
- Simulation logic is deterministic Python (NetworkX). LLMs NEVER compute metrics; they call API tools and explain/plan from results.
- Every input value has a `provenance` field: "real" | "estimated" | "simulated". Never drop it.
- All API request/response shapes are Pydantic models in backend/app/schemas.py. Do not change them without being told.
- Every backend function gets a pytest test. Run `pytest` before finishing.
- Keep it small: one study area, one flood scenario. No new frameworks, no Neo4j, no auth.

## Layout
- backend/app/ : FastAPI app (main.py, schemas.py, graph/, agents/)
- backend/tests/
- frontend/ : React + Vite + MapLibre
- data/ : cached graph (graphml), facilities.json, dependencies.json, flood_zones.geojson

## Commands
- Backend: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
- Tests: `cd backend && pytest`
- Frontend: `cd frontend && npm install && npm run dev`

## Style
Python 3.11, type hints, small pure functions. TypeScript strict in frontend. Short comments explaining WHY.
