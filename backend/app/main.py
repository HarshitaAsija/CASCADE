"""Fixed simulated fixtures for integration, not real disaster analysis."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import TypeAdapter

from app.schemas import (
    AgentAnalysis, AnalyzeRequest, ComparisonResult, Facility, FloodScenario,
    GraphGeoJSON, HealthResponse, InterveneRequest, SimulationResult,
)

app = FastAPI(title='CASCADE', version='0.2.0',
              description='Simulated Delhi placeholders. No graph engine or LLM is called.')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173'],
                   allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])

DATA_DIR = Path(__file__).resolve().parents[2] / 'data'
SIMULATION = SimulationResult.model_validate_json(
    (DATA_DIR / 'sample_simulation.json').read_text(encoding='utf-8'))
COMPARISON = ComparisonResult.model_validate_json(
    (DATA_DIR / 'sample_comparison.json').read_text(encoding='utf-8'))
ANALYSIS = AgentAnalysis.model_validate_json(
    (DATA_DIR / 'sample_agents.json').read_text(encoding='utf-8'))
FACILITIES = TypeAdapter(list[Facility]).validate_json(
    (DATA_DIR / 'facilities.json').read_text(encoding='utf-8'))


@app.get('/health', response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status='ok')


@app.post('/simulate', response_model=SimulationResult,
          summary='Fixed high-flood fixture; requested severity does not alter results')
def simulate(scenario: FloodScenario) -> SimulationResult:
    return SIMULATION.model_copy(deep=True)


@app.post('/intervene', response_model=ComparisonResult,
          summary='Fixed demo comparison; requested interventions are not executed')
def intervene(request: InterveneRequest) -> ComparisonResult:
    return COMPARISON.model_copy(deep=True)


@app.post('/analyze', response_model=AgentAnalysis,
          summary='Fixed illustrative analysis; no LLM or simulation is called')
def analyze(request: AnalyzeRequest) -> AgentAnalysis:
    return ANALYSIS.model_copy(deep=True)


@app.get('/compare', response_model=ComparisonResult,
         summary='Compatibility alias for the fixed demo comparison')
def compare() -> ComparisonResult:
    return COMPARISON.model_copy(deep=True)


@app.get('/facilities', response_model=list[Facility])
def facilities() -> list[Facility]:
    return [facility.model_copy(deep=True) for facility in FACILITIES]


@app.get('/graph/geojson', response_model=GraphGeoJSON)
def graph_geojson() -> GraphGeoJSON:
    return GraphGeoJSON.model_validate({
        'type': 'FeatureCollection', 'provenance': 'simulated',
        'features': [{
            'type': 'Feature',
            'geometry': {'type': 'LineString',
                         'coordinates': [[77.24, 28.65], [77.25, 28.66]]},
            'properties': {'id': 'road-yamuna-01', 'status': 'failed',
                           'provenance': 'simulated'},
        }, {
            'type': 'Feature',
            'geometry': {'type': 'LineString',
                         'coordinates': [[77.25, 28.66], [77.26, 28.64]]},
            'properties': {'id': 'road-ito-02', 'status': 'failed',
                           'provenance': 'simulated'},
        }],
    })
