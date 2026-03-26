import { SEED_THREATS } from '../src/lib/seed.js';
import { saveThreat, computeAndSaveStats } from '../src/lib/store.js';

for (const threat of SEED_THREATS) {
  await saveThreat(threat);
}

const stats = await computeAndSaveStats();
console.log(`Seeded ${SEED_THREATS.length} threats`);
console.log(JSON.stringify(stats, null, 2));
