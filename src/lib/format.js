'use strict';

/** Clamp any value into the 0–100 range (NaN → null). */
function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

/** Colour by REMAINING percentage: green > 40, yellow 15–40, red < 15. */
function colorFor(remaining) {
  if (remaining == null) return '#9ca3af';
  if (remaining > 40) return '#34d399';
  if (remaining >= 15) return '#fbbf24';
  return '#f87171';
}

/** "5 d 9 h" · "9 h 12 min" · "42 min" · "—" when unknown or already past. */
function formatReset(resetsAtSec, nowMs = Date.now()) {
  if (resetsAtSec == null) return '—';
  const diff = resetsAtSec * 1000 - nowMs;
  if (!(diff > 0)) return '—';
  const totalMin = Math.floor(diff / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d >= 1) return `${d} d ${h} h`;
  if (h >= 1) return `${h} h ${m} min`;
  return `${Math.max(m, 1)} min`;
}

/** Accepts epoch seconds, epoch ms or an ISO string → epoch seconds (or null). */
function toEpochSeconds(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v > 1e12 ? Math.floor(v / 1000) : Math.floor(v);
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

module.exports = { clampPct, colorFor, formatReset, toEpochSeconds };
