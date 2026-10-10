'use strict';
// Codex: no network, no token. Every reply writes a line with "rate_limits"
// into ~/.codex/sessions/YYYY/MM/DD/*.jsonl — we only read the tail of the newest files.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { clampPct } = require('./lib/format');

const WEEK_MINUTES = 10080; // 300 = 5-hour window
const TAIL_BYTES = 512 * 1024;
const MAX_FILES = 24;

function codexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}
function listDesc(dir) {
  try { return fs.readdirSync(dir).sort().reverse(); } catch { return []; }
}
function mtime(p) {
  try { return fs.statSync(p).mtimeMs; } catch { return 0; }
}

function recentSessionFiles(max = MAX_FILES) {
  const root = path.join(codexHome(), 'sessions');
  const out = [];
  for (const y of listDesc(root)) {
    if (!/^\d{4}$/.test(y)) continue;
    for (const m of listDesc(path.join(root, y))) {
      for (const d of listDesc(path.join(root, y, m))) {
        const dir = path.join(root, y, m, d);
        const files = listDesc(dir)
          .filter((f) => f.endsWith('.jsonl'))
          .map((f) => ({ p: path.join(dir, f), t: mtime(path.join(dir, f)) }))
          .sort((a, b) => b.t - a.t);
        for (const f of files) {
          out.push(f.p);
        }
      }
    }
  }
  // An older conversation can be resumed today; creation date is not recency.
  return out.sort((a, b) => mtime(b) - mtime(a)).slice(0, max);
}

function readTail(file, bytes = TAIL_BYTES) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - bytes);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    let text = buf.toString('utf8');
    if (start > 0) text = text.includes('\n') ? text.slice(text.indexOf('\n') + 1) : ''; // drop partial first line
    return text;
  } catch { return ''; } finally { if (fd !== undefined) try { fs.closeSync(fd); } catch {} }
}

/** Last "rate_limits" object found at the end of a JSONL text, or null. */
function lastRateLimits(text) {
  return lastRateLimitEvent(text)?.rateLimits ?? null;
}

/** Last limits event plus its own timestamp; file mtimes are unreliable across resumed chats. */
function lastRateLimitEvent(text) {
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.includes('"rate_limits"')) continue;
    try {
      const obj = JSON.parse(line);
      const rl = obj?.payload?.rate_limits ?? obj?.rate_limits;
      if (rl && typeof rl === 'object') {
        const timestampMs = Date.parse(obj?.timestamp ?? obj?.payload?.timestamp ?? '');
        return { rateLimits: rl, timestampMs: Number.isFinite(timestampMs) ? timestampMs : null };
      }
    } catch { /* partial or foreign line */ }
  }
  return null;
}

/** Picks the weekly window by window_minutes (not by the primary/secondary name). */
function weeklyFrom(rl, nowMs = Date.now()) {
  const w = [rl?.primary, rl?.secondary].find((x) => x && Number(x.window_minutes) === WEEK_MINUTES);
  if (!w) return { status: 'noweekly' };
  const used = clampPct(w.used_percent);
  if (used == null) return { status: 'noweekly' };
  const resetsAt = Number(w.resets_at) || null;
  if (resetsAt && resetsAt * 1000 <= nowMs) {
    return { status: 'ok', remaining: 100, resetsAt: null }; // window already reset
  }
  return { status: 'ok', remaining: 100 - used, resetsAt };
}

function getCodexUsage(nowMs = Date.now()) {
  const files = recentSessionFiles();
  if (!files.length) return { status: 'nodata', hint: 'Sin sesiones de Codex todavía.' };
  let newest = null;
  for (const file of files) {
    const event = lastRateLimitEvent(readTail(file));
    if (!event || weeklyFrom(event.rateLimits, nowMs).status !== 'ok') continue;
    const observedAt = event.timestampMs ?? mtime(file);
    if (!newest || observedAt > newest.observedAt) newest = { ...event, observedAt };
  }
  if (newest) return weeklyFrom(newest.rateLimits, nowMs);
  return { status: 'nodata', hint: 'Aún no hay datos de límites en las sesiones recientes.' };
}

module.exports = { getCodexUsage, lastRateLimits, lastRateLimitEvent, weeklyFrom, WEEK_MINUTES };
