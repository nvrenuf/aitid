function getAuthorizationHeader(request) {
  return request.headers.get('Authorization') ?? '';
}

export function isVercelCronRequest(request) {
  const userAgent = request.headers.get('user-agent') ?? '';
  return userAgent.includes('vercel-cron/1.0');
}

export function authorizePipelineRunRequest(request, cronSecret) {
  const isCronRequest = isVercelCronRequest(request);
  const authHeader = getAuthorizationHeader(request);

  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}`) {
      return {
        ok: true,
        authMode: 'cron-secret',
        isCronRequest,
      };
    }

    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
      authMode: 'rejected',
      isCronRequest,
    };
  }

  if (isCronRequest) {
    return {
      ok: true,
      authMode: 'vercel-cron-user-agent',
      isCronRequest,
      warning: 'CRON_SECRET is not configured; allowing the Vercel cron user agent fallback.',
    };
  }

  return {
    ok: false,
    status: 503,
    error: 'CRON_SECRET is not configured',
    authMode: 'rejected',
    isCronRequest,
  };
}

export async function readPipelineRunInput(request) {
  if (request.method !== 'POST') {
    return {
      lookbackDays: 7,
      forceReclassify: false,
    };
  }

  const body = await request.json().catch(() => ({}));

  return {
    lookbackDays: Number(body.lookbackDays ?? 7),
    forceReclassify: Boolean(body.forceReclassify ?? false),
  };
}
