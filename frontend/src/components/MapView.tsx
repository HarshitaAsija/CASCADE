import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import type { Facility } from '../types';
import { useSimulation } from '../hooks/useSimulation';
import type { FacilityState } from '../hooks/useSimulation';
import { ProvenanceBadge } from './ProvenanceBadge';

const letters: Record<Facility['type'], string> = { hospital: 'H', shelter: 'S', fire_station: 'F', substation: 'P' };
const labels: Record<Facility['type'], string> = { hospital: 'Hospital', shelter: 'Shelter', fire_station: 'Fire station', substation: 'Power substation' };
const empty = { type: 'FeatureCollection' as const, features: [] };
const style: StyleSpecification = {
  version: 8,
  sources: {
    osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256, maxzoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>' },
    roads: { type: 'geojson', data: empty },
    flood: { type: 'geojson', data: empty },
  },
  layers: [
    { id: 'basemap', type: 'raster', source: 'osm' },
    { id: 'flood-fill', type: 'fill', source: 'flood', paint: { 'fill-color': '#287ccd', 'fill-opacity': 0.24 } },
    { id: 'flood-outline', type: 'line', source: 'flood', paint: { 'line-color': '#287ccd', 'line-width': 1.5, 'line-opacity': 0.75 } },
    { id: 'roads', type: 'line', source: 'roads', paint: { 'line-color': '#747f8e', 'line-width': 1.5 } },
    { id: 'failed-roads', type: 'line', source: 'roads', filter: ['==', ['get', 'status'], 'failed'],
      paint: { 'line-color': '#d93645', 'line-width': 4 } },
  ],
};

function FacilityDetails({ facility, state }: { facility: Facility; state: FacilityState }) {
  return <section className="facility-details" aria-label={`${facility.name} details`}>
    <p className="eyebrow">{labels[facility.type]} · <span className={`state-text state-text-${state}`}>{state}</span></p>
    <h2>{facility.name}</h2>
    <ProvenanceBadge provenance={facility.provenance} />
    <dl>
      <div><dt>Capacity</dt><dd>{facility.capacity === null ? 'Unknown' : facility.capacity.toLocaleString()}</dd></div>
      <div><dt>Backup power</dt><dd>{facility.has_backup ? 'Available' : 'Not available'}</dd></div>
      <div><dt>Backup hours</dt><dd>{facility.backup_hours === null ? 'Unknown' : `${facility.backup_hours} h`}</dd></div>
    </dl>
    {facility.provenance === 'simulated' && <p className="popup-note">Illustrative demo record, including location and capacity.</p>}
  </section>;
}

