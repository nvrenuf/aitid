// src/lib/siem.ts
// SIEM / SOAR integration layer — stub architecture, ready to wire post-deploy
// Supports: Microsoft Sentinel, Splunk HEC, Elastic, CrowdStrike, generic webhook
// Enable by setting SIEM_TYPE + SIEM_WEBHOOK_URL + SIEM_SECRET in env vars

import type { Threat } from './types.js';

const SIEM_TYPE    = process.env.SIEM_TYPE ?? '';
const WEBHOOK_URL  = process.env.SIEM_WEBHOOK_URL ?? '';
const SIEM_SECRET  = process.env.SIEM_SECRET ?? '';

// ── STIX 2.1 serializer ───────────────────────────────────────────────────
export function toStix(threat: Threat): object {
  return {
    type: 'bundle',
    id:   `bundle--${threat.id}`,
    spec_version: '2.1',
    objects: [
      {
        type:             'vulnerability',
        spec_version:     '2.1',
        id:               `vulnerability--${threat.id}`,
        created:          threat.publishedAt,
        modified:         threat.updatedAt,
        name:             threat.title,
        description:      threat.description,
        external_references: [
          threat.cve ? { source_name: 'cve', external_id: threat.cve } : null,
          threat.sourceUrl ? { source_name: threat.source, url: threat.sourceUrl } : null,
        ].filter(Boolean),
        labels:           [...threat.models, ...threat.vectors, threat.type],
        x_aitid_severity:  threat.severity,
        x_aitid_score:     threat.score.blended,
        x_aitid_atlas_ttps: threat.ttps.map(t => t.id),
        x_aitid_iocs:      threat.iocs,
        x_aitid_status:    threat.status,
        x_aitid_mitigations: threat.mitigations,
      },
    ],
  };
}

// ── Splunk HEC event ──────────────────────────────────────────────────────
function toSplunkHec(threat: Threat): object {
  return {
    time:       new Date(threat.publishedAt).getTime() / 1000,
    sourcetype: 'aitid:threat',
    source:     'aitid',
    index:      'ai_threats',
    event: {
      id:          threat.id,
      title:       threat.title,
      severity:    threat.severity,
      score:       threat.score.blended,
      cvss:        threat.score.cvss,
      status:      threat.status,
      type:        threat.type,
      models:      threat.models,
      vectors:     threat.vectors,
      atlas_ttps:  threat.ttps.map(t => t.id),
      cve:         threat.cve,
      source:      threat.source,
      description: threat.description,
    },
  };
}

// ── Microsoft Sentinel (Log Analytics) payload ────────────────────────────
function toSentinel(threat: Threat): object {
  return {
    ThreatId:        threat.id,
    ThreatTitle:     threat.title,
    Severity:        threat.severity,
    BlendedScore:    threat.score.blended,
    CvssScore:       threat.score.cvss,
    Status:          threat.status,
    ThreatType:      threat.type,
    Models:          threat.models.join(', '),
    Vectors:         threat.vectors.join(', '),
    AtlasTtps:       threat.ttps.map(t => t.id).join(', '),
    Cve:             threat.cve ?? '',
    Source:          threat.source,
    SourceUrl:       threat.sourceUrl ?? '',
    Description:     threat.description,
    Mitigations:     threat.mitigations.join(' | '),
    PublishedAt:     threat.publishedAt,
    TimeGenerated:   new Date().toISOString(),
  };
}

// ── Dispatch ──────────────────────────────────────────────────────────────
export async function dispatchToSiem(threat: Threat): Promise<{ sent: boolean; error?: string }> {
  if (!SIEM_TYPE || !WEBHOOK_URL) {
    return { sent: false, error: 'SIEM not configured' };
  }

  const sevFilter = (process.env.SIEM_MIN_SEVERITY ?? 'high');
  const sevOrder  = { critical:0, high:1, medium:2, low:3, info:4 };
  if (sevOrder[threat.severity] > sevOrder[sevFilter as keyof typeof sevOrder]) {
    return { sent: false, error: 'Below configured severity threshold' };
  }

  let payload: object;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  switch (SIEM_TYPE.toLowerCase()) {
    case 'splunk':
      payload = toSplunkHec(threat);
      headers['Authorization'] = `Splunk ${SIEM_SECRET}`;
      break;
    case 'sentinel':
      payload = toSentinel(threat);
      headers['Authorization'] = `SharedKey ${SIEM_SECRET}`;
      break;
    case 'elastic':
    case 'crowdstrike':
    case 'webhook':
    default:
      payload = toStix(threat);
      if (SIEM_SECRET) headers['Authorization'] = `Bearer ${SIEM_SECRET}`;
      break;
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers,
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(10_000),
    });
    return res.ok ? { sent: true } : { sent: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { sent: false, error: String(err) };
  }
}

// ── Bulk dispatch (for backfill) ──────────────────────────────────────────
export async function dispatchBulk(threats: Threat[]): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  for (const t of threats) {
    const result = await dispatchToSiem(t);
    result.sent ? sent++ : failed++;
    await new Promise(r => setTimeout(r, 100)); // rate limit
  }
  return { sent, failed };
}
