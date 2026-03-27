import { SEED_THREATS } from './seed.js';
import { getAllThreats } from './store.js';
import { buildThreatMapDataset } from './threat-map-core.js';

export * from './threat-map-core.js';

export async function getThreatMapDataset() {
  let threats = await getAllThreats();
  if (threats.length === 0) threats = SEED_THREATS;
  return buildThreatMapDataset(threats);
}
