'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { lastRateLimits, weeklyFrom, getCodexUsage } = require('../src/codex');

const line = (rl) => JSON.stringify({ type: 'event_msg', payload: { type: 'token_count', rate_limits: rl } });
const NOW = 1_800_000_000_000;

test('lastRateLimits takes the LAST line and ignores junk', () => {
  const text = [line({ primary: { used_percent: 1 } }), 'not json "rate_limits"', line({ primary: { used_percent: 9 } }), '{"x":1}'].join('\n');
  assert.strictEqual(lastRateLimits(text).primary.used_percent, 9);
});

test('weekly window is found by window_minutes, whichever slot holds it', () => {
  const rl = { primary: { used_percent: 30, window_minutes: 300, resets_at: NOW / 1000 + 100 },
               secondary: { used_percent: 25, window_minutes: 10080, resets_at: NOW / 1000 + 5 * 86400 } };
  assert.deepStrictEqual(weeklyFrom(rl, NOW), { status: 'ok', remaining: 75, resetsAt: NOW / 1000 + 5 * 86400 });
  const swapped = { primary: rl.secondary, secondary: rl.primary };
  assert.strictEqual(weeklyFrom(swapped, NOW).remaining, 75);
});

test('resets_at in the past → 100 %', () => {
  const rl = { secondary: { used_percent: 99, window_minutes: 10080, resets_at: NOW / 1000 - 10 } };
  assert.deepStrictEqual(weeklyFrom(rl, NOW), { status: 'ok', remaining: 100, resetsAt: null });
});

test('no weekly window → noweekly', () => {
  assert.strictEqual(weeklyFrom({ primary: { used_percent: 1, window_minutes: 300 } }, NOW).status, 'noweekly');
});

test('getCodexUsage reads the newest session file under CODEX_HOME', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-'));
  const dir = path.join(home, 'sessions', '2026', '10', '09');
  fs.mkdirSync(dir, { recursive: true });
  const future = Math.floor(Date.now() / 1000) + 3 * 86400;
  fs.writeFileSync(path.join(dir, 'a.jsonl'), line({ secondary: { used_percent: 37, window_minutes: 10080, resets_at: future } }) + '\n');
  process.env.CODEX_HOME = home;
  const r = getCodexUsage();
  assert.strictEqual(r.status, 'ok');
  assert.strictEqual(r.remaining, 63);
  delete process.env.CODEX_HOME;
});
