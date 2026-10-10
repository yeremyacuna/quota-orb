'use strict';
// Dependency-free HTTP server bound to 127.0.0.1: serves the UI and /api/usage.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { getCodexUsage } = require('./codex');
const { getClaudeUsage } = require('./claude');

const UI_DIR = path.join(__dirname, 'ui');
const FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
};
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; media-src 'none'; manifest-src 'none'";

async function getAll() {
  if (process.env.QUOTA_ORB_DEMO === '1') return { codex: { status: 'ok', remaining: 63, resetsAt: Date.now() / 1000 + 5 * 86400 + 9 * 3600 + 5 }, claude: { status: 'ok', remaining: 28, resetsAt: Date.now() / 1000 + 3 * 86400 + 3600 + 5 } };
  const [claude] = await Promise.all([getClaudeUsage()]);
  const codex = getCodexUsage();
  return { codex, claude, updatedAt: Date.now() };
}

function startServer({ port = 0, onUpdate } = {}) {
  const server = http.createServer(async (req, res) => {
    // Anti DNS-rebinding: only accept loopback Host headers.
    const host = (req.headers.host || '').split(':')[0];
    if (host !== '127.0.0.1' && host !== 'localhost') { res.writeHead(403); return res.end(); }
    if ((req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) || req.headers['sec-fetch-site'] === 'cross-site') { res.writeHead(403); return res.end(); }
    const url = (req.url || '/').split('?')[0];
    const headers = {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': CSP,
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    };

    if (req.method !== 'GET') { res.writeHead(405, headers); return res.end(); }

    if (url === '/api/usage') {
      try {
        const data = await getAll();
        if (onUpdate) try { onUpdate(data); } catch {}
        res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(data));
      } catch {
        res.writeHead(500, headers);
        return res.end('{"error":"internal"}');
      }
    }
    const f = FILES[url];
    if (!f) { res.writeHead(404, headers); return res.end(); }
    try {
      res.writeHead(200, { ...headers, 'Content-Type': f[1] });
      res.end(fs.readFileSync(path.join(UI_DIR, f[0])));
    } catch { res.writeHead(500, headers); res.end(); }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

module.exports = { startServer, getAll };
