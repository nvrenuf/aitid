// src/lib/pipeline.ts
// Orchestrates a full pipeline run: fetch → classify → store → stats

import { fetchAllSources } from './sources.js';
import { classifyBatch }   from './classifier.js';
import { saveThreat, getThreat, computeAndSaveStats, logPipelineRun } from './store.js';
import type { PipelineRun } from './types.js';

function runId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface PipelineOptions {
  lookbackDays?: number;
  forceReclassify?: boolean;
  onProgress?: (msg: string) => void;
}

export async function runPipeline(opts: PipelineOptions = {}): Promise<PipelineRun> {
  const { lookbackDays = 7, forceReclassify = false, onProgress } = opts;
  const log = (msg: string) => { console.log(`[pipeline] ${msg}`); onProgress?.(msg); };

  const run: PipelineRun = {
    id:            runId(),
    startedAt:     new Date().toISOString(),
    status:        'running',
    sourcesPolled: [],
    newThreats:    0,
    updatedThreats: 0,
    errors:        [],
  };

  try {
    // 1. Fetch advisories from all sources
    log('Fetching advisories from all sources...');
    const { advisories, sourcesCounted } = await fetchAllSources(lookbackDays);
    run.sourcesPolled = Object.entries(sourcesCounted)
      .filter(([, n]) => n > 0)
      .map(([src, n]) => `${src}(${n})`);

    log(`Found ${advisories.length} advisories across ${run.sourcesPolled.join(', ')}`);

    if (advisories.length === 0) {
      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      await logPipelineRun(run);
      return run;
    }

    // 2. Filter out already-known threats (unless force reclassify)
    const toClassify = forceReclassify
      ? advisories
      : (await Promise.all(
          advisories.map(async a => ({ a, known: !!(await getThreat(a.id)) }))
        )).filter(({ known }) => !known).map(({ a }) => a);

    log(`Classifying ${toClassify.length} new advisories (${advisories.length - toClassify.length} already known)...`);

    // 3. Classify in batches
    const threats = await classifyBatch(toClassify, (done, total) => {
      if (done % 5 === 0 || done === total) log(`Classified ${done}/${total}...`);
    });

    // 4. Persist
    let saved = 0;
    for (const threat of threats) {
      try {
        await saveThreat(threat);
        saved++;
      } catch (err) {
        run.errors.push(`Failed to save threat ${threat.id}: ${String(err)}`);
      }
    }

    run.newThreats = saved;
    log(`Saved ${saved} threats to store`);

    // 5. Recompute dashboard stats
    await computeAndSaveStats();
    log('Dashboard stats updated');

    run.status = 'completed';
    run.completedAt = new Date().toISOString();
  } catch (err) {
    run.status = 'failed';
    run.completedAt = new Date().toISOString();
    run.errors.push(String(err));
    console.error('[pipeline] Pipeline failed:', err);
  }

  await logPipelineRun(run);
  return run;
}
