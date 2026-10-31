import type { FloodScenario, Intervention } from '../types';
import type { SimulationView } from '../hooks/useSimulation';
import { ProvenanceBadge } from './ProvenanceBadge';
import { MetricCards } from './MetricCards';

export type ViewMode = 'simulation' | 'comparison';
const actionLabels: Record<Intervention['type'], string> = {
  reroute: 'Reroute', preposition_ambulance: 'Pre-position ambulance',
  open_shelter: 'Open shelter', deploy_generator: 'Deploy generator',
};

interface ControlPanelProps {
  view: SimulationView;
  severity: FloodScenario['severity'];
  onSeverityChange: (severity: FloodScenario['severity']) => void;
  onRun: () => void;
  onRetry: () => void;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  selectedIntervention: string;
  onInterventionChange: (id: string) => void;
}

export function ControlPanel({ view, severity, onSeverityChange, onRun, onRetry, mode,
  onModeChange, selectedIntervention, onInterventionChange }: ControlPanelProps) {
  const intervention = view.comparison.interventions.find(item => item.id === selectedIntervention);
  const compared = view.comparison.results[selectedIntervention];
  return <aside className="control-panel" aria-label="Simulation controls">
    <header className="control-heading">
      <p className="eyebrow">Urban infrastructure · What-if simulator</p>
      <h1>CASCADE</h1>
      <p className="control-subtitle">Yamuna flood scenario, New Delhi</p>
      <ProvenanceBadge provenance={view.simulation.provenance} />
    </header>
    <form className="scenario-controls" onSubmit={event => { event.preventDefault(); onRun(); }}>
      <label htmlFor="flood-severity">Flood severity</label>
      <select id="flood-severity" value={severity} disabled={view.loading}
        onChange={event => onSeverityChange(event.target.value as FloodScenario['severity'])}>
        <option value="moderate">Moderate</option><option value="high">High</option><option value="record">Record</option>
      </select>
      <button className="run-button" disabled={view.loading} type="submit" aria-busy={view.loading}>
        {view.loading ? <><span className="loading-spinner" />Running flood simulation…</> : 'Run flood simulation'}
      </button>
      {view.loading && <p className="run-status" role="status">Loading scenario and infrastructure data…</p>}
      {view.error && <div className="simulation-error" role="alert"><p>{view.error}</p>
        <button type="button" disabled={view.loading} onClick={onRetry}>Retry {view.requestedSeverity} scenario</button></div>}
      <p className="demo-note">Demo data: each severity currently shows the same high-flood example. Values are illustrative.</p>
    </form>
    <section className="view-controls" aria-label="Result view">
      <div className="mode-switch" role="group" aria-label="View mode">
        <button type="button" aria-pressed={mode === 'simulation'} onClick={() => onModeChange('simulation')}>Simulation</button>
        <button type="button" aria-pressed={mode === 'comparison'} disabled={!view.comparison.interventions.length}
          onClick={() => onModeChange('comparison')}>Baseline vs Intervention</button>
      </div>
      {mode === 'comparison' && <div className="comparison-controls">
        <label htmlFor="intervention-select">Compare intervention</label>
        <select id="intervention-select" value={selectedIntervention} onChange={event => onInterventionChange(event.target.value)}>
          {view.comparison.interventions.filter(item => view.comparison.results[item.id]).map(item => {
            const facility = view.facilities.find(candidate => candidate.id === item.params.facility_id);
            return <option value={item.id} key={item.id}>{actionLabels[item.type]}{facility ? ` · ${facility.name}` : ''}</option>;
          })}
        </select>
        <p className="intervention-rationale">{intervention?.rationale}</p>
        <p className="demo-note">Saved comparison baseline, independent of the latest run. Map shows the selected intervention. Demo benefits are hand-authored.</p>
      </div>}
      <div className="data-status" aria-label="Data sources">
        {Object.entries(view.sources).map(([name, source]) => <span key={name}>{name}: <strong>{source === 'api' ? 'API' : 'bundled sample'}</strong></span>)}
      </div>
    </section>
    <div className="metrics-heading"><h2>{mode === 'comparison' ? 'Compared impact' : 'Scenario impact'}</h2>
      <span>{mode === 'comparison' ? 'Saved baseline' : `Requested: ${view.requestedSeverity}`}</span></div>
    <MetricCards result={mode === 'comparison' && compared ? compared : view.simulation}
      baseline={mode === 'comparison' && compared ? view.comparison.baseline : undefined} />
    <footer className="control-footer">For planning and training. Not live conditions or a disaster forecast.</footer>
  </aside>;
}
