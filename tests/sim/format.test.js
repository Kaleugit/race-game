// CA-006 unit part (EP-006-03): signed player − bot delta with 2 decimals, and formatTime.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDelta, formatTime } from '../../src/ui/format.js';

test('formatDelta: player slower -> plus sign', () => {
  assert.equal(formatDelta(10, 8.66), '+1.34s');
});

test('formatDelta: player faster -> minus sign', () => {
  assert.equal(formatDelta(8, 8.8), '-0.80s');
});

test('formatDelta: tie -> +0.00s', () => {
  assert.equal(formatDelta(5, 5), '+0.00s');
});

test('formatDelta: tiny negative rounds to +0.00s (never -0.00s)', () => {
  assert.equal(formatDelta(5, 5.001), '+0.00s');
});

test('formatDelta: always matches the CA-006 pattern', () => {
  for (const [p, b] of [[73.7, 79.42], [80.53, 12.1], [0.004, 0], [123.456, 99.999]]) {
    assert.match(formatDelta(p, b), /^[+-]\d+\.\d{2}s$/);
  }
});

test('formatDelta: non-finite input -> dash', () => {
  assert.equal(formatDelta(5, null), '—');
});

test('formatTime: 2 decimals with s suffix', () => {
  assert.equal(formatTime(63.4231), '63.42s');
  assert.equal(formatTime(5), '5.00s');
  assert.equal(formatTime(null), '—');
});
