import { useState } from 'react';
import { MapView } from './components/MapView';
import { ControlPanel } from './components/ControlPanel';
import type { ViewMode } from './components/ControlPanel';
import { useSimulation } from './hooks/useSimulation';
import type { FloodScenario } from './types';

export default function App() {
  const view = useSimulation();
  const [severity, setSeverity] = useState<FloodScenario['severity']>('high');
  const [mode, setMode] = useState<ViewMode>('simulation');
  const [interventionId, setInterventionId] = useState('generator-lnjp');
  const selectedIntervention = view.comparison.results[interventionId] ? interventionId
    : view.comparison.interventions.find(item => view.comparison.results[item.id])?.id ?? '';
  const displayed = mode === 'comparison' ? view.comparison.results[selectedIntervention] ?? view.simulation : view.simulation;
  const run = (requested = severity) => { setMode('simulation'); void view.runSimulation(requested); };
  return <main className="app-shell">
    <ControlPanel view={view} severity={severity} onSeverityChange={setSeverity} onRun={() => run()}
      onRetry={() => { setSeverity(view.requestedSeverity); run(view.requestedSeverity); }}
      mode={mode} onModeChange={setMode} selectedIntervention={selectedIntervention} onInterventionChange={setInterventionId} />
    <MapView graph={view.graph} facilities={view.facilities} simulation={displayed} />
  </main>;
}
