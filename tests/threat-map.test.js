import test from 'node:test';
import assert from 'node:assert/strict';

import { aggregateThreatMapRegions, buildThreatMapDataset, THREAT_MAP_MEANING } from '../src/lib/threat-map-core.js';

const threats = [
  {
    id: 't-critical',
    title: 'Critical regional threat',
    severity: 'critical',
    status: 'active',
    score: { blended: 9.5 },
    vectors: ['api', 'npm'],
    models: ['openai-gpt4o', 'multi-model'],
    publishedAt: '2026-03-26T00:00:00.000Z',
  },
  {
    id: 't-high',
    title: 'High regional threat',
    severity: 'high',
    status: 'active',
    score: { blended: 8.2 },
    vectors: ['api'],
    models: ['openai-gpt4o'],
    publishedAt: '2026-03-25T00:00:00.000Z',
  },
  {
    id: 't-unmapped',
    title: 'Unmapped threat',
    severity: 'medium',
    status: 'investigating',
    score: { blended: 6.2 },
    vectors: ['mcp-server'],
    models: ['anthropic-claude'],
    publishedAt: '2026-03-24T00:00:00.000Z',
  },
];

const observations = [
  {
    id: 'obs-1',
    threatId: 't-critical',
    scope: 'observed-infrastructure',
    regionKey: 'north-america',
    regionName: 'North America',
    precision: 'macro-region',
    sourceQuality: 'analyst-curated',
    summary: 'Coarse infrastructure region',
    anchor: { lat: 39.8, lng: -98.5, isApproximate: true, label: 'North America anchor' },
  },
  {
    id: 'obs-2',
    threatId: 't-high',
    scope: 'observed-exposure',
    regionKey: 'north-america',
    regionName: 'North America',
    precision: 'macro-region',
    sourceQuality: 'analyst-curated',
    summary: 'Coarse exposure region',
    anchor: { lat: 39.8, lng: -98.5, isApproximate: true, label: 'North America anchor' },
  },
];

test('buildThreatMapDataset keeps map meaning and unmapped coverage explicit', () => {
  const dataset = buildThreatMapDataset(threats, observations);

  assert.equal(dataset.meaning, THREAT_MAP_MEANING);
  assert.equal(dataset.coverage.mappedThreatCount, 2);
  assert.equal(dataset.coverage.unmappedThreatCount, 1);
  assert.deepEqual(dataset.unmappedThreatIds, ['t-unmapped']);
});

test('aggregateThreatMapRegions groups regional detail and orders top threats by severity', () => {
  const dataset = buildThreatMapDataset(threats, observations);
  const regions = aggregateThreatMapRegions(dataset.points);

  assert.equal(regions.length, 1);
  assert.equal(regions[0].regionKey, 'north-america');
  assert.equal(regions[0].threatCount, 2);
  assert.deepEqual(regions[0].topThreats.map((threat) => threat.id), ['t-critical', 't-high']);
  assert.deepEqual(regions[0].dominantVectors, ['api', 'npm']);
  assert.deepEqual(regions[0].affectedModels, ['openai-gpt4o', 'multi-model']);
});
