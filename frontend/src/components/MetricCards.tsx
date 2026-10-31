import type { Metrics, SimulationResult } from '../types';
import { ProvenanceBadge } from './ProvenanceBadge';

type MetricKey = Exclude<keyof Metrics, 'provenance'>;
const definitions: Array<{ key: MetricKey; label: string; unit: string; deltaUnit: string; higherBetter?: boolean }> = [
  { key: 'median_response_min', label: 'Median response time', unit: 'min', deltaUnit: 'min' },
  { key: 'p90_response_min', label: 'P90 response time', unit: 'min', deltaUnit: 'min' },
  { key: 'pop_without_hospital_access', label: 'Population without hospital access', unit: 'people', deltaUnit: 'people' },
  { key: 'facilities_degraded', label: 'Facilities degraded', unit: 'facilities', deltaUnit: 'facilities' },
  { key: 'evacuation_capacity_pct', label: 'Evacuation capacity', unit: '%', deltaUnit: 'pp', higherBetter: true },
];
const format = (value: number | null) => value === null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 1 });

export function MetricCards({ result, baseline }: { result: SimulationResult; baseline?: SimulationResult }) {
  return <section className="metric-cards" aria-label={baseline ? 'Baseline versus intervention metrics' : 'Simulation metrics'}>
    {definitions.map(metric => {
      const value = result.metrics[metric.key];
      const before = baseline?.metrics[metric.key];
      const delta = value !== null && before !== null && before !== undefined ? value - before : null;
      const improved = delta !== null && (metric.higherBetter ? delta > 0 : delta < 0);
      const worse = delta !== null && (metric.higherBetter ? delta < 0 : delta > 0);
      return <article className="metric-card" key={metric.key}>
        <h3>{metric.label}</h3>
        <div className={baseline ? 'metric-values comparing' : 'metric-values'}>
          {baseline && <div><p className="metric-caption">Baseline</p>
            <p className="metric-number">{format(baseline.metrics[metric.key])}<span>{metric.unit}</span></p>
            <ProvenanceBadge provenance={baseline.metrics.provenance} /></div>}
          <div>{baseline && <p className="metric-caption">Intervention</p>}
            <p className="metric-number">{format(value)}<span>{metric.unit}</span></p>
            <ProvenanceBadge provenance={result.metrics.provenance} /></div>
        </div>
        {baseline && <p className={`metric-delta ${improved ? 'improved' : worse ? 'worse' : 'unchanged'}`}>
          {delta === null ? 'No comparable data' : delta === 0 ? '— No change'
            : <><span aria-hidden="true">{improved ? '↓' : '↑'}</span> {delta > 0 ? '+' : '−'}{format(Math.abs(delta))} {metric.deltaUnit} · {improved ? 'Improved' : 'Worse'}</>}
        </p>}
      </article>;
    })}
  </section>;
}