export function MapView({ facilityStates }: { facilityStates?: Record<string, FacilityState> }) {
  const { graph, facilities, simulation, states, sources, loading } = useSimulation();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false);
  const [selected, setSelected] = useState<Facility | null>(null);
  const [popupNode, setPopupNode] = useState<HTMLDivElement | null>(null);
  const visibleStates = { ...states, ...facilityStates };

  useEffect(() => {
    if (!container.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container: container.current, style, center: [77.23, 28.63], zoom: 11,
        attributionControl: { compact: false } });
    } catch {
      setMapError('The map needs a browser with WebGL enabled.');
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    // Overlay readiness must not wait for external raster tiles on an offline demo.
    map.on('style.load', () => setReady(true));
    map.on('error', event => {
      if ('sourceId' in event && event.sourceId === 'osm') setTileError(true);
    });
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current);
    return () => { resize.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('roads') as GeoJSONSource).setData(graph);
    (map.getSource('flood') as GeoJSONSource).setData({ type: 'Feature',
      geometry: simulation.flood_polygon_geojson, properties: { provenance: simulation.flood_polygon_geojson.provenance } });
    map.setFilter('failed-roads', ['any', ['==', ['get', 'status'], 'failed'],
      ['in', ['get', 'id'], ['literal', simulation.failed_edge_ids]]]);
  }, [ready, graph, simulation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    setSelected(null);
    const bounds = new maplibregl.LngLatBounds();
    for (const facility of facilities) bounds.extend([facility.lon, facility.lat]);
    for (const ring of simulation.flood_polygon_geojson.coordinates) {
      for (const coordinate of ring) bounds.extend(coordinate);
    }
    if (!bounds.isEmpty()) {
      const height = map.getContainer().clientHeight;
      map.fitBounds(bounds, { padding: { top: Math.min(280, height * 0.4),
        bottom: Math.min(180, height * 0.27), left: 44, right: 60 }, duration: 0, maxZoom: 14 });
    }
    const markers = facilities.map(facility => {
      const state = facilityStates?.[facility.id] ?? states[facility.id];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `facility-marker state-${state}`;
      button.textContent = letters[facility.type];
      button.title = `${facility.name} · ${state}`;
      button.setAttribute('aria-label', `${facility.name}, ${labels[facility.type]}, ${state}. Open details`);
      button.addEventListener('click', event => {
        // The same click must not bubble to the map and immediately close its popup.
        event.stopPropagation();
        setSelected(facility);
      });
      return new maplibregl.Marker({ element: button }).setLngLat([facility.lon, facility.lat]).addTo(map);
    });
    return () => { markers.forEach(marker => marker.remove()); };
  }, [ready, facilities, simulation, facilityStates]); // states only changes with these simulation inputs.

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selected) return;
    const node = document.createElement('div');
    const popup = new maplibregl.Popup({ offset: 22, maxWidth: '300px', focusAfterOpen: false })
      .setLngLat([selected.lon, selected.lat]).setDOMContent(node).addTo(map);
    popupRef.current = popup;
    const close = () => setSelected(null);
    popup.on('close', close);
    setPopupNode(node);
    return () => { popup.off('close', close); popup.remove(); popupRef.current = null; };
  }, [ready, selected]);

  useEffect(() => {
    // Recalculate the anchor after React fills the initially empty popup node.
    if (popupNode && selected) popupRef.current?.setLngLat([selected.lon, selected.lat]);
  }, [popupNode, selected]);

  return <main className="map-view">
    <div ref={container} className="map" aria-label="New Delhi infrastructure and simulated Yamuna flood" />
    <header className="map-heading">
      <p className="eyebrow">Urban infrastructure · What-if simulator</p>
      <h1>CASCADE<span>New Delhi</span></h1>
      <p className="scenario-title"><span className="flood-dot" />Yamuna flood scenario <ProvenanceBadge provenance={simulation.provenance} /></p>
      <p className="map-note">Illustrative failures, locations and capacities. Not live conditions.</p>
      <div className="data-status" role="status" aria-live="polite">
        {loading ? 'Connecting to API… showing bundled samples' : <>
          {Object.entries(sources).map(([name, source]) => <span key={name}>{name}: <strong>{source === 'api' ? 'API' : 'bundled sample'}</strong></span>)}
        </>}
      </div>
      <p className="source-provenance">Roads <ProvenanceBadge provenance={graph.provenance} /></p>
    </header>
    <aside className="map-legend" aria-label="Map legend">
      <p className="eyebrow">Map key</p>
      <div className="legend-row"><span className="legend-line" />Road <span className="legend-line failed" />Failed road <span className="legend-flood" />Flood zone</div>
      <div className="legend-row"><span className="legend-dot functioning" />Functioning <span className="legend-dot degraded" />Degraded <span className="legend-dot failed" />Failed / isolated</div>
      <p className="type-key">H Hospital <span>S Shelter</span> <span>F Fire station</span> <span>P Power</span></p>
    </aside>
    {(mapError || tileError) && <p className="map-error" role="alert">{mapError || 'Basemap tiles unavailable. Scenario overlays remain available.'}</p>}
    {selected && popupNode && createPortal(<FacilityDetails facility={selected} state={visibleStates[selected.id]} />, popupNode)}
  </main>;
}
