import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDrawerSubtitle,
  filterThreats,
  MODEL_FILTERS,
  shortModel,
  sortThreats,
} from '../src/lib/dashboard-utils.js';

const threats = [
  {
    id: 'critical-openai',
    severity: 'critical',
    status: 'active',
    type: 'jailbreak',
    models: ['openai-gpt4o'],
    vectors: ['api'],
    score: { blended: 9.2 },
  },
  {
    id: 'high-copilot',
    severity: 'high',
    status: 'investigating',
    type: 'supply-chain',
    models: ['microsoft-copilot-github'],
    vectors: ['npm'],
    score: { blended: 8.1 },
  },
  {
    id: 'medium-oss',
    severity: 'medium',
    status: 'patched',
    type: 'model-poisoning',
    models: ['huggingface-oss'],
    vectors: ['huggingface'],
    score: { blended: 6.7 },
  },
];

test('sortThreats prioritizes severity before blended score', () => {
  const sorted = sortThreats([
    threats[2],
    threats[1],
    { ...threats[0], id: 'critical-lower-score', score: { blended: 8.4 } },
    threats[0],
  ]);

  assert.deepEqual(sorted.map((threat) => threat.id), [
    'critical-openai',
    'critical-lower-score',
    'high-copilot',
    'medium-oss',
  ]);
});

test('filterThreats supports severity and vector filters', () => {
  assert.deepEqual(
    filterThreats(threats, 'critical').map((threat) => threat.id),
    ['critical-openai'],
  );
  assert.deepEqual(
    filterThreats(threats, 'npm').map((threat) => threat.id),
    ['high-copilot'],
  );
});

test('model filters classify the expected dashboard feeds', () => {
  assert.equal(MODEL_FILTERS.openai(threats[0]), true);
  assert.equal(MODEL_FILTERS.copilot(threats[1]), true);
  assert.equal(MODEL_FILTERS.oss(threats[2]), true);
  assert.equal(MODEL_FILTERS.claude(threats[0]), false);
});

test('helper formatting keeps dashboard labels stable', () => {
  assert.equal(shortModel('microsoft-copilot-github'), 'copilot-github');
  assert.equal(
    buildDrawerSubtitle(threats[0]),
    'CRITICAL · active · jailbreak',
  );
});
