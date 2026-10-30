import type { Provenance } from '../types';

const explanations: Record<Provenance, string> = {
  real: 'Real: sourced and verified observations. This label applies only to the record it accompanies.',
  estimated: 'Estimated: inferred or assumed values; not verified observations.',
  simulated: 'Simulated: invented scenario or demo values; not observed disaster conditions.',
};

export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  return <span className={`provenance-badge provenance-${provenance}`} tabIndex={0}
    title={explanations[provenance]} aria-label={explanations[provenance]}>
    {provenance}
    <span className="provenance-tooltip" role="tooltip">{explanations[provenance]}</span>
  </span>;
}
