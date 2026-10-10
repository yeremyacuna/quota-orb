'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseWeekly } = require('../src/claude');

test('parseWeekly picks kind=weekly_all and converts used → remaining', () => {
  const future = new Date(Date.now() + 2 * 86400e3).toISOString();
  const r = parseWeekly({ limits: [{ kind: 'five_hour', percent: 90 }, { kind: 'weekly_all', percent: 21, resets_at: future }] });
  assert.strictEqual(r.status, 'ok');
  assert.strictEqual(r.remaining, 79);
  assert.ok(r.resetsAt > Date.now() / 1000);
});

test('parseWeekly tolerates missing data', () => {
  assert.strictEqual(parseWeekly({}).status, 'noweekly');
  assert.strictEqual(parseWeekly({ limits: [{ kind: 'weekly_all' }] }).status, 'noweekly');
});

test('percent mode can be flipped to "remaining"', () => {
  process.env.QUOTA_ORB_CLAUDE_PERCENT = 'remaining';
  assert.strictEqual(parseWeekly({ limits: [{ kind: 'weekly_all', percent: 21 }] }).remaining, 21);
  delete process.env.QUOTA_ORB_CLAUDE_PERCENT;
});
