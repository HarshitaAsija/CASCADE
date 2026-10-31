import type { ComparisonResult, Facility, FloodScenario, GraphGeoJSON, Metrics, SimulationResult } from '../types';
import graphSample from '../sample/graph.geojson.json';
import facilitySample from '../sample/facilities.json';
import simulationSample from '../sample/sample_simulation.json';
import comparisonSample from '../sample/sample_comparison.json';

export const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/+$/, '');

export interface Loaded<T> {
  data: T;
  source: 'api' | 'sample';
  error?: string;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const provenance = (value: unknown) => ['real', 'estimated', 'simulated'].includes(String(value));
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const point = (value: unknown) => Array.isArray(value) && value.length === 2 && value.every(finite);
const ids = (value: unknown) => Array.isArray(value) && value.every(id => typeof id === 'string');

function validGraph(value: unknown): value is GraphGeoJSON {
  return record(value) && value.type === 'FeatureCollection' && provenance(value.provenance)
    && Array.isArray(value.features) && value.features.every(feature => record(feature)
      && feature.type === 'Feature' && record(feature.geometry) && feature.geometry.type === 'LineString'
      && Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.every(point)
      && record(feature.properties) && typeof feature.properties.id === 'string'
      && ['open', 'failed'].includes(String(feature.properties.status)) && provenance(feature.properties.provenance));
}

function validFacilities(value: unknown): value is Facility[] {
  return Array.isArray(value) && value.every(item => record(item)
    && typeof item.id === 'string' && typeof item.name === 'string'
    && ['hospital', 'shelter', 'fire_station', 'substation'].includes(String(item.type))
    && finite(item.lat) && Math.abs(item.lat) <= 90 && finite(item.lon) && Math.abs(item.lon) <= 180
    && (item.capacity === null || finite(item.capacity)) && typeof item.has_backup === 'boolean'
    && (item.backup_hours === null || finite(item.backup_hours))
    && (item.node_id === null || finite(item.node_id)) && provenance(item.provenance));
}

function validMetrics(value: unknown): value is Metrics {
  if (!record(value) || !provenance(value.provenance)) return false;
  return ['median_response_min', 'p90_response_min'].every(key => value[key] === null || (finite(value[key]) && value[key] >= 0))
    && ['pop_without_hospital_access', 'facilities_degraded'].every(key => finite(value[key]) && value[key] >= 0)
    && finite(value.evacuation_capacity_pct) && value.evacuation_capacity_pct >= 0 && value.evacuation_capacity_pct <= 100;
}

function validSimulation(value: unknown): value is SimulationResult {
  if (!record(value) || !provenance(value.provenance) || !record(value.flood_polygon_geojson)) return false;
  const polygon = value.flood_polygon_geojson;
  return polygon.type === 'Polygon' && provenance(polygon.provenance)
    && Array.isArray(polygon.coordinates) && polygon.coordinates.length > 0
    && polygon.coordinates.every(ring => Array.isArray(ring) && ring.length >= 4 && ring.every(point))
    && ids(value.failed_edge_ids) && ids(value.failed_facility_ids) && ids(value.isolated_facility_ids)
    && validMetrics(value.metrics) && Array.isArray(value.timeline);
}

function validComparison(value: unknown): value is ComparisonResult {
  if (!record(value) || !validSimulation(value.baseline) || !record(value.results)
    || !Array.isArray(value.interventions) || !provenance(value.provenance)) return false;
  const results = value.results;
  return Object.values(results).every(validSimulation) && value.interventions.every(item => record(item)
    && typeof item.id === 'string' && typeof item.rationale === 'string' && record(item.params)
    && ['reroute', 'preposition_ambulance', 'open_shelter', 'deploy_generator'].includes(String(item.type))
    && provenance(item.provenance) && item.id in results);
}

// Validate the nested comparison rather than casting JSON arrays to coordinate tuples.
const comparisonFixture: unknown = comparisonSample;
if (!validComparison(comparisonFixture)) throw new Error('Invalid bundled comparison fixture');
const samples = {
  graph: graphSample as GraphGeoJSON,
  facilities: facilitySample as Facility[],
  simulation: simulationSample as SimulationResult,
  comparison: comparisonFixture,
};

async function request<T>(path: string, fallback: T, valid: (value: unknown) => value is T, signal: AbortSignal, body?: object): Promise<Loaded<T>> {
  const timeout = new AbortController();
  const abort = () => timeout.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) timeout.abort();
  const timer = window.setTimeout(abort, 5000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: body ? 'POST' : 'GET', signal: timeout.signal,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: unknown = await response.json();
    // Null/HTML responses should not prevent the offline fixture from rendering.
    if (!valid(data)) throw new Error('Invalid API response');
    return { data, source: 'api' };
  } catch (error) {
    if (signal.aborted) throw error;
    return { data: fallback, source: 'sample', error: error instanceof Error ? error.message : 'Request failed' };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

export function loadGraph(signal: AbortSignal): Promise<Loaded<GraphGeoJSON>> {
  return request('/graph/geojson', samples.graph, validGraph, signal);
}

export function loadFacilities(signal: AbortSignal): Promise<Loaded<Facility[]>> {
  return request('/facilities', samples.facilities, validFacilities, signal);
}

export function loadSimulation(signal: AbortSignal, severity: FloodScenario['severity'] = 'high'): Promise<Loaded<SimulationResult>> {
  return request('/simulate', samples.simulation, validSimulation, signal, { severity, provenance: 'simulated' });
}

export function loadComparison(signal: AbortSignal): Promise<Loaded<ComparisonResult>> {
  return request('/compare', samples.comparison, validComparison, signal);
}

export const initialSamples = samples;
