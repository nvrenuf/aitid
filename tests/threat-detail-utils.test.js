import test from 'node:test';
import assert from 'node:assert/strict';

import { buildThreatDetailContext } from '../src/lib/threat-detail-utils.js';

const threat = {
  title: 'Prompt injection via transcript',
  description: 'Meeting transcript prompt injection.',
  severity: 'high',
  status: 'investigating',
  models: ['microsoft-copilot-m365'],
  vectors: ['api'],
  ttps: [{ id: 'AML.T0051', name: 'LLM Prompt Injection', url: 'https://atlas.mitre.org/techniques/AML.T0051' }],
  iocs: [],
  cve: 'CVE-2026-99999',
  source: 'Tenable',
  sourceUrl: '',
  affectedVersions: '',
  patchVersion: '',
  mitigations: ['Reduce permissions'],
  score: {
    cvss: 7.0,
    atlasBonus: 0.5,
    blended: 7.5,
    rationale: 'Contextual rationale.',
  },
};

test('buildThreatDetailContext keeps transparency grounded in present fields', () => {
  const context = buildThreatDetailContext(threat);

  assert.equal(context.sourceReferences[0].detail, 'Tenable');
  assert.match(context.scoreContext[0].detail, /CVSS 7.0 \+ ATLAS bonus 0.5 = blended 7.5/);
  assert.ok(context.limitations.some((item) => item.includes('No IOCs')));
  assert.match(context.confidenceFraming, /does not include a source URL/);
});
