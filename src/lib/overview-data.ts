import { SEED_THREATS } from './seed.js';
import { getStats } from './store.js';

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
      ? `${initialStats.activeCritical} critical campaigns remain active and require immediate leadership visibility.`
      : 'No active critical campaigns are currently in rotation, but medium and high-severity tracking remains live.';
  const overviewPriority =
    initialStats.newThisWeek > 0
      ? `${initialStats.newThisWeek} items landed in the last seven days, with model and vector overlap concentrated in the main feed below.`
      : 'No new items entered the pipeline this week; the focus remains on validating remediation status in the current queue.';
  const overviewStatus = initialStats.pipelineStatus === 'healthy' ? 'Collection healthy' : 'Collection needs review';
  const overviewUpdated = new Date(initialStats.lastUpdated).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return {
    initialStats,
    overviewPosture,
    overviewPriority,
    overviewStatus,
    overviewUpdated,
    now: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}
