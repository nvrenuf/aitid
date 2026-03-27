import { SEED_THREATS } from './seed.js';
import { getAllThreats } from './store.js';
import { summarizeThreatResultSet } from './threats-utils.js';

export async function getThreatCorpus() {
  let threats = await getAllThreats();
  if (threats.length === 0) threats = SEED_THREATS;
  return threats;
}

export async function getThreatSurfaceData() {
  const threats = await getThreatCorpus();

  return {
    threats,
    summary: summarizeThreatResultSet(threats),
    filters: {
      severities: [...new Set(threats.map((threat) => threat.severity))],
      models: [...new Set(threats.flatMap((threat) => threat.models))].sort(),
      vectors: [...new Set(threats.flatMap((threat) => threat.vectors))].sort(),
      statuses: [...new Set(threats.map((threat) => threat.status))].sort(),
    },
  };
}
