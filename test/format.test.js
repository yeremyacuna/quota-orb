'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { colorFor, formatReset, clampPct, toEpochSeconds } = require('../src/lib/format');

test('colorFor thresholds (remaining %)', () => {
  assert.strictEqual(colorFor(100), '#34d399');
  assert.strictEqual(colorFor(40.5), '#34d399');
  assert.strictEqual(colorFor(40), '#fbbf24');
  assert.strictEqual(colorFor(15), '#fbbf24');
  assert.strictEqual(colorFor(14.9), '#f87171');
  assert.strictEqual(colorFor(0), '#f87171');
});

test('formatReset', () => {
  const now = Date.UTC(2026, 0, 1);
  const at = (ms) => (now + ms) / 1000;
  const H = 3600e3, D = 24 * H;
  assert.strictEqual(formatReset(at(5 * D + 9 * H + 30e3), now), '5 d 9 h');
  assert.strictEqual(formatReset(at(9 * H + 12 * 60e3 + 5e3), now), '9 h 12 min');
  assert.strictEqual(formatReset(at(42 * 60e3 + 5e3), now), '42 min');
  assert.strictEqual(formatReset(at(-1000), now), '—');
  assert.strictEqual(formatReset(null, now), '—');
});

test('clampPct / toEpochSeconds', () => {
  assert.strictEqual(clampPct(120), 100);
  assert.strictEqual(clampPct(-5), 0);
  assert.strictEqual(clampPct('abc'), null);
  assert.strictEqual(toEpochSeconds(1_800_000_000), 1_800_000_000);
  assert.strictEqual(toEpochSeconds(1_800_000_000_000), 1_800_000_000);
  assert.strictEqual(toEpochSeconds('2026-01-01T00:00:00Z'), Date.UTC(2026, 0, 1) / 1000);
});
