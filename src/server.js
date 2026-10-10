'use strict';
// Dependency-free HTTP server bound to 127.0.0.1: serves the UI and /api/uso.
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
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'";

async function getAll() {
  const [claude] = await Promise.all([getClaudeUsage()]);
  const codex = getCodexUsage();
  return { codex, claude, updatedAt: Date.now() };
}

function startServer({ port = 0, onUpdate } = {}) {
  const server = http.createServer(async (req, res) => {
    // Anti DNS-rebinding: only accept loopback Host headers.
    const host = (req.headers.host || '').split(':')[0];
    if (host !== '127.0.0.1' && host !== 'localhost') { res.writeHead(403); return res.end(); }
    const url = (req.url || '/').split('?')[0];
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': CSP };

    if (req.method !== 'GET') { res.writeHead(405, headers); return res.end(); }

    if (url === '/api/uso') {
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
