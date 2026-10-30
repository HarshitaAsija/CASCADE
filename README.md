# CASCADE

CASCADE is a what-if simulator for cascading urban infrastructure failure. The hackathon demo focuses on a Yamuna flood in one New Delhi study area. Deterministic Python and NetworkX will calculate impacts; AI agents will explain results and propose interventions.

This scaffold includes a FastAPI health endpoint, simulated Delhi API fixtures, generated TypeScript contracts, and a full-screen MapLibre map centred on New Delhi. No real flood model, verified Delhi datasets, or AI integration is implemented yet.

## Backend quickstart

Use Python 3.11. From the repository root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
cd backend
python -m pip install -r requirements.txt
python -m pytest
python -m uvicorn app.main:app --reload
```

Health: http://127.0.0.1:8000/health. Interactive API docs: http://127.0.0.1:8000/docs.

If the Windows sandbox blocks the reload subprocess with a named-pipe `WinError 2`, run `python -m uvicorn app.main:app` without `--reload`, or retry the reload command in your normal terminal.

## Frontend quickstart

Use Node.js 22.12 or later. In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The map uses key-free OpenStreetMap raster tiles, which require internet access. Scenario overlays fall back to bundled samples when the API is unavailable. Set `VITE_API_BASE` in `frontend/.env` to override the default `http://localhost:8000`. See `frontend/README.md` for details. Map coordinates use longitude then latitude: `[77.23, 28.63]`.

```powershell
npm run build
```

Copy `.env.example` to `.env` when needed. The scaffold does not call OpenAI or consume the agent/demo flags yet.

## Folder map

```text
AGENTS.md                   Contributor rules
backend/
  app/main.py               FastAPI routes and CORS
  app/schemas.py            All API contracts
  app/graph/                Future deterministic NetworkX logic
  app/agents/               Future explanation and planning agents
  tests/                    Health and API contract tests
  requirements.txt
frontend/                   Vite, React, strict TypeScript and MapLibre
data/                       Cached inputs and sample simulation response
scripts/                    Reserved for data preparation scripts
docs/                       Reserved for project documentation
.env.example
```

## Fixture API contracts

- `POST /simulate`: body is `FloodScenario`; returns `SimulationResult`.
- `POST /intervene`: body is `{scenario, interventions}`; returns `ComparisonResult` with a baseline, the sample intervention list, and `results` keyed by intervention ID.
- `POST /analyze`: body is `{scenario}`; returns `AgentAnalysis`.
- `GET /compare`: compatibility alias returning the same sample comparison.
- `GET /facilities`: returns a list of `Facility`.
- `GET /graph/geojson`: returns a typed GeoJSON FeatureCollection.

Example simulation request: `{"severity":"high"}`. Intervene example: `{"scenario":{"severity":"high"},"interventions":[]}`. Analyze example: `{"scenario":{"severity":"high"}}`.

These routes return fixed simulated fixtures regardless of scenario or intervention. Comparison improvements are hand-authored UI examples, not measured benefits. The sample timeline is illustrative. Null response-time metrics mean unavailable, not zero. Record-level provenance applies to every field in that record and defaults to `simulated` when omitted; parameter dictionaries retain their own provenance entry. Every facility record, including those named LNJP Hospital and GTB Hospital, contains simulated coordinates, capacity, backup details, and node IDs. These records do not describe verified hospital conditions.

Frontend fixtures are in `data/sample_simulation.json`, `data/sample_comparison.json`, and `data/sample_agents.json`. Facilities are in `data/facilities.json`.

`frontend/src/types.ts` is generated from `backend/app/schemas.py`. After an authorized schema change, regenerate it from the repository root:

```powershell
.\.venv\Scripts\python.exe scripts/generate_types.py
```

Tests check that generated TypeScript stays current. TypeScript models describe serialized responses; request provenance may be omitted and defaults to `simulated`.

Schema changes require explicit user instruction. CORS permits `http://localhost:5173`.
