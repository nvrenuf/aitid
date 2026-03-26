// src/pages/api/pipeline/run.ts
// Called by Vercel Cron (every 6h) and optionally manually
// Protected by CRON_SECRET to prevent public triggering

import type { APIRoute } from 'astro';
import { runPipeline } from '../../../lib/pipeline.js';

export const POST: APIRoute = async ({ request }) => {
  // Auth check — Vercel sends Authorization header for cron jobs
  const authHeader = request.headers.get('Authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET ?? '';
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status:  401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const lookbackDays   = Number(body.lookbackDays   ?? 7);
  const forceReclassify = Boolean(body.forceReclassify ?? false);

  console.log(`[/api/pipeline/run] Starting pipeline run (lookback: ${lookbackDays}d, force: ${forceReclassify})`);

  // Run async — return immediately with run ID, pipeline continues
  const runPromise = runPipeline({ lookbackDays, forceReclassify });

  // For Vercel serverless we need to await (max 60s configured in vercel.json)
  const run = await runPromise;

  return new Response(JSON.stringify(run), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Also support GET for easy manual testing from browser
export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('Authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Use POST with Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const run = await runPipeline({ lookbackDays: 7 });
  return new Response(JSON.stringify(run), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
