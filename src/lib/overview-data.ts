import { SEED_THREATS } from './seed.js';
import { getStats } from './store.js';
import { formatEasternTimestamp } from './time.js';

export async function getOverviewPageData() {
  let stats;
  try {
    stats = await getStats();
  } catch {
    stats = null;
  }

  const seedModelCount = new Set(
    SEED_THREATS.flatMap((threat) => threat.models).filter((model) => model !== 'multi-model'),
  ).size;

  const fallbackStats = {
    totalThreats: SEED_THREATS.length,
    activeCritical: SEED_THREATS.filter((threat) => threat.severity === 'critical' && threat.status === 'active').length,
    activeHigh: SEED_THREATS.filter((threat) => threat.severity === 'high' && threat.status === 'active').length,
    newThisWeek: SEED_THREATS.length,
    modelsAffected: seedModelCount,
    lastUpdated: new Date().toISOString(),
    pipelineStatus: 'healthy',
  };

  const initialStats = stats ?? fallbackStats;
  const overviewPosture =
    initialStats.activeCritical > 0
      ? `${initialStats.activeCritical} critical campaigns require immediate review.`
      : 'No active critical campaigns. High and medium-severity tracking remains active.';
  const overviewPriority =
    initialStats.newThisWeek > 0
      ? `${initialStats.newThisWeek} items landed in the last seven days and remain concentrated in the active queue.`
      : 'No new items entered this week. Review remediation status across the active queue.';
  const overviewStatus = initialStats.pipelineStatus === 'healthy' ? 'Collection healthy' : 'Collection needs review';
  const overviewUpdated = formatEasternTimestamp(initialStats.lastUpdated);

  return {
    initialStats,
    overviewPosture,
    overviewPriority,
    overviewStatus,
    overviewUpdated,
  };
}
