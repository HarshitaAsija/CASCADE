# CASCADE data

This directory holds cached inputs for one New Delhi study area:

- `graph.graphml`: cached directed OpenStreetMap road graph (large caches are ignored).
- `facilities.json`: facility locations, capacities and provenance.
- `dependencies.json`: explicit facility dependency rules and provenance.
- `flood_zones.geojson`: simulated flood polygons and provenance.
- `sample_simulation.json`: schema-valid simulated response for frontend development.
- `sample_comparison.json`: schema-valid baseline and individual intervention results.
- `sample_agents.json`: schema-valid illustrative agent explanation and intervention proposals.

The three sample responses and `facilities.json` are supplied at this stage. All values are simulated, including coordinates, capacities, backup durations, node IDs, travel times, population counts and intervention benefits. LNJP Hospital and GTB Hospital names provide Delhi context; the records are not verified representations of those hospitals. The flood polygon and timeline are illustrative. No graph engine or AI generated these results.

Road graph, dependency rules and verified flood zones still need to be acquired before simulation is implemented. Every input record preserves provenance (`real`, `estimated`, `simulated`). Keep mixed-source values separately labelled. Do not commit API keys.
