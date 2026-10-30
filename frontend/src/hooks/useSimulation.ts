import { useEffect, useState } from 'react';
import { initialSamples, loadFacilities, loadGraph, loadSimulation } from '../api/client';
import type { Facility, GraphGeoJSON, SimulationResult } from '../types';

export type FacilityState = 'functioning' | 'degraded' | 'failed' | 'isolated';

interface SimulationView {
  graph: GraphGeoJSON;
  facilities: Facility[];
  simulation: SimulationResult;
  sources: Record<'roads' | 'facilities' | 'simulation', 'api' | 'sample'>;
  loading: boolean;
}

export function useSimulation() {
  const [view, setView] = useState<SimulationView>({
    ...initialSamples,
    sources: { roads: 'sample', facilities: 'sample', simulation: 'sample' },
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      loadGraph(controller.signal), loadFacilities(controller.signal), loadSimulation(controller.signal),
    ]).then(([graph, facilities, simulation]) => {
      if (controller.signal.aborted) return;
      setView({ graph: graph.data, facilities: facilities.data, simulation: simulation.data,
        sources: { roads: graph.source, facilities: facilities.source, simulation: simulation.source },
        loading: false });
    }).catch(() => {
      if (!controller.signal.aborted) setView(previous => ({ ...previous, loading: false }));
    });
    return () => controller.abort();
  }, []);

  const states: Record<string, FacilityState> = {};
  for (const facility of view.facilities) {
    states[facility.id] = view.simulation.failed_facility_ids.includes(facility.id) ? 'failed'
      : view.simulation.isolated_facility_ids.includes(facility.id) ? 'isolated' : 'functioning';
  }
  return { ...view, states };
}
