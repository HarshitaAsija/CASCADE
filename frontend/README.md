# CASCADE map frontend

React hooks, strict TypeScript and MapLibre. Run `npm install` then `npm run dev` from this folder. The default API is `http://localhost:8000`; set `VITE_API_BASE` in `frontend/.env` and restart Vite to override it. Run `npm run build` for the production build.

`src/api/client.ts` fetches `GET /graph/geojson`, `GET /facilities`, and `POST /simulate` with a simulated high-severity scenario. A failed HTTP request, malformed JSON or five-second timeout uses the corresponding bundled fixture. Aborted/unmounted requests never update state. The map displays each dataset's API/sample origin separately, since fallback can be partial. API-sourced data may still be simulated; provenance badges identify that separately.

`src/sample/facilities.json` and `sample_simulation.json` are verbatim copies from `data/`. `src/sample/graph.geojson.json` copies `data/sample_graph.geojson`, a snapshot of the current graph stub. Update both copies together. All scenario fixtures are simulated, including named hospital locations and capacity/backup values. No metrics or infrastructure failures are calculated in the frontend.

`src/hooks/useSimulation.ts` owns data loading and maps engine failed/isolated IDs to marker states. The current API has no per-facility degraded IDs. `MapView` accepts an optional `facilityStates` mapping to display explicit degraded states when supplied by a caller; it does not infer degradation from capacity, backup availability or flood geometry. Failed and isolated markers are red, functioning markers green, and explicit degraded markers amber.

Facility markers are keyboard-focusable buttons (H hospital, S shelter, F fire station, P power). Click or press Enter/Space for a popup. `ProvenanceBadge` has distinct colours and a tooltip accessible on hover or keyboard focus. Popup values render as React text, not injected HTML.

The basemap uses key-free OpenStreetMap raster tiles and keeps visible contributor attribution. Internet access is required for the basemap; API fallback bundles scenario overlays, not map tiles. No tile prefetching or offline tile cache is implemented. See [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and the [MapLibre raster example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-raster-tile-source/).

`src/types.ts` is generated from the fixed backend Pydantic contracts; do not edit it by hand.
