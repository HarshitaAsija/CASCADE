"""Pydantic v2 API contracts; provenance applies to every value in a record."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue

Provenance = Literal['real', 'estimated', 'simulated']


class Contract(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class ProvenancedContract(Contract):
    # Missing metadata must never make demo values appear verified.
    provenance: Provenance = 'simulated'


class HealthResponse(Contract):
    status: Literal['ok']


class Facility(ProvenancedContract):
    id: str
    name: str
    type: Literal['hospital', 'shelter', 'fire_station', 'substation']
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    capacity: int | None = Field(ge=0)
    has_backup: bool
    backup_hours: float | None = Field(ge=0)
    node_id: int | None


class DependencyEdge(ProvenancedContract):
    source_id: str
    target_id: str
    kind: Literal['power', 'road_access']


class FloodScenario(ProvenancedContract):
    severity: Literal['moderate', 'high', 'record']


class TimelineStep(ProvenancedContract):
    t_hours: float = Field(ge=0)
    newly_failed_ids: list[str]
    description: str


class Metrics(ProvenancedContract):
    median_response_min: float | None = Field(ge=0)
    p90_response_min: float | None = Field(ge=0)
    pop_without_hospital_access: int = Field(ge=0)
    facilities_degraded: int = Field(ge=0)
    evacuation_capacity_pct: float = Field(ge=0, le=100)


class PolygonGeoJSON(ProvenancedContract):
    type: Literal['Polygon']
    coordinates: list[list[tuple[float, float]]] = Field(min_length=1)


class SimulationResult(ProvenancedContract):
    flood_polygon_geojson: PolygonGeoJSON
    failed_edge_ids: list[str]
    failed_facility_ids: list[str]
    isolated_facility_ids: list[str]
    metrics: Metrics
    timeline: list[TimelineStep]


class Intervention(ProvenancedContract):
    id: str
    type: Literal['reroute', 'preposition_ambulance', 'open_shelter', 'deploy_generator']
    params: dict[str, JsonValue]
    rationale: str


class ComparisonResult(ProvenancedContract):
    baseline: SimulationResult
    interventions: list[Intervention]
    results: dict[str, SimulationResult]


class AgentAnalysis(ProvenancedContract):
    explanation: str
    bottlenecks: list[str]
    interventions: list[Intervention]
    assumptions: list[str]
    confidence_notes: list[str]


class InterveneRequest(Contract):
    scenario: FloodScenario
    interventions: list[Intervention]


class AnalyzeRequest(Contract):
    scenario: FloodScenario


class LineStringGeometry(Contract):
    type: Literal['LineString']
    coordinates: list[tuple[float, float]] = Field(min_length=2)


class RoadProperties(ProvenancedContract):
    id: str
    status: Literal['open', 'failed']


class RoadFeature(Contract):
    type: Literal['Feature']
    geometry: LineStringGeometry
    properties: RoadProperties


class GraphGeoJSON(ProvenancedContract):
    type: Literal['FeatureCollection']
    features: list[RoadFeature]
