import json
from pathlib import Path
import subprocess
import sys

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter, ValidationError

from app.main import app, simulate, facilities
from app.schemas import (
    AgentAnalysis, ComparisonResult, DependencyEdge, Facility, FloodScenario,
    GraphGeoJSON, HealthResponse, Metrics, SimulationResult,
)

ROOT = Path(__file__).resolve().parents[2]
CLIENT = TestClient(app)
SCENARIO = {'severity': 'high'}
ANALYSIS = json.loads((ROOT / 'data/sample_agents.json').read_text(encoding='utf-8'))


@pytest.mark.parametrize('method,path,body,adapter,fixture', [
    ('GET', '/health', None, TypeAdapter(HealthResponse), None),
    ('POST', '/simulate', SCENARIO, TypeAdapter(SimulationResult), 'sample_simulation.json'),
    ('POST', '/intervene', {'scenario': SCENARIO, 'interventions': ANALYSIS['interventions']},
     TypeAdapter(ComparisonResult), 'sample_comparison.json'),
    ('POST', '/analyze', {'scenario': SCENARIO}, TypeAdapter(AgentAnalysis), 'sample_agents.json'),
    ('GET', '/compare', None, TypeAdapter(ComparisonResult), 'sample_comparison.json'),
    ('GET', '/facilities', None, TypeAdapter(list[Facility]), 'facilities.json'),
    ('GET', '/graph/geojson', None, TypeAdapter(GraphGeoJSON), None),
])
def test_endpoint_response_contract(method, path, body, adapter, fixture) -> None:
    response = CLIENT.request(method, path, json=body)
    assert response.status_code == 200
    adapter.validate_python(response.json())
    if fixture:
        expected = json.loads((ROOT / 'data' / fixture).read_text(encoding='utf-8'))
        assert response.json() == expected


def test_comparison_consistency() -> None:
    comparison = ComparisonResult.model_validate_json(
        (ROOT / 'data/sample_comparison.json').read_text(encoding='utf-8'))
    assert comparison.baseline == SimulationResult.model_validate_json(
        (ROOT / 'data/sample_simulation.json').read_text(encoding='utf-8'))
    assert set(comparison.results) == {item.id for item in comparison.interventions}
    assert comparison.interventions == AgentAnalysis.model_validate(ANALYSIS).interventions
    assert comparison.baseline.provenance == 'simulated'
    for result in comparison.results.values():
        assert result.provenance == result.metrics.provenance == 'simulated'
    for item in comparison.interventions:
        assert item.params['provenance'] == item.provenance == 'simulated'


def test_fixture_ids_refer_to_known_entities() -> None:
    simulation = SimulationResult.model_validate_json(
        (ROOT / 'data/sample_simulation.json').read_text(encoding='utf-8'))
    facility_ids = {item['id'] for item in CLIENT.get('/facilities').json()}
    assert set(simulation.failed_facility_ids + simulation.isolated_facility_ids) <= facility_ids
    edge_ids = {item['properties']['id'] for item in CLIENT.get('/graph/geojson').json()['features']}
    assert set(simulation.failed_edge_ids) <= edge_ids
    for item in ANALYSIS['interventions']:
        assert item['params']['facility_id'] in facility_ids


@pytest.mark.parametrize('severity', ['moderate', 'high', 'record'])
def test_stub_severity_is_accepted_but_not_executed(severity: str) -> None:
    assert CLIENT.post('/simulate', json={'severity': severity}).json() == CLIENT.post(
        '/simulate', json=SCENARIO).json()


@pytest.mark.parametrize('path,body', [
    ('/simulate', {'severity': 'extreme'}),
    ('/simulate', {}),
    ('/intervene', {'scenario': SCENARIO}),
    ('/intervene', {'scenario': SCENARIO, 'interventions': [
        {'id': 'bad', 'type': 'invented', 'params': {}, 'rationale': 'test'}]}),
    ('/analyze', {'scenario': {'severity': 'invalid'}}),
])
def test_invalid_requests_rejected(path: str, body: dict) -> None:
    assert CLIENT.post(path, json=body).status_code == 422


def test_provenance_preserved_and_defaults_safely() -> None:
    assert FloodScenario(severity='high').provenance == 'simulated'
    assert FloodScenario(severity='high', provenance='estimated').provenance == 'estimated'
    with pytest.raises(ValidationError):
        FloodScenario(severity='high', provenance='verified')
    assert all(item['provenance'] == 'simulated' for item in CLIENT.get('/facilities').json())


def test_dependency_kinds() -> None:
    for kind in ['power', 'road_access']:
        assert DependencyEdge(source_id='a', target_id='b', kind=kind).kind == kind
    with pytest.raises(ValidationError):
        DependencyEdge(source_id='a', target_id='b', kind='water')


def test_metric_bounds_and_null_travel_times() -> None:
    values = dict(median_response_min=None, p90_response_min=None,
                  pop_without_hospital_access=1500, facilities_degraded=2,
                  evacuation_capacity_pct=0)
    assert Metrics(**values).median_response_min is None
    with pytest.raises(ValidationError):
        Metrics(**{**values, 'evacuation_capacity_pct': 101})
    with pytest.raises(ValidationError):
        Metrics(**{**values, 'p90_response_min': -1})


def test_facility_bounds_and_nullable_fields() -> None:
    values = CLIENT.get('/facilities').json()[0]
    assert Facility.model_validate({**values, 'capacity': None, 'backup_hours': None,
                                    'node_id': None}).node_id is None
    for key, invalid in [('lat', 91), ('lon', 181), ('capacity', -1), ('backup_hours', -1)]:
        with pytest.raises(ValidationError):
            Facility.model_validate({**values, key: invalid})


def test_return_values_cannot_mutate_cached_samples() -> None:
    before = simulate(FloodScenario(severity='high')).model_dump()
    changed = simulate(FloodScenario(severity='high'))
    changed.failed_facility_ids.clear()
    assert simulate(FloodScenario(severity='high')).model_dump() == before
    original_name = facilities()[0].name
    facilities()[0].name = 'modified'
    assert facilities()[0].name == original_name


def test_cors() -> None:
    headers = {'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
               'Access-Control-Request-Headers': 'content-type'}
    response = CLIENT.options('/analyze', headers=headers)
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == headers['Origin']
    assert CLIENT.options('/analyze', headers={**headers, 'Origin': 'https://example.com'}).status_code == 400


def test_typescript_contracts_are_current() -> None:
    subprocess.run([sys.executable, str(ROOT / 'scripts/generate_types.py'), '--check'],
                   check=True, cwd=ROOT)
