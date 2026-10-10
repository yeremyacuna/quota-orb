(() => {
  'use strict';
  const R = 27;
  const C = 2 * Math.PI * R;
  const REFRESH_MS = 60 * 1000;
  let last = null;

  const colorFor = (p) => (p == null ? '#9ca3af' : p > 40 ? '#34d399' : p >= 15 ? '#fbbf24' : '#f87171');

  function fmtReset(resetsAtSec) {
    if (resetsAtSec == null) return '—';
    const diff = resetsAtSec * 1000 - Date.now();
    if (!(diff > 0)) return '—';
    const t = Math.floor(diff / 60000);
    const d = Math.floor(t / 1440), h = Math.floor((t % 1440) / 60), m = t % 60;
    if (d >= 1) return d + ' d ' + h + ' h';
    if (h >= 1) return h + ' h ' + m + ' min';
    return Math.max(m, 1) + ' min';
  }

  function paint(id, u) {
    const el = document.getElementById(id);
    const arc = el.querySelector('.arc');
    const pct = el.querySelector('.pct');
    const time = el.querySelector('.time');
    arc.setAttribute('stroke-dasharray', String(C));
    el.title = u && u.hint ? u.hint : '';
    el.classList.toggle('stale', !!(u && u.stale));
    if (u && u.status === 'ok') {
      const p = Math.max(0, Math.min(100, u.remaining));
      arc.setAttribute('stroke', colorFor(p));
      arc.setAttribute('stroke-dashoffset', String(C * (1 - p / 100)));
      pct.textContent = Math.round(p) + '%';
      time.textContent = fmtReset(u.resetsAt);
    } else {
      arc.setAttribute('stroke-dashoffset', String(C)); // empty ring
      pct.textContent = '—';
      time.textContent = u && u.status === 'noauth' ? 'sin sesión' : 'sin datos';
    }
  }

  function render(data) {
    paint('codex', data.codex);
    paint('claude', data.claude);
    reportHeight();
  }

  function reportHeight() {
    const h = document.getElementById('card').offsetHeight;
    if (window.usageBridge) window.usageBridge.setHeight(h + 2);
  }

  async function refresh() {
    try {
      const res = await fetch('/api/uso', { cache: 'no-store' });
      last = await res.json();
      render(last);
    } catch {
      if (last) {
        document.getElementById('card').classList.add('stale');
        render(last);
      }
    }
  }

  refresh();
  setInterval(refresh, REFRESH_MS);
  setInterval(() => { if (last) render(last); }, 30 * 1000); // keep countdowns fresh between fetches
})();
