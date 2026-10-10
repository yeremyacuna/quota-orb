'use strict';
// Claude: GET https://api.anthropic.com/api/oauth/usage  (UNDOCUMENTED endpoint — may change).
// The token is read from the Claude Code credentials, only held in memory, and NEVER logged.
// Refresh is delegated to the official CLI: we never implement OAuth refresh nor write the credentials file.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, exec } = require('child_process');
const { clampPct, toEpochSeconds } = require('./lib/format');

const CACHE_MS = 3 * 60 * 1000;
const REFRESH_COOLDOWN_MS = 10 * 60 * 1000;
const REFRESH_MARGIN_MS = 15 * 60 * 1000;

let cache = null;          // { at, value }
let lastRefreshAt = 0;
let refreshing = null;

function usageUrl() {
  const o = process.env.QUOTA_ORB_CLAUDE_URL; // dev/test only, loopback only
  if (o && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(o)) return o;
  return 'https://api.anthropic.com/api/oauth/usage';
}
/** Is `percent` the USED share (default) or the REMAINING one? Unverified → configurable. */
function percentMode() {
  return process.env.QUOTA_ORB_CLAUDE_PERCENT === 'remaining' ? 'remaining' : 'used';
}

function credentialsPath() {
  return path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), '.credentials.json');
}

function readFromKeychain() {
  return new Promise((resolve) => {
    execFile('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'],
      { timeout: 5000 }, (err, stdout) => {
        if (err) return resolve(null);
        try { resolve(JSON.parse(stdout)?.claudeAiOauth ?? null); } catch { resolve(null); }
      });
  });
}

async function readOAuth() {
  if (process.platform === 'darwin' && !process.env.CLAUDE_CONFIG_DIR) {
    const k = await readFromKeychain();
    if (k) return k;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(credentialsPath(), 'utf8'));
    return raw?.claudeAiOauth ?? null;
  } catch { return null; }
}

/** Runs the CLI once so it renews the token itself (costs a few Haiku tokens). */
function refreshViaCli() {
  if (refreshing) return refreshing;
  lastRefreshAt = Date.now();
  refreshing = new Promise((resolve) => {
    const done = () => { refreshing = null; resolve(); };
    const mcp = '{"mcpServers":{}}';
    if (process.platform === 'win32') {
      exec(`claude -p "ok" --model haiku --strict-mcp-config --mcp-config "{\\"mcpServers\\":{}}"`,
        { timeout: 90000, windowsHide: true }, done);
    } else {
      execFile('claude', ['-p', 'ok', '--model', 'haiku', '--strict-mcp-config', '--mcp-config', mcp],
        { timeout: 90000 }, done);
    }
  });
  return refreshing;
}

function parseWeekly(json) {
  const limits = Array.isArray(json?.limits) ? json.limits : [];
  const w = limits.find((l) => l?.kind === 'weekly_all');
  if (!w) return { status: 'noweekly' };
  const pct = clampPct(w.percent ?? w.utilization ?? w.used_percent);
  if (pct == null) return { status: 'noweekly' };
  const remaining = percentMode() === 'remaining' ? pct : 100 - pct;
  const resetsAt = toEpochSeconds(w.resets_at);
  if (resetsAt && resetsAt * 1000 <= Date.now()) return { status: 'ok', remaining: 100, resetsAt: null };
  return { status: 'ok', remaining, resetsAt };
}

async function fetchUsage(token) {
  const res = await fetch(usageUrl(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'anthropic-beta': 'oauth-2025-04-20',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 401 || res.status === 403) return { status: 'expired' };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseWeekly(await res.json());
}

async function getClaudeUsage() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  let oauth = await readOAuth();
  if (!oauth?.accessToken) {
    return { status: 'noauth', hint: 'Ejecuta una vez `claude auth login` en el CLI.' };
  }

  const expiring = oauth.expiresAt && oauth.expiresAt - Date.now() < REFRESH_MARGIN_MS;
  if (expiring && Date.now() - lastRefreshAt > REFRESH_COOLDOWN_MS) {
    await refreshViaCli();
    oauth = (await readOAuth()) ?? oauth;
  }

  try {
    let value = await fetchUsage(oauth.accessToken);
    if (value.status === 'expired' && Date.now() - lastRefreshAt > REFRESH_COOLDOWN_MS) {
      await refreshViaCli();
      const again = await readOAuth();
      if (again?.accessToken) value = await fetchUsage(again.accessToken);
    }
    if (value.status === 'ok') cache = { at: Date.now(), value };
    if (value.status === 'expired') value.hint = 'Token vencido: abre el CLI de Claude o corre `claude auth login`.';
    return value;
  } catch (e) {
    // Never include headers/token in the message.
    const stale = cache?.value;
    return stale ? { ...stale, stale: true } : { status: 'error', hint: `No se pudo consultar Anthropic (${e.name || 'error'}).` };
  }
}

function _resetForTests() { cache = null; lastRefreshAt = 0; }

module.exports = { getClaudeUsage, parseWeekly, _resetForTests };
