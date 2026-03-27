import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatEasternDate,
  formatEasternRefreshTimestamp,
  formatEasternTime,
  formatEasternTimestamp,
} from '../src/lib/time.js';

test('formatEasternTime uses EST during standard time', () => {
  assert.equal(
    formatEasternTime('2026-01-15T15:05:00Z'),
    '10:05 AM EST',
  );
});

test('formatEasternTimestamp uses EDT during daylight time', () => {
  assert.equal(
    formatEasternTimestamp('2026-07-15T14:05:00Z'),
    'Jul 15, 10:05 AM EDT',
  );
});

test('formatEasternDate keeps date-only rendering pinned to Eastern Time', () => {
  assert.equal(
    formatEasternDate('2026-07-15T02:30:00Z'),
    'Jul 14, 2026',
  );
});

test('formatEasternRefreshTimestamp matches the canonical header shape', () => {
  assert.equal(
    formatEasternRefreshTimestamp('2026-03-27T04:15:00Z'),
    'Mar 27, 12:15 AM EDT',
  );
});

test('formatEasternRefreshTimestamp falls back to unavailable when no real timestamp exists', () => {
  assert.equal(formatEasternRefreshTimestamp(undefined), 'unavailable');
  assert.equal(formatEasternRefreshTimestamp('not-a-date'), 'unavailable');
});
