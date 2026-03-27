import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyThreatFilters,
  buildThreatSearchText,
  getThreatDetailHref,
  getThreatDetailSlug,
  sortThreatCollection,
  summarizeThreatResultSet,
} from '../src/lib/threats-utils.js';

const threats = [
  {
    id: 'alpha-critical',
    title: 'GhostClaw supply chain',
    description: 'Credential theft through a malicious package and AI agent file.',
    severity: 'critical',
    status: 'active',
    type: 'supply-chain',
    models: ['anthropic-claude', 'multi-model'],
    vectors: ['npm', 'skill-md'],
    ttps: [{ id: 'AML.T0053', name: 'Supply Chain Compromise', tactic: 'Initial Access' }],
    iocs: [{ type: 'domain', value: 'trackpipe.dev', context: 'c2' }],
    cve: undefined,
    source: 'Jamf',
    affectedVersions: '',
    patchVersion: '',
    publishedAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-25T00:00:00.000Z',
    mitigations: ['Block domain'],
    score: { blended: 9.4 },
  },
  {
    id: 'beta-high',
    title: 'Prompt injection via transcript',
    description: 'Meeting transcript prompt injection.',
    severity: 'high',
    status: 'investigating',
    type: 'prompt-injection',
    models: ['microsoft-copilot-m365'],
    vectors: ['api'],
    ttps: [{ id: 'AML.T0051', name: 'LLM Prompt Injection', tactic: 'Initial Access' }],
    iocs: [],
    cve: 'CVE-2026-99999',
    source: 'Tenable',
    affectedVersions: 'm365 < safe',
    patchVersion: 'm365 >= safe',
    publishedAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-26T00:00:00.000Z',
    mitigations: ['Reduce permissions'],
    score: { blended: 7.5 },
  },
];

test('buildThreatSearchText includes models, vectors, ttps, and iocs', () => {
  const haystack = buildThreatSearchText(threats[0]);

  assert.match(haystack, /trackpipe\.dev/);
  assert.match(haystack, /claude/);
  assert.match(haystack, /aml\.t0053/);
});

test('detail route helpers generate stable canonical paths', () => {
  assert.equal(getThreatDetailSlug(threats[0]), 'ghostclaw-supply-chain');
  assert.equal(getThreatDetailHref(threats[0]), '/threats/ghostclaw-supply-chain');
});

test('applyThreatFilters combines query and structured filters', () => {
  const filtered = applyThreatFilters(threats, {
    query: 'trackpipe',
    severity: 'critical',
    model: 'anthropic-claude',
    vector: 'skill-md',
    status: 'active',
  });

  assert.deepEqual(filtered.map((threat) => threat.id), ['alpha-critical']);
});

test('sortThreatCollection supports recency and title sorting', () => {
  assert.deepEqual(
    sortThreatCollection(threats, 'updatedAt').map((threat) => threat.id),
    ['beta-high', 'alpha-critical'],
  );
  assert.deepEqual(
    sortThreatCollection(threats, 'title').map((threat) => threat.id),
    ['alpha-critical', 'beta-high'],
  );
});

test('summarizeThreatResultSet returns operator-facing counts', () => {
  assert.deepEqual(summarizeThreatResultSet(threats), {
    total: 2,
    activeCount: 1,
    criticalCount: 1,
    uniqueModels: 2,
    newestPublishedAt: '2026-03-20T00:00:00.000Z',
  });
});
