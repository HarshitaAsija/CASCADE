import { useCallback, useEffect, useRef, useState } from 'react';
import { initialSamples, loadComparison, loadFacilities, loadGraph, loadSimulation } from '../api/client';
import type { ComparisonResult, Facility, FloodScenario, GraphGeoJSON, SimulationResult } from '../types';

export type FacilityState = 'functioning' | 'degraded' | 'failed' | 'isolated';

export interface SimulationView {
  graph: GraphGeoJSON;
  facilities: Facility[];
  simulation: SimulationResult;
  comparison: ComparisonResult;
  sources: Record<'roads' | 'facilities' | 'simulation' | 'comparison', 'api' | 'sample'>;
  loading: boolean;
  error: string | null;
  requestedSeverity: FloodScenario['severity'];
}

export function useSimulation() {
  const [view, setView] = useState<SimulationView>({
    ...initialSamples,
    sources: { roads: 'sample', facilities: 'sample', simulation: 'sample', comparison: 'sample' },
    loading: true, error: null, requestedSeverity: 'high',
  });
  const activeRequest = useRef<AbortController | null>(null);

  const runSimulation = useCallback(async (severity: FloodScenario['severity']) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setView(previous => ({ ...previous, loading: true, error: null, requestedSeverity: severity }));
    try {
      const [graph, facilities, simulation, comparison] = await Promise.all([
        loadGraph(controller.signal), loadFacilities(controller.signal),
        loadSimulation(controller.signal, severity), loadComparison(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      // A failed requested run must not silently masquerade as a successful severity change.
      const error = simulation.source === 'sample'
        ? `Could not run the ${severity} scenario (${simulation.error}). Showing the bundled high-flood example.`
        : graph.source === 'sample' || facilities.source === 'sample'
          ? 'Some map data could not be loaded. Bundled samples are shown for those datasets.' : null;
      setView({ graph: graph.data, facilities: facilities.data, simulation: simulation.data,
        comparison: comparison.data, sources: { roads: graph.source, facilities: facilities.source,
          simulation: simulation.source, comparison: comparison.source }, loading: false, error,
        requestedSeverity: severity });
    } catch (error) {
      if (!controller.signal.aborted) setView(previous => ({ ...previous, loading: false,
        error: error instanceof Error ? error.message : 'Could not load this scenario.' }));
    }
  }, []);

  useEffect(() => {
    void runSimulation('high');
    return () => activeRequest.current?.abort();
  }, [runSimulation]);

  return { ...view, runSimulation };
}
