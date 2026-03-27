// src/pages/api/pipeline/run.ts
// Called by Vercel Cron (every 15 minutes) and optionally manually
// Protected by CRON_SECRET to prevent public triggering

import type { APIRoute } from 'astro';
import { runPipeline } from '../../../lib/pipeline.js';
import { authorizePipelineRunRequest, readPipelineRunInput } from '../../../lib/pipeline-run-request.js';

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

async function handlePipelineRun(request: Request) {
  const cronSecret = process.env.CRON_SECRET ?? '';
  const authorization = authorizePipelineRunRequest(request, cronSecret);

  if (!authorization.ok) {
    console.warn('[/api/pipeline/run] Request rejected', {
      method: request.method,
      status: authorization.status,
      error: authorization.error,
      isCronRequest: authorization.isCronRequest,
    });

    return jsonResponse(
      {
        error: authorization.error,
        isCronRequest: authorization.isCronRequest,
      },
      authorization.status,
    );
  }

  if (authorization.warning) {
    console.warn(`[/api/pipeline/run] ${authorization.warning}`);
  }

  try {
    const { lookbackDays, forceReclassify } = await readPipelineRunInput(request);

    console.log('[/api/pipeline/run] Starting pipeline run', {
      method: request.method,
      authMode: authorization.authMode,
      isCronRequest: authorization.isCronRequest,
      lookbackDays,
      forceReclassify,
    });

    const run = await runPipeline({ lookbackDays, forceReclassify });

    return jsonResponse({
      ...run,
      authMode: authorization.authMode,
      isCronRequest: authorization.isCronRequest,
    });
  } catch (error) {
    console.error('[/api/pipeline/run] Route failed before pipeline completion', error);

    return jsonResponse(
      {
        error: 'Pipeline route failed before completion',
        detail: error instanceof Error ? error.message : String(error),
        authMode: authorization.authMode,
        isCronRequest: authorization.isCronRequest,
      },
      500,
    );
  }
}

export const POST: APIRoute = async ({ request }) => {
  return handlePipelineRun(request);
};

// Also support GET for easy manual testing from browser
export const GET: APIRoute = async ({ request }) => {
  return handlePipelineRun(request);
};
