'use strict';
// Undocumented endpoint. Keep all response compatibility handling here.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { clampPct, toEpochSeconds } = require('./lib/format');
const CACHE_MS = 180000, COOLDOWN = 600000;
let cache, nextAt = 0, lastRefresh = 0, pending, failures = 0, lastHint;

async function readOAuth() {
  try {
    let raw;
    if (process.platform === 'darwin') {
      raw = await new Promise(resolve => execFile('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { timeout: 5000 }, (err, out) => resolve(err ? '{}' : out)));
    } else {
      raw = fs.readFileSync(path.join(os.homedir(), '.claude', '.credentials.json'), 'utf8');
    }
    return JSON.parse(raw)?.claudeAiOauth ?? null;
  } catch { return null; }
}
function hint(value) {
  if (value.hint && value.hint !== lastHint) console.warn('Claude: ' + value.hint);
  lastHint = value.hint;
  return value;
}
async function refreshViaCli() {
  if (process.env.QUOTA_ORB_NO_REFRESH === '1' || Date.now() - lastRefresh < COOLDOWN) return;
  lastRefresh = Date.now();
  const stateDir = process.env.QUOTA_ORB_STATE_DIR || path.join(__dirname, '..', '.local');
  fs.mkdirSync(stateDir, { recursive: true });
  // A file avoids Windows shim quoting corrupting the JSON argument.
  const mcpFile = path.join(stateDir, 'empty-mcp.json');
  fs.writeFileSync(mcpFile, '{"mcpServers":{}}');
  // Only the official CLI refreshes credentials. No output or errors may expose secrets.
  // On Windows PowerShell resolves either the npm shim or the native executable.
  const args = ['-p', 'ok', '--model', 'haiku', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}'];
  await new Promise(resolve => {
    const command = process.platform === 'win32' ? 'powershell.exe' : 'claude';
    const argv = process.platform === 'win32'
      ? ['-NoProfile', '-NonInteractive', '-Command', `& claude -p "ok" --model haiku --strict-mcp-config --mcp-config '${mcpFile.replace(/'/g, "''")}'`] : args;
    execFile(command, argv, { timeout: 90000, windowsHide: true, maxBuffer: 65536, cwd: stateDir }, () => resolve());
  });
}
function parseWeekly(json, now = Date.now()) {
  const legacy = Array.isArray(json?.limits) && json.limits.find(x => x?.kind === 'weekly_all');
  const w = legacy || json?.seven_day;
  if (!w) return { status: 'noweekly' };
  // seven_day.utilization is USED percent (0–100). Legacy percent is assumed used;
  // the optional override applies only to legacy payloads, never utilization.
  const pct = clampPct(legacy ? w.percent ?? w.utilization ?? w.used_percent : w.utilization);
  if (pct == null) return { status: 'noweekly' };
  const remaining = legacy && process.env.QUOTA_ORB_CLAUDE_PERCENT === 'remaining' ? pct : 100 - pct;
  const resetsAt = toEpochSeconds(w.resets_at);
  return resetsAt && resetsAt * 1000 <= now ? { status: 'ok', remaining: 100, resetsAt: null } : { status: 'ok', remaining, resetsAt };
}
async function query() {
  let oauth = await readOAuth();
  if (typeof oauth?.accessToken !== 'string' || !oauth.accessToken) {
    cache = null;
    return hint({ status: 'noauth', hint: 'Ejecuta claude auth login en el CLI.' });
  }
  const expiry = toEpochSeconds(oauth.expiresAt);
  if (expiry && expiry * 1000 - Date.now() < 900000) {
    await refreshViaCli();
    oauth = await readOAuth();
    if (!oauth?.accessToken) return hint({ status: 'noauth', hint: 'Ejecuta claude auth login en el CLI.' });
  }
  try {
    const res = await fetch('https://api.anthropic.com/api/oauth/usage', {
      headers: { Authorization: `Bearer ${oauth.accessToken}`, 'anthropic-beta': 'oauth-2025-04-20', Accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(10000)
    });
    if (res.status === 401 || res.status === 403) {
      nextAt = Date.now() + COOLDOWN;
      cache = null;
      return hint({ status: 'noauth', hint: 'Sesión vencida: ejecuta claude auth login.' });
    }
    if (!res.ok) {
      const seconds = Number(res.headers.get('retry-after'));
      if (Number.isFinite(seconds) && seconds > 0) nextAt = Date.now() + Math.min(seconds * 1000, 3600000);
      throw new Error('usage unavailable');
    }
    const value = parseWeekly(await res.json());
    failures = 0;
    nextAt = Date.now() + CACHE_MS;
    cache = value;
    return value;
  } catch {
    failures++;
    nextAt = Math.max(nextAt, Date.now() + Math.min(CACHE_MS * 2 ** Math.min(failures - 1, 4), 3600000));
    return hint(cache?.status === 'ok' ? { ...cache, stale: true, hint: 'Sin conexión; último dato disponible.' } : { status: 'error', hint: 'No se pudo consultar Anthropic; se reintentará automáticamente.' });
  }
}
let lastResult;
function getClaudeUsage() {
  if (pending) return pending;
  if (lastResult && Date.now() < nextAt) return Promise.resolve(lastResult);
  pending = query().then(value => { lastResult = value; return value; }).finally(() => { pending = null; });
  return pending;
}
function _resetForTests() { cache = null; nextAt = 0; lastRefresh = 0; failures = 0; lastResult = null; }
module.exports = { getClaudeUsage, parseWeekly, _resetForTests };
