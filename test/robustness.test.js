'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWeekly } = require('../src/claude');
const { clampPct } = require('../src/lib/format');
const { startServer } = require('../src/server');
test('unknown values cannot become 100 percent remaining', () => {
  for (const value of [null, undefined, '', ' ', false, {}, Infinity]) assert.equal(clampPct(value), null);
});
test('Claude seven_day and past reset', () => {
  assert.equal(parseWeekly({ seven_day: { utilization: 72, resets_at: '2099-01-01T00:00:00Z' } }).remaining, 28);
  assert.equal(parseWeekly({ seven_day: { utilization: null } }).status, 'noweekly');
  assert.equal(parseWeekly({ seven_day: { utilization: 72, resets_at: '2020-01-01T00:00:00Z' } }).remaining, 100);
});
test('HTTP server rejects foreign hosts, origins and mutations', async () => {
  const { server, port } = await startServer();
  try {
    const base = `http://127.0.0.1:${port}`;
    const foreignHostStatus = await new Promise((resolve, reject) => {
      require('node:http').get(base, { headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject);
    });
    assert.equal(foreignHostStatus, 403);
    assert.equal((await fetch(base + '/api/usage', { headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    const res = await fetch(base);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
    assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(res.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
