import test from 'node:test';
import assert from 'node:assert/strict';

import {
  authorizePipelineRunRequest,
  isVercelCronRequest,
  readPipelineRunInput,
} from '../src/lib/pipeline-run-request.js';

test('isVercelCronRequest detects the documented Vercel cron user agent', () => {
  const request = new Request('https://example.com/api/pipeline/run', {
    method: 'GET',
    headers: {
      'user-agent': 'vercel-cron/1.0',
    },
  });

  assert.equal(isVercelCronRequest(request), true);
});

test('authorizePipelineRunRequest accepts Authorization header when CRON_SECRET is configured', () => {
  const request = new Request('https://example.com/api/pipeline/run', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer top-secret',
    },
  });

  assert.deepEqual(authorizePipelineRunRequest(request, 'top-secret'), {
    ok: true,
    authMode: 'cron-secret',
    isCronRequest: false,
  });
});

test('authorizePipelineRunRequest allows Vercel cron fallback when CRON_SECRET is absent', () => {
  const request = new Request('https://example.com/api/pipeline/run', {
    method: 'GET',
    headers: {
      'user-agent': 'vercel-cron/1.0',
    },
  });

  const result = authorizePipelineRunRequest(request, '');

  assert.equal(result.ok, true);
  assert.equal(result.authMode, 'vercel-cron-user-agent');
  assert.equal(result.isCronRequest, true);
  assert.match(result.warning, /CRON_SECRET is not configured/);
});

test('authorizePipelineRunRequest rejects external requests when CRON_SECRET is absent', () => {
  const request = new Request('https://example.com/api/pipeline/run', {
    method: 'POST',
  });

  assert.deepEqual(authorizePipelineRunRequest(request, ''), {
    ok: false,
    status: 503,
    error: 'CRON_SECRET is not configured',
    authMode: 'rejected',
    isCronRequest: false,
  });
});

test('readPipelineRunInput defaults GET requests to the cron-safe payload', async () => {
  const request = new Request('https://example.com/api/pipeline/run', {
    method: 'GET',
  });

  assert.deepEqual(await readPipelineRunInput(request), {
    lookbackDays: 7,
    forceReclassify: false,
  });
});

test('readPipelineRunInput parses POST body options', async () => {
  const request = new Request('https://example.com/api/pipeline/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lookbackDays: 14,
      forceReclassify: true,
    }),
  });

  assert.deepEqual(await readPipelineRunInput(request), {
    lookbackDays: 14,
    forceReclassify: true,
  });
});
