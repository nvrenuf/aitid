import { runPipeline } from '../src/lib/pipeline.js';

const lookbackArg = process.argv[2];
const lookbackDays = Number(lookbackArg ?? process.env.LOOKBACK_DAYS ?? 7);
const forceReclassify = process.argv.includes('--force') || process.env.FORCE_RECLASSIFY === 'true';

const run = await runPipeline({
  lookbackDays: Number.isFinite(lookbackDays) ? lookbackDays : 7,
  forceReclassify,
  onProgress: (msg) => console.log(msg),
});

console.log(JSON.stringify(run, null, 2));
